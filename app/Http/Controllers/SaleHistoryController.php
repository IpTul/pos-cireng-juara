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
        $this->authorizeOwnerOnly();

        // Get all sales with their items, grouped by sale
        $sales = Sale::with(['items.product.category', 'items.pack', 'user'])
            ->latest()
            ->get();

        // Process each sale to combine free items with their main items
        $saleItems = $sales->flatMap(function ($sale) {
            $items = $sale->items;

            // Separate paid and free items
            $paidItems = $items->where('is_free', false);
            $freeItems = $items->where('is_free', true);

            $combined = $paidItems->map(function ($paidItem) use ($freeItems, $paidItems, $sale) {
                // Find free items that are "related" to this paid item
                // Strategy: free items of the same product, or if different product, attach to first paid item
                // For simplicity, we'll attach all free items to their matching product, or distribute
                $relatedFree = $freeItems->where('product_id', $paidItem->product_id);

                // If no matching product_id, and this is the first paid item, attach orphan free items
                $isFirstPaid = $paidItems->first()->id === $paidItem->id;
                $orphanFree = $isFirstPaid ? $freeItems->where('product_id', null)->where('pack_id', null) : collect();

                $allRelatedFree = $relatedFree->merge($orphanFree);

                $freeProducts = $allRelatedFree->map(function ($freeItem) {
                    return [
                        'id' => $freeItem->id,
                        'name' => $freeItem->product?->name ?? $freeItem->product_name,
                        'quantity' => $freeItem->quantity,
                    ];
                })->values();

                return [
                    'id' => $paidItem->id,
                    'sale' => [
                        'id' => $sale->id,
                        'total' => $sale->total,
                        'cash_tendered' => $sale->cash_tendered,
                        'change_amount' => $sale->change_amount,
                        'status' => $sale->status,
                        'created_at' => $sale->created_at,
                        'user' => [
                            'id' => $sale->user->id,
                            'name' => $sale->user->name,
                        ],
                    ],
                    'product' => $paidItem->product,
                    'pack' => $paidItem->pack,
                    'quantity' => $paidItem->quantity,
                    'unit_price' => $paidItem->unit_price,
                    'subtotal' => $paidItem->subtotal,
                    'is_free' => false,
                    'free_items' => $freeProducts,
                ];
            })->values();

            // If there are free items with no paid items (shouldn't happen), include them
            if ($paidItems->isEmpty() && $freeItems->isNotEmpty()) {
                $combined = $combined->merge($freeItems->map(function ($freeItem) use ($sale) {
                    return [
                        'id' => $freeItem->id,
                        'sale' => [
                            'id' => $sale->id,
                            'total' => $sale->total,
                            'cash_tendered' => $sale->cash_tendered,
                            'change_amount' => $sale->change_amount,
                            'status' => $sale->status,
                            'created_at' => $sale->created_at,
                            'user' => [
                                'id' => $sale->user->id,
                                'name' => $sale->user->name,
                            ],
                        ],
                        'product' => $freeItem->product,
                        'pack' => null,
                        'quantity' => $freeItem->quantity,
                        'unit_price' => 0,
                        'subtotal' => 0,
                        'is_free' => true,
                        'free_items' => [],
                    ];
                })->values());
            }

            return $combined;
        });

        return Inertia::render('history/index', [
            'saleItems' => $saleItems,
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