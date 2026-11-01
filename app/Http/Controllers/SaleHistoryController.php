<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SalesItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;
use Inertia\Inertia;


class SaleHistoryController extends Controller
{
    /**
     * Display a listing of the sale history.
     *
     * @return \Inertia\Response
     */

    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    private function authorizeOwnerOnly()
    {
        if(! $this->user?->isOwner()) {
            abort(403, 'Hanya owner yang boleh melakukan aksi ini.');
        }
    }

    private const SIDE_PRODUCTS = [
        'kuah_creamy' => 'Kuah Creamy',
        'chili_oil' => 'Chili Oil',
        'mentai' => 'Mentai',
    ];

    // Item berbayar yang namanya cocok: produk biasa ("Mentai") atau addon ("[ADDON] Mentai").
    // Item gratis ("[GRATIS] ...") tidak dihitung sebagai "membeli".
    private function matchSideItem($query, string $name): void
    {
        $query->where('is_free', false)
            ->where(function ($q) use ($name) {
                $q->whereIn('product_name', [$name, "[ADDON] {$name}"])
                    ->orWhereHas('product', fn ($p) => $p->where('name', $name));
            });
    }

    private function sideCounts(Request $request): array
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $paymentMethod = $request->input('payment_method');
        $activeCabangId = $request->user()->activeCabangId();

        $counts = [];

        foreach (self::SIDE_PRODUCTS as $key => $name) {
            $counts[$key] = Sale::query()
                ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
                ->when($startDate, fn ($q) => $q->whereDate('created_at', '>=', $startDate))
                ->when($endDate, fn ($q) => $q->whereDate('created_at', '<=', $endDate))
                ->when($paymentMethod && $paymentMethod !== 'all', fn ($q) => $q->where('payment_method', $paymentMethod))
                ->whereHas('items', fn ($q) => $this->matchSideItem($q, $name))
                ->count();
        }

