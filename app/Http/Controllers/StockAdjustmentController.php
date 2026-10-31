<?php

namespace App\Http\Controllers;

use App\Models\DailyStockLeftover;
use App\Models\Product;
use App\Models\StockAdjustment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Illuminate\Support\Carbon;

class StockAdjustmentController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    private const INCREASE_REASONS = ['Stok Awal', 'Tambahan'];

    private const DECREASE_REASONS = [
        'Pengurangan',
        'Rusak',
        'Ke double (konfirmasi owner)',
    ];

    private const REASONS = [
        'Stok Awal',
        'Tambahan',
        'Pengurangan',
        'Rusak',
        'Ke double (konfirmasi owner)',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ]);

        $activeCabangId = $this->user->activeCabangId();
        $reason = $request->input('reason', 'all');
        [$from, $to] = $this->resolvePeriod($request);

        $adjustments = StockAdjustment::with(['product.cabang', 'user'])
            ->when($activeCabangId, function ($q) use ($activeCabangId) {
                $q->whereHas('product', fn ($p) => $p->where('cabang_id', $activeCabangId));
            })
            ->when($reason !== 'all', function ($q) use ($reason) {
                if ($reason === 'other') {
                    $q->where(function ($w) {
                        $w->whereNull('reason')->orWhereNotIn('reason', self::REASONS);
                    });
                } else {
                    $q->where('reason', $reason);
                }
            })
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->latest()
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        $products = Product::with('cabang')
            ->where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->get();

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

        $stockSummary = $products->map(function ($product) use ($totalsByProduct, $leftovers, $includesToday) {
            $rows = $totalsByProduct->get($product->id, collect())->pluck('total', 'reason');
            $snapshot = $leftovers->get($product->id);

            return [
                'product_id' => $product->id,
                'name' => $product->name,
                'cabang' => $product->cabang?->name,
                'stock' => $product->stock,
                'sisa' => ($snapshot === null && ! $includesToday)
                    ? null
                    : (int) $snapshot + ($includesToday ? $product->stock : 0),
                'stok_awal' => (int) ($rows['Stok Awal'] ?? 0),
                'tambahan' => (int) ($rows['Tambahan'] ?? 0),
                'pengurangan' => (int) ($rows['Pengurangan'] ?? 0),
                'rusak' => (int) ($rows['Rusak'] ?? 0),
                'ke_double' => (int) ($rows['Ke double (konfirmasi owner)'] ?? 0),
            ];
        })->values();

        return Inertia::render('stock/index', [
            'adjustments' => $adjustments,
            'products' => $products,
            'stockSummary' => $stockSummary,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ],
            'can' => [
                'create' => auth()->user()->can('create', StockAdjustment::class),
            ],
            'filters' => [
                'reason' => $reason,
                'period' => $request->input('period', 'all'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
            ],
        ]);
    }

    private function resolvePeriod(Request $request): array
    {
        return match ($request->input('period', 'all')) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'yesterday' => [now()->subDay()->startOfDay(), now()->subDay()->endOfDay()],
            '7days' => [now()->subDays(6)->startOfDay(), now()->endOfDay()],
            '30days' => [now()->subDays(29)->startOfDay(), now()->endOfDay()],
            'custom' => [
                $request->filled('start_date') ? Carbon::parse($request->input('start_date'))->startOfDay() : null,
                $request->filled('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : null,
            ],
            default => [null, null],
        };
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'type' => ['required', 'in:increase,decrease'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $allowedReasons = $validated['type'] === 'increase'
            ? self::INCREASE_REASONS
            : self::DECREASE_REASONS;

        if (! in_array($validated['reason'], $allowedReasons, true)) {
            throw ValidationException::withMessages([
                'reason' => 'Alasan tidak sesuai dengan jenis perubahan.',
            ]);
        }

        $product = Product::lockForUpdate()->findOrFail($validated['product_id']);

        if ($this->user->isKasir() && $product->cabang_id !== $this->user->cabang_id) {
            abort(403, 'Produk ini bukan milik cabang kamu.');
        }

        if (!$product->is_active) {
            throw ValidationException::withMessages([
                'product_id' => 'Produk tidak aktif.',
            ]);
        }

        $previousStock = $product->stock;
        $newStock = $validated['type'] === 'increase'
            ? $previousStock + $validated['quantity']
            : $previousStock - $validated['quantity'];

        if ($newStock < 0) {
            throw ValidationException::withMessages([
                'quantity' => "Stok tidak boleh negatif. Stok saat ini: {$previousStock}.",
            ]);
        }

        $product->stock = $newStock;
        $product->save();

        StockAdjustment::create([
            'product_id' => $product->id,
            'user_id' => auth()->id(),
            'operator_name' => $request->user()->operator_name ?? $request->user()->name,
            'type' => $validated['type'],
            'quantity' => $validated['quantity'],
            'reason' => $validated['reason'],
            'previous_stock' => $previousStock,
            'new_stock' => $newStock,
        ]);

        return redirect()->back()->with('success', 'Stok berhasil diubah.');
    }

    public function update(Request $request, StockAdjustment $adjustment): RedirectResponse
    {
        abort_unless($request->user()->isProduksi(), 403);

        $validated = $request->validate([
            'type' => ['required', 'in:increase,decrease'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $allowedReasons = $validated['type'] === 'increase'
            ? self::INCREASE_REASONS
            : self::DECREASE_REASONS;

        if (! in_array($validated['reason'], $allowedReasons, true)) {
            throw ValidationException::withMessages([
                'reason' => 'Alasan tidak sesuai dengan jenis perubahan.',
            ]);
        }

        DB::transaction(function () use ($adjustment, $validated, $request) {
            $product = Product::lockForUpdate()->findOrFail($adjustment->product_id);

            $oldEffect = $adjustment->type === 'increase'
                ? $adjustment->quantity
                : -$adjustment->quantity;
            $newEffect = $validated['type'] === 'increase'
                ? $validated['quantity']
                : -$validated['quantity'];
            $delta = $newEffect - $oldEffect;

            $newProductStock = $product->stock + $delta;
            $newRowStock = $adjustment->previous_stock + $newEffect;

            if ($newProductStock < 0 || $newRowStock < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Perubahan ini membuat stok negatif. Stok produk saat ini: {$product->stock}.",
                ]);
            }

            $product->update(['stock' => $newProductStock]);

            // Riwayat setelahnya untuk produk yang sama ikut bergeser supaya urutannya tetap konsisten
            if ($delta !== 0) {
                StockAdjustment::where('product_id', $adjustment->product_id)
                    ->where('id', '>', $adjustment->id)
                    ->incrementEach([
                        'previous_stock' => $delta,
                        'new_stock' => $delta,
                    ]);
            }

            $adjustment->update([
                'type' => $validated['type'],
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'new_stock' => $newRowStock,
                'edited_at' => now(),
                'edited_by' => $request->user()->operator_name ?? $request->user()->name,
            ]);
        });

        return redirect()->back()->with('success', 'Riwayat stok berhasil diubah.');
    }

    public function destroy(Request $request, StockAdjustment $adjustment): RedirectResponse
    {
        abort_unless($request->user()->isProduksi(), 403);

        DB::transaction(function () use ($adjustment, $request) {
            $product = Product::lockForUpdate()->findOrFail($adjustment->product_id);

            // Batalkan efek riwayat ini: tambah stok -> dikurangi lagi, kurang stok -> dikembalikan
            $effect = $adjustment->type === 'increase'
                ? $adjustment->quantity
                : -$adjustment->quantity;
            $restoredStock = $product->stock - $effect;

            if ($restoredStock < 0) {
                throw ValidationException::withMessages([
                    'adjustment' => "Riwayat ini tidak bisa dihapus karena stok akan menjadi negatif ({$restoredStock}). Stok produk saat ini: {$product->stock}.",
                ]);
            }

            $product->update(['stock' => $restoredStock]);

            // Riwayat setelahnya untuk produk yang sama ikut bergeser supaya urutannya tetap konsisten
            StockAdjustment::where('product_id', $adjustment->product_id)
                ->where('id', '>', $adjustment->id)
                ->incrementEach([
                    'previous_stock' => -$effect,
                    'new_stock' => -$effect,
                ]);

            // Jejak penghapusan (riwayat dihapus permanen) ada di storage/logs/laravel.log
            Log::info('Riwayat stok dihapus', [
                'adjustment_id' => $adjustment->id,
                'product_id' => $adjustment->product_id,
                'type' => $adjustment->type,
                'quantity' => $adjustment->quantity,
                'reason' => $adjustment->reason,
                'previous_stock' => $adjustment->previous_stock,
                'new_stock' => $adjustment->new_stock,
                'stock_restored_to' => $restoredStock,
                'deleted_by' => $request->user()->operator_name ?? $request->user()->name,
            ]);

            $adjustment->delete();
        });

        return redirect()->back()->with('success', 'Riwayat stok dihapus dan stok produk dikembalikan.');
    }
}