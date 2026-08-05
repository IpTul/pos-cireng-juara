<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SalesItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;


class SaleHistoryController extends Controller
{
    /**
     * Display a listing of the sale history.
     *
     * @return \Inertia\Response
     */

    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    private function authorizeOwnerOnly()
    {
        if(! $this->user?->isOwner()) {
            abort(403, 'Hanya owner yang boleh melakukan aksi ini.');
        }
    }

    public function index()
    {
        $salesItems = SalesItem::with(['sale.user', 'product.category'])
            ->latest()
            ->get();

        return Inertia::render('history/index', [
            'saleItems' => $salesItems,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ],
            'can' => [
                'create' => Auth::user()->can('create', Sale::class),
            ]
        ]);
    }
}