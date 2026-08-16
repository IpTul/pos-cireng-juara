<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockAdjustment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StockAdjustmentController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    public function index()
    {
        $adjustments = StockAdjustment::with(['product.category', 'user'])
            ->latest()
            ->paginate(20);

        $products = Product::with('category')->where('is_active', true)->get();

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
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'type' => ['required', 'in:increase,decrease'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $product = Product::lockForUpdate()->findOrFail($validated['product_id']);

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
            'type' => $validated['type'],
            'quantity' => $validated['quantity'],
            'reason' => $validated['reason'],
            'previous_stock' => $previousStock,
            'new_stock' => $newStock,
        ]);

        return redirect()->back()->with('success', 'Stok berhasil diubah.');
    }
}