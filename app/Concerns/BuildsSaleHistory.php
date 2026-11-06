<?php

namespace App\Concerns;

use App\Models\Sale;
use App\Models\SalesItem;
use Illuminate\Http\Request;

/**
 * Query, filter, dan transformasi riwayat penjualan.
 * Dipakai bersama oleh halaman Riwayat (/history) dan Dashboard.
 */
trait BuildsSaleHistory
{
    // Filter kuah & saus. Produk dan addon DIPISAH: 'product' hanya baris produk biasa,
    // 'addon' hanya baris addon. Nama dicocokkan dengan awalan, jadi "Kuah Creamy"
    // maupun "Kuah Creamy Juara" sama-sama terhitung.
    private const SIDE_FILTERS = [
        'kuah_creamy' => ['name' => 'Kuah Creamy', 'type' => 'product'],
        'chili_oil' => ['name' => 'Chili Oil', 'type' => 'product'],
        'mentai' => ['name' => 'Mentai', 'type' => 'product'],
        'addon_kuah_creamy' => ['name' => 'Kuah Creamy', 'type' => 'addon'],
        'addon_chili_oil' => ['name' => 'Chili Oil', 'type' => 'addon'],
        'addon_mentai' => ['name' => 'Mentai', 'type' => 'addon'],
        'rendang' => ['name' => 'Daging Rendang', 'type' => 'product'],
    ];

    // Item berbayar (bukan gratis, bukan paket) yang namanya diawali $name.
    // type 'product': hanya produk biasa ("Mentai", "Mentai Juara").
    // type 'addon'  : hanya addon ("[ADDON] Mentai ...").
    private function matchSideItem($query, string $name, string $type): void
    {
        $query->where('is_free', false);

        if ($type === 'addon') {
            $query->whereNotNull('addon_id')
                ->where(function ($q) use ($name) {
                    $q->where('product_name', 'like', "[ADDON] {$name}%")
                        ->orWhereHas('addon', fn ($a) => $a->where('name', 'like', "{$name}%"));
                });

            return;
        }

        $query->whereNull('addon_id')
            ->whereNull('pack_id')
            ->where(function ($q) use ($name) {
                $q->where('product_name', 'like', "{$name}%")
                    ->orWhereHas('product', fn ($p) => $p->where('name', 'like', "{$name}%"));
            });
    }

    private function sideCounts(Request $request): array
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $paymentMethod = $request->input('payment_method');
        $activeCabangId = $request->user()->activeCabangId();

        // Dasar hitungan: filter cabang, tanggal, dan metode bayar yang sedang dipakai
        $base = fn () => Sale::query()
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->when($startDate, fn ($q) => $q->whereDate('created_at', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('created_at', '<=', $endDate))
            ->when($paymentMethod && $paymentMethod !== 'all', fn ($q) => $q->where('payment_method', $paymentMethod));

        $counts = [];

        foreach (self::SIDE_FILTERS as $key => $filter) {
            $counts[$key] = $base()
                ->whereHas('items', fn ($q) => $this->matchSideItem($q, $filter['name'], $filter['type']))
                ->count();
        }

        // Transaksi yang membeli paket (item berbayar dengan pack_id)
        $counts['paket'] = $base()
            ->whereHas('items', fn ($q) => $q->where('is_free', false)->whereNotNull('pack_id'))
            ->count();

        return $counts;
    }

    /**
     * Total item (jumlah qty) di SEMUA transaksi hasil filter, bukan hanya halaman yang tampil.
     * Kalau satu filter item aktif, yang dihitung hanya item yang cocok dengan filter itu:
     *   kuah/saus/addon (chip side) > paket > addon > gratis.
     * Tanpa filter item, semua item dihitung.
     */
    private function itemsSold(Request $request): int
    {
        $side = $request->input('side');
        $sideFilter = $side && isset(self::SIDE_FILTERS[$side]) ? self::SIDE_FILTERS[$side] : null;

        $saleIds = $this->baseSalesQuery($request)->reorder()->select('id');

        return (int) SalesItem::query()
            ->whereIn('sale_id', $saleIds)
            ->when($sideFilter, function ($q) use ($sideFilter) {
                $this->matchSideItem($q, $sideFilter['name'], $sideFilter['type']);
            })
            ->when(! $sideFilter && $request->input('pack') === 'with', function ($q) {
                $q->where('is_free', false)->whereNotNull('pack_id');
            })
            ->when(! $sideFilter && $request->input('pack') !== 'with' && $request->input('addon') === 'with', function ($q) {
                $q->whereNotNull('addon_id');
            })
            ->when(
                ! $sideFilter && $request->input('pack') !== 'with' && $request->input('addon') !== 'with' && $request->input('free') === 'with',
                function ($q) {
                    $q->where('is_free', true);
                }
            )
            ->sum('quantity');
    }

    private function baseSalesQuery(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $paymentMethod = $request->input('payment_method');
        $free = $request->input('free');
        $addon = $request->input('addon');
        $side = $request->input('side');
        $pack = $request->input('pack');
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
            ->when($pack === 'with', function ($query) {
                $query->whereHas('items', fn ($q) => $q->where('is_free', false)->whereNotNull('pack_id'));
            })
            ->when($side && isset(self::SIDE_FILTERS[$side]), function ($query) use ($side) {
                $filter = self::SIDE_FILTERS[$side];
                $query->whereHas('items', fn ($q) => $this->matchSideItem($q, $filter['name'], $filter['type']));
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
                // Isi paket (produk yang dipilih saat transaksi); kosong untuk transaksi lama
                'variants' => collect($item->pack_variants ?? [])
                    ->map(fn ($v) => [
                        'name' => $v['name'] ?? '-',
                        'quantity' => $v['quantity'] ?? 0,
                    ])
                    ->values(),
            ])->values(),
        ];
    }

    /**
     * Props Inertia untuk daftar riwayat: transaksi (paginasi 10 per halaman),
     * hitungan kuah/saus/paket, dan filter yang sedang aktif.
     * Default periode adalah hari ini. $extraQuery = parameter lain (mis. filter
     * ringkasan stok di dashboard) yang ikut dibawa di link paginasi.
     */
    private function saleHistoryProps(Request $request, array $extraQuery = []): array
    {
        $filters = [
            'start_date' => $request->input('start_date', now()->toDateString()),
            'end_date' => $request->input('end_date', now()->toDateString()),
            'payment_method' => $request->input('payment_method', 'all'),
            'free' => $request->input('free', 'all'),
            'addon' => $request->input('addon', 'all'),
            'side' => $request->input('side', 'all'),
            'pack' => $request->input('pack', 'all'),
        ];

        $request->merge($filters);

        // Paginasi per TRANSAKSI langsung di database (bukan per item)
        $sales = $this->baseSalesQuery($request)
            ->paginate(10)
            ->appends($filters + $extraQuery)
            ->through(fn (Sale $sale) => $this->transformSale($sale));

        return [
            'sales' => $sales,
            'sideCounts' => $this->sideCounts($request),
            'itemsSold' => $this->itemsSold($request),
            'filters' => $filters,
        ];
    }
}