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
use Carbon\Carbon;

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

        // Financial report data (owner only)
        $financialData = null;
        if ($this->user->isOwner()) {
            $finStartDate = $request->input('fin_start_date')
                ? Carbon::parse($request->input('fin_start_date'))->startOfDay()
                : now()->startOfDay();

            $finEndDate = $request->input('fin_end_date')
                ? Carbon::parse($request->input('fin_end_date'))->endOfDay()
                : now()->endOfDay();

            $salesQuery = Sale::where('status', 'completed')
                ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
                ->whereBetween('created_at', [$finStartDate, $finEndDate]);

            $totalRevenue = (clone $salesQuery)->sum('total');
            $totalTransactions = (clone $salesQuery)->count();
            $averageTransaction = $totalTransactions > 0
                ? round($totalRevenue / $totalTransactions)
                : 0;

            $methods = [
                'cash' => 'Tunai',
                'qris' => 'QRIS',
                'grab' => 'Grab',
                'gofood' => 'GoFood',
            ];

            $methodRows = (clone $salesQuery)
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw("COALESCE(payment_method, 'cash') as method"),
                    DB::raw('SUM(total) as revenue'),
                    DB::raw('COUNT(*) as transactions')
                )
                ->groupBy('date', 'method')
                ->get();

            $payments = collect($methods)->map(function ($label, $key) use ($methodRows) {
                $rows = $methodRows->where('method', $key);
                return [
                    'method' => $key,
                    'label' => $label,
                    'revenue' => (float) $rows->sum('revenue'),
                    'transactions' => (int) $rows->sum('transactions'),
                ];
            })->values();

            $dailyRevenue = (clone $salesQuery)
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(total) as revenue'),
                    DB::raw('COUNT(*) as transactions')
                )
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(fn ($row) => [
                    'date' => $row->date,
                    'revenue' => (float) $row->revenue,
                    'transactions' => (int) $row->transactions,
                    'by_method' => collect($methods)->mapWithKeys(fn ($label, $key) => [
                        $key => (float) $methodRows
                            ->where('date', $row->date)
                            ->where('method', $key)
                            ->sum('revenue'),
                    ]),
                ]);

            $financialData = [
                'summary' => [
                    'total_revenue' => (float) $totalRevenue,
                    'total_transactions' => $totalTransactions,
                    'average_transaction' => (float) $averageTransaction,
                ],
                'payments' => $payments,
                'dailyRevenue' => $dailyRevenue,
                'filters' => [
                    'start_date' => $finStartDate->toDateString(),
                    'end_date' => $finEndDate->toDateString(),
                ],
                'cabangName' => $activeCabangId
                    ? (app(\App\Models\Cabang::class)->find($activeCabangId)?->name ?? 'Cabang')
                    : 'Semua Cabang',
            ];
        }

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
            'financialData' => $financialData,
            'user' => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
                'role'  => $this->user->role,
            ],
        ]);
    }
}