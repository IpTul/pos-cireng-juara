<?php

namespace App\Services;

use App\Models\Cabang;
use App\Models\Expense;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Ringkasan pengeluaran tunai untuk laporan keuangan (per cabang, per periode).
 */
class ExpenseReportService
{
    /**
     * @param  Builder  $salesQuery  penjualan selesai pada periode & cabang yang sama
     */
    public function summarize(?int $cabangId, CarbonInterface $start, CarbonInterface $end, Builder $salesQuery, int $totalRevenue): array
    {
        $rows = Expense::with('cabang:id,name')
            ->when($cabangId, fn ($q) => $q->where('cabang_id', $cabangId))
            ->whereBetween('created_at', [$start, $end])
            ->latest()
            ->latest('id')
            ->get();

        $cashByCabang = (clone $salesQuery)
            ->where(fn ($q) => $q->where('payment_method', 'cash')->orWhereNull('payment_method'))
            ->selectRaw('cabang_id, SUM(total) as total')
            ->groupBy('cabang_id')
            ->pluck('total', 'cabang_id');
        $spentByCabang = $rows->groupBy('cabang_id')->map->sum('amount');

        $perCabang = Cabang::query()
            ->when($cabangId, fn ($q) => $q->where('id', $cabangId))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function (Cabang $c) use ($cashByCabang, $spentByCabang) {
                $cash = (int) ($cashByCabang[$c->id] ?? 0);
                $out = (int) ($spentByCabang[$c->id] ?? 0);

                return [
                    'cabang' => $c->name,
                    'cash_sales' => $cash,
                    'expenses' => $out,
                    'cash_balance' => $cash - $out,
                ];
            })
            ->values();

        $total = (int) $rows->sum('amount');

        return [
            'total' => $total,
            'count' => $rows->count(),
            'net_revenue' => $totalRevenue - $total,
            'per_cabang' => $perCabang,
            'items' => $rows->map(fn (Expense $e) => [
                'id' => $e->id,
                'date' => $e->created_at->toDateString(),
                'cabang' => $e->cabang?->name,
                'description' => $e->description,
                'operator' => $e->operator_name ?? '-',
                'amount' => $e->amount,
            ])->values(),
        ];
    }
}