        return $counts;
    }

    private function baseSalesQuery(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $paymentMethod = $request->input('payment_method');
        $free = $request->input('free');
        $addon = $request->input('addon');
        $side = $request->input('side');
        $activeCabangId = $request->user()->activeCabangId();

        return Sale::with(['items.product.cabang', 'items.pack', 'user', 'member', 'cabang'])
            ->when($activeCabangId, function ($query) use ($activeCabangId) {
                $query->where('cabang_id', $activeCabangId);
            })
            ->when($startDate, function ($query) use ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            })
            ->when($paymentMethod && $paymentMethod !== 'all', function ($query) use ($paymentMethod) {
                $query->where('payment_method', $paymentMethod);
            })
            ->when($free === 'with', function ($query) {
                $query->whereHas('items', fn ($q) => $q->where('is_free', true));
            })
            ->when($addon === 'with', function ($query) {
                $query->whereHas('items', fn ($q) => $q->whereNotNull('addon_id'));
            })
            ->when($side && isset(self::SIDE_PRODUCTS[$side]), function ($query) use ($side) {
                $query->whereHas('items', fn ($q) => $this->matchSideItem($q, self::SIDE_PRODUCTS[$side]));
            })
            ->latest()
            ->latest('id');
    }

    /**
     * Satu baris = satu transaksi, berisi semua item di dalamnya.
     */
    private function transformSale(Sale $sale): array
    {
        return [
            'id' => $sale->id,
            'customer_name' => $sale->customer_name,
            'member' => $sale->member ? [
                'id' => $sale->member->id,
                'name' => $sale->member->name,
                'phone' => $sale->member->phone,
                'points' => $sale->member->points,
            ] : null,
            'total' => $sale->total,
            'cash_tendered' => $sale->cash_tendered,
            'change_amount' => $sale->change_amount,
            'payment_method' => $sale->payment_method ?? 'cash',
            'status' => $sale->status,
            'created_at' => $sale->created_at,
            'operator_name' => $sale->operator_name,
            'user' => [
                'id' => $sale->user->id,
                'name' => $sale->user->name,
            ],
            'cabang' => $sale->cabang?->name,
            'items' => $sale->items->map(fn ($item) => [
                'id' => $item->id,
                // product_name adalah snapshot saat transaksi (produk, paket, addon)
                'name' => $item->product_name ?? $item->product?->name ?? $item->pack?->name ?? '-',
                'is_pack' => (bool) $item->pack_id,
                'cabang' => $item->product?->cabang?->name,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
                'is_free' => (bool) $item->is_free,
            ])->values(),
        ];
    }

    private function combineSaleItems(Collection $sales): Collection
    {
        return $sales->flatMap(function ($sale) {
            $items = $sale->items;
            $paidItems = $items->where('is_free', false);
            $freeItems = $items->where('is_free', true);

            $combined = $paidItems->map(function ($paidItem) use ($freeItems, $paidItems, $sale) {
                $relatedFree = $freeItems->where('product_id', $paidItem->product_id);

                $isFirstPaid = $paidItems->first()->id === $paidItem->id;
                $orphanFree = $isFirstPaid ? $freeItems->where('product_id', null)->where('pack_id', null) : collect();

                $allRelatedFree = $relatedFree->merge($orphanFree);

                $freeProducts = $allRelatedFree->map(function ($freeItem) {
                    return [
                        'id' => $freeItem->id,
                        'name' => $freeItem->product?->name ?? $freeItem->product_name,
                        'quantity' => $freeItem->quantity,
                    ];
                })->values();

                return [
                    'id' => $paidItem->id,
                    'sale' => [
                        'id' => $sale->id,
                        'customer_name' => $sale->customer_name,
                        'member_id' => $sale->member_id,
                        'member' => $sale->member ? [
                            'id' => $sale->member->id,
                            'name' => $sale->member->name,
                            'phone' => $sale->member->phone,
                            'points' => $sale->member->points,
                        ] : null,
                        'total' => $sale->total,
                        'cash_tendered' => $sale->cash_tendered,
                        'change_amount' => $sale->change_amount,
                        'payment_method' => $sale->payment_method ?? 'cash',
                        'status' => $sale->status,
                        'created_at' => $sale->created_at,
                        'operator_name' => $sale->operator_name,
                        'user' => [
                            'id' => $sale->user->id,
                            'name' => $sale->user->name,
                        ],
                    ],
                    'product' => $paidItem->product,
                    'pack' => $paidItem->pack,
                    'quantity' => $paidItem->quantity,
                    'unit_price' => $paidItem->unit_price,
                    'subtotal' => $paidItem->subtotal,
                    'is_free' => false,
                    'free_items' => $freeProducts,
                ];
            })->values();

            if ($paidItems->isEmpty() && $freeItems->isNotEmpty()) {
                $combined = $combined->merge($freeItems->map(function ($freeItem) use ($sale) {
                    return [
                        'id' => $freeItem->id,
                        'sale' => [
                            'id' => $sale->id,
                            'customer_name' => $sale->customer_name,
                            'member_id' => $sale->member_id,
                            'member' => $sale->member ? [
                                'id' => $sale->member->id,
                                'name' => $sale->member->name,
                                'phone' => $sale->member->phone,
                                'points' => $sale->member->points,
                            ] : null,
                            'total' => $sale->total,
                            'cash_tendered' => $sale->cash_tendered,
                            'change_amount' => $sale->change_amount,
                            'payment_method' => $sale->payment_method ?? 'cash',
                            'status' => $sale->status,
                            'created_at' => $sale->created_at,
                            'operator_name' => $sale->operator_name,
                            'user' => [
                                'id' => $sale->user->id,
                                'name' => $sale->user->name,
                            ],
                        ],
                        'product' => $freeItem->product,
                        'pack' => null,
                        'quantity' => $freeItem->quantity,
                        'unit_price' => 0,
                        'subtotal' => 0,
                        'is_free' => true,
                        'free_items' => [],
                    ];
                })->values());
            }

            return $combined;
        })->values();
    }

    public function index(Request $request)
    {
        $startDate = $request->input('start_date', now()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $paymentMethod = $request->input('payment_method', 'all');
        $free = $request->input('free', 'all');
        $addon = $request->input('addon', 'all');
        $side = $request->input('side', 'all');
        $request->merge([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'payment_method' => $paymentMethod,
            'free' => $free,
            'addon' => $addon,
            'side' => $side,
        ]);

        // Paginasi per TRANSAKSI langsung di database (bukan per item)
        $sales = $this->baseSalesQuery($request)
            ->paginate(10)
            ->appends([
                'start_date' => $startDate,
                'end_date' => $endDate,
                'payment_method' => $paymentMethod,
                'free' => $free,
                'addon' => $addon,
                'side' => $side,
            ])
            ->through(fn (Sale $sale) => $this->transformSale($sale));

        return Inertia::render('history/index', [
            'sales' => $sales,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ],
            'sideCounts' => $this->sideCounts($request),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'payment_method' => $paymentMethod,
                'free' => $free,
                'addon' => $addon,
                'side' => $side,
            ],
        ]);
    }

    public function exportData(Request $request)
    {
        $this->authorizeOwnerOnly();

        $sales = $this->baseSalesQuery($request)->get();

        $saleItems = $this->combineSaleItems($sales);

        return response()->json($saleItems->values());
    }
}