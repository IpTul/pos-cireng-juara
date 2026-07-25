<?php

namespace App\Http\Controllers;

use App\Models\SalesItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SaleHistoryController extends Controller
{
    /**
     * Display a listing of the sale history.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        $saleItems = SalesItem::with('user')
            // ->when(Auth::user(), fn($q) => $q, function ($q) {
            //     return $q->where('user_id', Auth::id());
            // })
            ->latest()
            ->get();

        return inertia('Sales/History', [
            'saleItems' => $saleItems,
            'can' => [
                'create' => Auth::user()->can('create', SaleItem::class),
            ]
        ]);
    }
}