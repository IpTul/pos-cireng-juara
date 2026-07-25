<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
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
        $products = Product::with('category')
        ->where('is_active', true)
        ->where('stock', '>', 0)
        ->orderBy('name')
        ->get();
        return Inertia::render('pos/index', [
            'products' => $products,
            'user' => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
                'role'  => $this->user->role,
            ],
        ]);
    }
}
