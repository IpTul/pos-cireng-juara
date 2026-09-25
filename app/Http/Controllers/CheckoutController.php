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

        if ($request->user()->isKasir()) {
            $ownCabangId = $request->user()->cabang_id;

            $productIds = collect($validated['items'] ?? [])->pluck('product_id')
                ->merge(collect($validated['packs'] ?? [])->pluck('variants')->flatten(1)->pluck('product_id'))
                ->merge(collect($validated['free_items'] ?? [])->pluck('product_id'))
                ->filter()
                ->unique();

            if ($productIds->isNotEmpty()) {
                $invalidProduct = \App\Models\Product::whereIn('id', $productIds)
                    ->where('cabang_id', '!=', $ownCabangId)
                    ->exists();
                if ($invalidProduct) {
                    abort(403, 'Ada produk dari cabang lain di keranjang.');
                }
            }

            $packIds = collect($validated['packs'] ?? [])->pluck('pack_id')->filter()->unique();
            if ($packIds->isNotEmpty()) {
                $invalidPack = Pack::whereIn('id', $packIds)
                    ->where('cabang_id', '!=', $ownCabangId)
                    ->exists();
                if ($invalidPack) {
                    abort(403, 'Ada paket dari cabang lain di keranjang.');
                }
            }

            if (! empty($validated['member_id'])) {
                $member = Member::find($validated['member_id']);
                if ($member && $member->cabang_id !== $ownCabangId) {
                    abort(403, 'Member ini bukan milik cabang kamu.');
                }
            }
        }
        
        $saleId = DB::transaction(function() use ($validated, $request){
            $total     = 0;
            $saleItems = [];

            $paidQuantitiesByProduct = [];
            foreach ($validated['items'] ?? [] as $item) {
                $paidQuantitiesByProduct[$item['product_id']] = ($paidQuantitiesByProduct[$item['product_id']] ?? 0) + $item['quantity'];
            }

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

                $product->decrement('stock', $paidQty);
            }

            foreach ($validated['packs'] ?? [] as $packItem) {
                $pack = Pack::with('packItems.product')->lockForUpdate()->findOrFail($packItem['pack_id']);
                $packQty = $packItem['quantity'];

                if (! $pack->is_active) {
                    throw ValidationException::withMessages([
                        'packs' => "Paket \"{$pack->name}\" tidak aktif.",
                    ]);
                }

                $variants = $packItem['variants'] ?? [];

                if (! empty($variants)) {
                    if (count($variants) > $pack->max_items) {
                        throw ValidationException::withMessages([
                            'packs' => "Maksimal {$pack->max_items} item untuk paket \"{$pack->name}\".",
                        ]);
                    }

                    $requiredStock = [];
                    foreach ($variants as $variant) {
                        $productId = $variant['product_id'];
                        $qty = $variant['quantity'] * $packQty;
                        $requiredStock[$productId] = ($requiredStock[$productId] ?? 0) + $qty;
                    }

                    foreach ($requiredStock as $productId => $required) {
                        $product = Product::lockForUpdate()->findOrFail($productId);
                        if (! $product->is_active || $product->stock < $required) {
                            throw ValidationException::withMessages([
                                'packs' => "Stok tidak mencukupi untuk \"{$product->name}\" (diperlukan: {$required}).",
                            ]);
                        }
                    }

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

                    foreach ($requiredStock as $productId => $required) {
                        $product = Product::lockForUpdate()->findOrFail($productId);
                        $product->decrement('stock', $required);
                    }
                } else {
                    foreach ($pack->packItems as $pi) {
                        $requiredStock = $pi->quantity * $packQty;
                        if (! $pi->product->is_active || $pi->product->stock < $requiredStock) {
                            throw ValidationException::withMessages([
                                'packs' => "Stok tidak mencukupi untuk \"{$pi->product->name}\" (diperlukan: {$requiredStock}).",
                            ]);
                        }
                    }

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

                    foreach ($pack->packItems as $pi) {
                        $pi->product->decrement('stock', $pi->quantity * $packQty);
                    }
                }
            }

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

            $addons = $validated['addons'] ?? [];
            foreach ($addons as $addonItem) {
                $addon = Addon::findOrFail($addonItem['addon_id']);
                $addonQty = $addonItem['quantity'];

                if (! $addon->is_active) {
                    throw ValidationException::withMessages([
                        'addons' => "Addon \"{$addon->name}\" tidak aktif.",
                    ]);
                }
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
            }

            $cash = (float) $validated['cash_tendered'];

            if ($cash < $total) {
                throw ValidationException::withMessages([
                    'cash_tendered' => 'Uang tunai kurang dari total.',
                ]);
            }

            $paymentMethod = $validated['payment_method'] ?? 'cash';

            $totalCirengItems = 0;

            foreach ($validated['items'] ?? [] as $item) {
                $totalCirengItems += $item['quantity'];
            }

            foreach ($validated['packs'] ?? [] as $packItem) {
                $variants = $packItem['variants'] ?? [];
                if (! empty($variants)) {
                    foreach ($variants as $variant) {
                        $totalCirengItems += $variant['quantity'] * $packItem['quantity'];
                    }
                } else {
                    $pack = Pack::findOrFail($packItem['pack_id']);
                    foreach ($pack->packItems as $pi) {
                        $totalCirengItems += $pi->quantity * $packItem['quantity'];
                    }
                }
            }
            
            $cabangId = $request->user()->activeCabangId();
            if (! $cabangId && ! empty($saleItems)) {
                $firstProductId = collect($saleItems)->firstWhere('product_id', '!=', null)['product_id'] ?? null;
                $cabangId = $firstProductId
                    ? \App\Models\Product::find($firstProductId)?->cabang_id
                    : null;
            }
            $sale = Sale::create([
                'user_id'        => $request->user()->id,
                'cabang_id'      => $cabangId,
                'customer_name'  => $validated['customer_name'] ?? null,
                'member_id'      => $validated['member_id'] ?? null,
                'total'          => round($total),
                'cash_tendered'  => $cash,
                'change_amount'  => round($cash - $total),
                'payment_method' => $paymentMethod,
            ]);

            $sale->items()->createMany($saleItems);

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