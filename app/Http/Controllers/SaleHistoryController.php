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

    private function baseSalesQuery(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $paymentMethod = $request->input('payment_method');

        return Sale::with(['items.product.category', 'items.pack', 'user', 'member'])
            ->when($startDate, function ($query) use ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            })
            ->when($paymentMethod && $paymentMethod !== 'all', function ($query) use ($paymentMethod) {
                $query->where('payment_method', $paymentMethod);
            })
            ->latest();
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
        $this->authorizeOwnerOnly();

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $paymentMethod = $request->input('payment_method', 'all');
        $request->merge(['start_date' => $startDate, 'end_date' => $endDate, 'payment_method' => $paymentMethod]);

        $sales = $this->baseSalesQuery($request)->get();

        $saleItems = $this->combineSaleItems($sales);

        $perPage = 6;
        $currentPage = request()->get('page', 1);
        $total = $saleItems->count();
        $paginatedItems = $saleItems->forPage($currentPage, $perPage)->values();


        $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedItems,
            $total,
            $perPage,
            $currentPage,
            [
                'path' => request()->url(),
                'query' => array_merge(request()->query(), [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'payment_method' => $paymentMethod,
                ]),
            ]
        );

        return Inertia::render('history/index', [
            'saleItems' => $paginated,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ],
            'can' => [
                'create' => Auth::user()->can('create', Sale::class),
            ],
            // FIX: kirim balik filter yang aktif supaya frontend bisa isi ulang input tanggal
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'payment_method' => $paymentMethod,
            ],
        ]);
    }

    // FIX: endpoint baru khusus untuk Export Excel — tanpa pagination,
    // mengembalikan SEMUA baris dalam rentang tanggal terpilih sebagai JSON.
    public function exportData(Request $request)
    {
        $this->authorizeOwnerOnly();

        $sales = $this->baseSalesQuery($request)->get();

        $saleItems = $this->combineSaleItems($sales);

        return response()->json($saleItems->values());
    }
}