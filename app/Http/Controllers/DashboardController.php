<?php

namespace App\Http\Controllers;

use App\Concerns\BuildsSaleHistory;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SalesItem;
use App\Services\StockSummaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use BuildsSaleHistory;

    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();

        // Optionally, restrict to owner or kasir (duplicate of route middleware)
        if (! $this->user?->inRole(['owner', 'kasir'])) {
            abort(403, 'Akses ditolak.');
        }
    }
    
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user?->inRole(['owner', 'kasir']), 403, 'Akses ditolak.');
        $today = today();
        $activeCabangId = $this->user->activeCabangId();

        $todaySales = Sale::whereDate('created_at',$today)
            ->where('status','completed')
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->get();

        $paymentBreakdown = [];
        foreach (['cash', 'qris', 'grab', 'gofood'] as $method) {
            $bySale = $todaySales->where('payment_method', $method);
            $paymentBreakdown[$method] = [
                'total' => (float) $bySale->sum('total'),
                'count' => $bySale->count(),
            ];
        }

        // top product
        $topProduct = SalesItem::select(
            'product_name',
            DB::raw('SUM(quantity) as total_qty'),
            DB::raw('SUM(subtotal) as total_revenue')
        )
        ->whereHas('sale', fn($q) => $q->whereDate('created_at',$today)->where('status','completed')
        ->when($activeCabangId, fn ($q2) => $q2->where('cabang_id', $activeCabangId)))
        ->groupBy('product_name')
        ->orderByDesc('total_qty')
        ->limit(5)
        ->get()
        ->map(fn($p) => [
            'product_name'  => $p->product_name,
            'total_qty'     => (int) $p->total_qty,
            'total_revenue' => (float) $p->total_revenue,
        ]);

        // Ringkasan stok per produk. Periode dashboard punya parameter sendiri
        // (stok_*) supaya tidak bentrok dengan filter riwayat penjualan.
        $stockService = app(StockSummaryService::class);
        $stokPeriod = $request->input('stok_period', 'today');
        $stokStart = $request->input('stok_start');
        $stokEnd = $request->input('stok_end');
        [$stokFrom, $stokTo] = $stockService->resolvePeriod($stokPeriod, $stokStart, $stokEnd);
        $stockSummary = $stockService->build(
            $stockService->activeProducts($activeCabangId),
            $stokFrom,
            $stokTo,
        );

        return Inertia::render('dashboard',[
            'stats' => [
                    'today_revenue'      => (float) $todaySales->sum('total'),
                    'today_transactions' => $todaySales->count(),
                    'payment_breakdown'  => $paymentBreakdown,
                    'total_products' => Product::where('is_active', true)
                        ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
                        ->count(),
                    'low_stock_count' => Product::where('is_active', true)
                        ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
                        ->where('stock', '<=', 5)
                        ->count(),
            ],
            'top_products' => $topProduct,
            ...$this->saleHistoryProps($request, $request->only(['stok_period', 'stok_start', 'stok_end'])),
            'stockSummary' => $stockSummary,
            'stockFilters' => [
                'period' => $stokPeriod,
                'start_date' => $stokStart,
                'end_date' => $stokEnd,
            ],
            'user' => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
                'role'  => $this->user->role,
            ],
        ]);
    }
}