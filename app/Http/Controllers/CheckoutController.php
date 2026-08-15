<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Pack;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'items'                     => ['sometimes', 'array'],
            'items.*.product_id'        => ['required', 'exists:products,id'],
            'items.*.quantity'          => ['required', 'integer', 'min:1'],
            'packs'                     => ['sometimes', 'array'],
            'packs.*.pack_id'           => ['required', 'exists:packs,id'],
            'packs.*.quantity'          => ['required', 'integer', 'min:1'],
            'free_items'                => ['sometimes', 'array'],
            'free_items.*.product_id'   => ['required', 'exists:products,id'],
            'free_items.*.quantity'     => ['required', 'integer', 'min:1'],
            'cash_tendered'             => ['required', 'integer', 'min:1'],
        ]);

        // Ensure at least one item or pack
        if (empty($validated['items']) && empty($validated['packs'])) {
            throw ValidationException::withMessages([
                'items' => 'Minimal satu produk atau paket harus dipilih.',
            ]);
        }

        $saleId = DB::transaction(function() use ($validated, $request){
            $total     = 0;
            $saleItems = [];

            // Collect all paid quantities per product (for stock validation of free items)
            $paidQuantitiesByProduct = [];
            foreach ($validated['items'] ?? [] as $item) {
                $paidQuantitiesByProduct[$item['product_id']] = ($paidQuantitiesByProduct[$item['product_id']] ?? 0) + $item['quantity'];
            }

            // Handle regular products
            foreach ($validated['items'] ?? [] as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                $paidQty = $item['quantity'];

                if (! $product->is_active || $product->stock < $paidQty) {
                    throw ValidationException::withMessages([
                        'items' => "Stok tidak mencukupi untuk \"{$product->name}\" (diperlukan: {$paidQty}).",
                    ]);
                }

                $subtotal    = (float) $product->price * $paidQty;
                $total      += $subtotal;
                $saleItems[] = [
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'unit_price'   => $product->price,
                    'quantity'     => $paidQty,
                    'subtotal'     => round($subtotal),
                    'is_free'      => false,
                ];

                // Decrement stock for paid items
                $product->decrement('stock', $paidQty);
            }

            // Handle packs
            foreach ($validated['packs'] ?? [] as $packItem) {
                $pack = Pack::with('packItems.product')->lockForUpdate()->findOrFail($packItem['pack_id']);
                $packQty = $packItem['quantity'];

                if (! $pack->is_active) {
                    throw ValidationException::withMessages([
                        'packs' => "Paket \"{$pack->name}\" tidak aktif.",
                    ]);
                }

                // Check stock for all items in pack (paid only)
                foreach ($pack->packItems as $pi) {
                    $requiredStock = $pi->quantity * $packQty;
                    if (! $pi->product->is_active || $pi->product->stock < $requiredStock) {
                        throw ValidationException::withMessages([
                            'packs' => "Stok tidak mencukupi untuk \"{$pi->product->name}\" (diperlukan: {$requiredStock}).",
                        ]);
                    }
                }

                // Add pack to sale items
                $subtotal    = (float) $pack->price * $packQty;
                $total      += $subtotal;
                $saleItems[] = [
                    'product_id'   => null,
                    'pack_id'      => $pack->id,
                    'product_name' => "[Paket] {$pack->name}",
                    'unit_price'   => $pack->price,
                    'quantity'     => $packQty,
                    'subtotal'     => round($subtotal),
                    'is_free'      => false,
                ];

                // Decrement stock for each item in pack (paid)
                foreach ($pack->packItems as $pi) {
                    $pi->product->decrement('stock', $pi->quantity * $packQty);
                }
            }

            // Handle global free items
            $freeItems = $validated['free_items'] ?? [];
            foreach ($freeItems as $fi) {
                $freeProduct = Product::lockForUpdate()->findOrFail($fi['product_id']);
                $freeQty = $fi['quantity'];

                if (! $freeProduct->is_active || $freeProduct->stock < $freeQty) {
                    throw ValidationException::withMessages([
                        'free_items' => "Stok tidak mencukupi untuk item gratis \"{$freeProduct->name}\".",
                    ]);
                }
                $saleItems[] = [
                    'product_id'   => $freeProduct->id,
                    'product_name' => "[GRATIS] {$freeProduct->name}",
                    'unit_price'   => 0,
                    'quantity'     => $freeQty,
                    'subtotal'     => 0,
                    'is_free'      => true,
                ];
                $freeProduct->decrement('stock', $freeQty);
            }

            $cash = (float) $validated['cash_tendered'];

            if ($cash < $total) {
                throw ValidationException::withMessages([
                    'cash_tendered' => 'Uang tunai kurang dari total.',
                ]);
            }

            $sale = Sale::create([
                'user_id'       => $request->user()->id,
                'total'         => round($total),
                'cash_tendered' => $cash,
                'change_amount' => round($cash - $total),
            ]);

            $sale->items()->createMany($saleItems);

            return $sale->id;
        });

        return redirect()->route('receipt', $saleId);
    }

    public function receipt(Sale $sale){
        $sale->load('items');

        return Inertia::render('pos/receipt',[
            'sale' => $sale
        ]);
    }
}