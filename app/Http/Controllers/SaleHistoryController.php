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

    // FIX: query dasar sales dipisah jadi method sendiri supaya bisa dipakai
    // ulang oleh index() (dengan pagination) dan exportData() (tanpa pagination),
    // tanpa duplikasi logic filter tanggal.
    private function baseSalesQuery(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        return Sale::with(['items.product.category', 'items.pack', 'user'])
            ->when($startDate, function ($query) use ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            })
            ->latest();
    }

    // FIX: logic penggabungan item gratis dengan item berbayar dipindah ke
    // method terpisah, dipakai bersama oleh index() dan exportData().
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

        // FIX: default rentang tanggal — kalau tidak ada query param, tampilkan bulan berjalan
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $request->merge(['start_date' => $startDate, 'end_date' => $endDate]);

        // Get all sales with their items, sudah difilter tanggal (no pagination on Sale level)
        $sales = $this->baseSalesQuery($request)->get();

        $saleItems = $this->combineSaleItems($sales);

        // Apply manual pagination to the combined items
        $perPage = 15;
        $currentPage = request()->get('page', 1);
        $total = $saleItems->count();
        $paginatedItems = $saleItems->forPage($currentPage, $perPage)->values();

        $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedItems,
            $total,
            $perPage,
            $currentPage,
            ['path' => request()->url(), 'query' => request()->query()]
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