<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Pack;
use App\Models\Sale;
use App\Models\Addon;
use App\Models\Member;
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
            'customer_name'             => ['required', 'string', 'max:255'],
            'member_id'                 => ['sometimes', 'integer', 'exists:members,id'],
            'items'                     => ['sometimes', 'array'],
            'items.*.product_id'        => ['required', 'exists:products,id'],
            'items.*.quantity'          => ['required', 'integer', 'min:1'],
            'packs'                     => ['sometimes', 'array'],
            'packs.*.pack_id'           => ['required', 'exists:packs,id'],
            'packs.*.quantity'          => ['required', 'integer', 'min:1'],
            'packs.*.variants'          => ['sometimes', 'array'],
            'packs.*.variants.*.product_id' => ['required', 'exists:products,id'],
            'packs.*.variants.*.quantity'   => ['required', 'integer', 'min:1'],
            'free_items'                => ['sometimes', 'array'],
            'free_items.*.product_id'   => ['required', 'exists:products,id'],
            'free_items.*.quantity'     => ['required', 'integer', 'min:1'],
            'addons'                    => ['sometimes', 'array'],
            'addons.*.addon_id'         => ['required', 'exists:addons,id'],
            'addons.*.quantity'         => ['required', 'integer', 'min:1'],
            'cash_tendered'             => ['required', 'integer', 'min:1'],
            'payment_method'            => ['sometimes', 'string', 'in:cash,qris,grab'],
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

                // Handle variants if provided (new flexible pack system)
                $variants = $packItem['variants'] ?? [];

                if (! empty($variants)) {
                    // Validate variants count
                    if (count($variants) > $pack->max_items) {
                        throw ValidationException::withMessages([
                            'packs' => "Maksimal {$pack->max_items} item untuk paket \"{$pack->name}\".",
                        ]);
                    }

                    // Calculate required stock per product from variants
                    $requiredStock = [];
                    foreach ($variants as $variant) {
                        $productId = $variant['product_id'];
                        $qty = $variant['quantity'] * $packQty;
                        $requiredStock[$productId] = ($requiredStock[$productId] ?? 0) + $qty;
                    }

                    // Check stock for each variant
                    foreach ($requiredStock as $productId => $required) {
                        $product = Product::lockForUpdate()->findOrFail($productId);
                        if (! $product->is_active || $product->stock < $required) {
                            throw ValidationException::withMessages([
                                'packs' => "Stok tidak mencukupi untuk \"{$product->name}\" (diperlukan: {$required}).",
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

                    // Decrement stock for each variant
                    foreach ($requiredStock as $productId => $required) {
                        $product = Product::lockForUpdate()->findOrFail($productId);
                        $product->decrement('stock', $required);
                    }
                } else {
                    // Legacy: Check stock for all items in pack (paid only)
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

            // Handle addons
            $addons = $validated['addons'] ?? [];
            foreach ($addons as $addonItem) {
                $addon = Addon::findOrFail($addonItem['addon_id']);
                $addonQty = $addonItem['quantity'];

                if (! $addon->is_active) {
                    throw ValidationException::withMessages([
                        'addons' => "Addon \"{$addon->name}\" tidak aktif.",
                    ]);
                }
                // Addons don't have stock, so no stock check needed
                $saleItems[] = [
                    'product_id'   => null,
                    'pack_id'      => null,
                    'addon_id'     => $addon->id,
                    'product_name' => "[ADDON] {$addon->name}",
                    'unit_price'   => $addon->price,
                    'quantity'     => $addonQty,
                    'subtotal'     => round($addon->price * $addonQty),
                    'is_free'      => false,
                ];
                // No stock decrement for addons
            }

            $cash = (float) $validated['cash_tendered'];

            if ($cash < $total) {
                throw ValidationException::withMessages([
                    'cash_tendered' => 'Uang tunai kurang dari total.',
                ]);
            }

            $paymentMethod = $validated['payment_method'] ?? 'cash';

            // Calculate total cireng items for points (products + pack variants only)
            $totalCirengItems = 0;

            // Regular products
            foreach ($validated['items'] ?? [] as $item) {
                $totalCirengItems += $item['quantity'];
            }

            // Pack variants (each variant quantity counts as items)
            foreach ($validated['packs'] ?? [] as $packItem) {
                $variants = $packItem['variants'] ?? [];
                if (! empty($variants)) {
                    foreach ($variants as $variant) {
                        $totalCirengItems += $variant['quantity'] * $packItem['quantity'];
                    }
                } else {
                    // Legacy: count pack items
                    $pack = Pack::findOrFail($packItem['pack_id']);
                    foreach ($pack->packItems as $pi) {
                        $totalCirengItems += $pi->quantity * $packItem['quantity'];
                    }
                }
            }

            $sale = Sale::create([
                'user_id'        => $request->user()->id,
                'customer_name'  => $validated['customer_name'] ?? null,
                'member_id'      => $validated['member_id'] ?? null,
                'total'          => round($total),
                'cash_tendered'  => $cash,
                'change_amount'  => round($cash - $total),
                'payment_method' => $paymentMethod,
            ]);

            $sale->items()->createMany($saleItems);

            // Add points to member if provided
            if (! empty($validated['member_id']) && $totalCirengItems > 0) {
                $member = Member::lockForUpdate()->findOrFail($validated['member_id']);

                if (! $member->is_deleted) {
                    $member->addPoints($totalCirengItems);
                    $member->updateLastPurchase();
                }
            }

            return $sale->id;
        });

        return redirect()->route('receipt', $saleId);
    }

    public function receipt(Sale $sale){
        $sale->load(['items', 'member']);

        return Inertia::render('pos/receipt',[
            'sale' => $sale
        ]);
    }
}