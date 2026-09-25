<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Pack;
use App\Models\Addon;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();

        // Optionally, restrict to owner or kasir (duplicate of route middleware)
        if (! $this->user?->inRole(['owner', 'kasir'])) {
            abort(403, 'Akses ditolak.');
        }
    }

    public function index()
    {
        $activeCabangId = $this->user->activeCabangId();

        $products = Product::with('cabang')
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->orderBy('name')
            ->get();

        $packs = Pack::with(['packItems.product'])
            ->where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->get()
            ->filter(function ($pack) {
                $pack->is_available = true;
                foreach ($pack->packItems as $item) {
                    if (!$item->product->is_active || $item->product->stock < $item->quantity) {
                        return false;
                    }
                }
                return $pack;
            })
            ->values();

        $addons = Addon::where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->orderBy('name')
            ->get();

        return Inertia::render('pos/index', [
            'products' => $products,
            'packs' => $packs,
            'addons' => $addons,
            'user' => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
                'role'  => $this->user->role,
            ],
        ]);
    }
}
