<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SalesItem;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();

        if (! $this->user?->inRole(['owner', 'kasir'])) {
            abort(403, 'Akses ditolak.');
        }
    }
    
    public function index(): Response
    {
        $today = today();
        $activeCabangId = $this->user->activeCabangId();

        $todaySales = Sale::whereDate('created_at', $today)
            ->where('status', 'completed')
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->get();

        $paymentBreakdown = collect(['cash', 'qris', 'grab', 'gofood'])
            ->mapWithKeys(function ($method) use ($todaySales) {
                $sales = $todaySales->where('payment_method', $method);

                return [$method => [
                    'total' => (float) $sales->sum('total'),
                    'count' => $sales->count(),
                ]];
            });

        $topProduct = SalesItem::select(
            'product_name',
            DB::raw('SUM(quantity) as total_qty'),
            DB::raw('SUM(subtotal) as total_revenue')
        )
        ->whereHas('sale', fn ($q) => $q->whereDate('created_at', $today)
            ->where('status', 'completed')
            ->when($activeCabangId, fn ($q2) => $q2->where('cabang_id', $activeCabangId)))
        ->groupBy('product_name')
        ->orderByDesc('total_qty')
        ->limit(5)
        ->get()
        ->map(fn ($p) => [
            'product_name'  => $p->product_name,
            'total_qty'     => (int) $p->total_qty,
            'total_revenue' => (float) $p->total_revenue,
        ]);

        $recentSales = Sale::with(['items.product.cabang', 'items.pack'])
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->latest()
            ->paginate(5)
            ->through(fn ($sale) => [
                'id'         => $sale->id,
                'total'      => (float) $sale->total,
                'created_at' => $sale->created_at,
                'items'      => $sale->items->map(fn ($item) => [
                    'id'            => $item->id,
                    'product_name'  => $item->product_name,
                    'unit_price'    => $item->unit_price,
                    'quantity'      => $item->quantity,
                    'subtotal'      => $item->subtotal,
                    'is_free'       => $item->is_free,
                    'cabang_name' => $item->product?->cabang?->name ?? ($item->pack ? 'Paket' : '—'),
                ]),
            ]);

        $productQuery = fn () => Product::query()
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId));

        return Inertia::render('dashboard', [
            'stats' => [
                'today_revenue'      => (float) $todaySales->sum('total'),
                'today_transactions' => $todaySales->count(),
                'total_products'     => $productQuery()->where('is_active', true)->count(),
                'low_stock_count'    => $productQuery()->where('stock', '<=', 5)->where('stock', '>', 0)->count(),
                'payment_breakdown'  => $paymentBreakdown,
            ],
            'top_products' => $topProduct,
            'recent_sales' => $recentSales,
            'user' => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
                'role'  => $this->user->role,
                'operator_name' => $this->user->operator_name,
            ],
        ]);
    }
}
