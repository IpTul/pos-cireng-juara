<?php

namespace App\Services;

use App\Models\DailyStockLeftover;
use App\Models\Product;
use App\Models\StockAdjustment;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;

/**
 * Ringkasan stok per produk untuk satu periode.
 * Dipakai bersama oleh halaman Stok (/stok) dan Dashboard.
 */
class StockSummaryService
{
    public const REASONS = [
        'Stok Awal',
        'Tambahan',
        'Pengurangan',
        'Rusak',
        'Ke double (konfirmasi owner)',
    ];

    /**
     * Ubah nama periode menjadi [dari, sampai]. null berarti tanpa batas.
     * Tanggal 'custom' yang tidak valid diabaikan (tidak melempar error).
     *
     * @return array{0: ?CarbonInterface, 1: ?CarbonInterface}
     */
    public function resolvePeriod(?string $period, ?string $start = null, ?string $end = null): array
    {
        return match ($period ?? 'all') {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'yesterday' => [now()->subDay()->startOfDay(), now()->subDay()->endOfDay()],
            '7days' => [now()->subDays(6)->startOfDay(), now()->endOfDay()],
            '30days' => [now()->subDays(29)->startOfDay(), now()->endOfDay()],
            'custom' => [
                $this->parseDate($start)?->startOfDay(),
                $this->parseDate($end)?->endOfDay(),
            ],
            default => [null, null],
        };
    }

    /**
     * Produk aktif (beserta cabang) yang masuk ringkasan, dibatasi ke cabang aktif.
     */
    public function activeProducts(?int $activeCabangId): Collection
    {
        return Product::with('cabang')
            ->where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->get();
    }

    /**
     * Satu baris per produk: total tiap alasan penyesuaian pada periode terpilih,
     * stok saat ini, dan sisa stok.
     */
    public function build(Collection $products, ?CarbonInterface $from, ?CarbonInterface $to): Collection
    {
        // Ringkasan per produk untuk periode terpilih (tanpa filter alasan)
        $totalsByProduct = StockAdjustment::query()
            ->selectRaw('product_id, reason, SUM(quantity) as total')
            ->whereIn('product_id', $products->modelKeys())
            ->whereIn('reason', self::REASONS)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->groupBy('product_id', 'reason')
            ->get()
            ->groupBy('product_id');

        // Sisa stok: catatan harian untuk hari yang sudah lewat, stok saat ini untuk hari ini
        $includesToday = (! $from || $from->lte(now())) && (! $to || $to->gte(now()->startOfDay()));

        $leftovers = DailyStockLeftover::query()
            ->selectRaw('product_id, SUM(stock) as total')
            ->whereIn('product_id', $products->modelKeys())
            ->when($from, fn ($q) => $q->where('date', '>=', $from->toDateString()))
            ->when($to, fn ($q) => $q->where('date', '<=', $to->toDateString()))
            ->groupBy('product_id')
            ->pluck('total', 'product_id');

        return $products->map(function ($product) use ($totalsByProduct, $leftovers, $includesToday) {
            $rows = $totalsByProduct->get($product->id, collect())->pluck('total', 'reason');
            $snapshot = $leftovers->get($product->id);

            return [
                'product_id' => $product->id,
                'name' => $product->name,
                'cabang' => $product->cabang?->name,
                'stock' => $product->stock,
                // Kuah Creamy, Chili Oil, Mentai tidak punya sisa harian (stoknya diisi ulang 1000)
                'sisa' => ($product->isSide() || ($snapshot === null && ! $includesToday))
                    ? null
                    : (int) $snapshot + ($includesToday ? $product->stock : 0),
                'stok_awal' => (int) ($rows['Stok Awal'] ?? 0),
                'tambahan' => (int) ($rows['Tambahan'] ?? 0),
                'pengurangan' => (int) ($rows['Pengurangan'] ?? 0),
                'rusak' => (int) ($rows['Rusak'] ?? 0),
                'ke_double' => (int) ($rows['Ke double (konfirmasi owner)'] ?? 0),
            ];
        })->values();
    }

    private function parseDate(?string $value): ?CarbonInterface
    {
        if (! $value || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        try {
            return Date::createFromFormat('Y-m-d', $value) ?: null;
        } catch (\Throwable) {
            return null;
        }
    }
}