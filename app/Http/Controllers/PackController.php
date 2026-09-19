<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Pack;
use App\Models\PackItem;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PackController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    private function authorizeOwnerOnly()
    {
        if (! $this->user?->isOwner()) {
            abort(403, 'Hanya owner yang boleh melakukan aksi ini.');
        }
    }

    public function index()
    {
        $packs = Pack::with(['packItems.product.cabang'])
            ->latest()
            ->get();

        $products = Product::with('cabang')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('pack/index', [
            'packs' => $packs,
            'products' => $products,
            'can' => [
                'create' => Auth::user()->can('create', Pack::class),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeOwnerOnly();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'integer', 'min:0'],
            'image' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'max_items' => ['required', 'integer', 'min:1', 'max:20'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $pack = Pack::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'price' => $validated['price'],
            'image' => $validated['image'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'max_items' => $validated['max_items'],
        ]);

        foreach ($validated['items'] as $item) {
            PackItem::create([
                'pack_id' => $pack->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
            ]);
        }

        return redirect()->route('pack.index')->with('success', 'Paket berhasil dibuat.');
    }

    public function update(Request $request, Pack $pack)
    {
        $this->authorizeOwnerOnly();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'integer', 'min:0'],
            'image' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'max_items' => ['required', 'integer', 'min:1', 'max:20'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $pack->update([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'price' => $validated['price'],
            'image' => $validated['image'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'max_items' => $validated['max_items'],
        ]);

        // Delete existing pack items and recreate
        $pack->packItems()->delete();

        foreach ($validated['items'] as $item) {
            PackItem::create([
                'pack_id' => $pack->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
            ]);
        }

        return redirect()->route('pack.index')->with('success', 'Paket berhasil diperbarui.');
    }

    public function destroy(Pack $pack)
    {
        $this->authorizeOwnerOnly();

        $pack->packItems()->delete();
        $pack->delete();

        return redirect()->route('pack.index')->with('success', 'Paket berhasil dihapus.');
    }
}