<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SalesItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Cabang;

class FinancialReportController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    public function index(Request $request)
    {
        $cabangId = $request->user()->activeCabangId();
        if (! $this->user?->isOwner()) {
            abort(403, 'Hanya owner yang boleh mengakses laporan keuangan.');
        }

        $startDate = $request->input('start_date')
            ? Carbon::parse($request->input('start_date'))->startOfDay()
            : now()->startOfDay();

        $endDate = $request->input('end_date')
            ? Carbon::parse($request->input('end_date'))->endOfDay()
            : now()->endOfDay();

        $salesQuery = Sale::where('status', 'completed')
            ->when($cabangId, fn ($q) => $q->where('cabang_id', $cabangId))
            ->whereBetween('created_at', [$startDate, $endDate]);

        $totalRevenue = (clone $salesQuery)->sum('total');
        $totalTransactions = (clone $salesQuery)->count();
        $averageTransaction = $totalTransactions > 0
            ? round($totalRevenue / $totalTransactions)
            : 0;

        // Pendapatan per metode pembayaran (per hari dan total periode)
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

        $topItems = SalesItem::whereHas('sale', function ($q) use ($startDate, $endDate, $cabangId) {
                $q->where('status', 'completed')
                  ->when($cabangId, fn ($q2) => $q2->where('cabang_id', $cabangId))
                  ->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->select(
                'product_id',
                'pack_id',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(subtotal) as total_revenue')
            )
            ->with(['product:id,name', 'pack:id,name'])
            ->groupBy('product_id', 'pack_id')
            ->orderByDesc('total_revenue')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->product?->name ?? $row->pack?->name ?? 'Item Dihapus',
                'type' => $row->pack_id ? 'paket' : 'produk',
                'total_qty' => (int) $row->total_qty,
                'total_revenue' => (float) $row->total_revenue,
            ]);

        return Inertia::render('keuangan/index', [
            'summary' => [
                'total_revenue' => (float) $totalRevenue,
                'total_transactions' => $totalTransactions,
                'average_transaction' => (float) $averageTransaction,
            ],
            'payments' => $payments,
            'dailyRevenue' => $dailyRevenue,
            'topItems' => $topItems,
            'filters' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'cabangName' => $cabangId
                ? (Cabang::find($cabangId)?->name ?? 'Cabang')
                : 'Semua Cabang',
        ]);
    }
}