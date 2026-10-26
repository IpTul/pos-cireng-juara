<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockAdjustment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ->paginate(20)
            ->withQueryString();

        $products = Product::with('cabang')
            ->where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->get();

        return Inertia::render('stock/index', [
            'adjustments' => $adjustments,
            'products' => $products,
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
}