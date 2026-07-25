<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function index() : response
    {
        $products = Product::with('category')
        ->where('is_active', true)
        ->where('stock', '>', 0)
        ->orderBy('name')
        ->get();
        return Inertia::render('pos/index', [
            'products' => $products
        ]);
    }
}
