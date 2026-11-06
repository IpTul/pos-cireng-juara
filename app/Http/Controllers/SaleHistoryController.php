<?php

namespace App\Http\Controllers;

use App\Concerns\BuildsSaleHistory;
use App\Models\Addon;
use App\Models\Cabang;
use App\Models\Member;
use App\Models\Pack;
use App\Models\Product;
use App\Models\Sale;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SaleHistoryController extends Controller
{
    use BuildsSaleHistory;

    /**
     * Display a listing of the sale history.
     *
     * @return Response
     */
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

    private function combineSaleItems(Collection $sales): Collection
    {
        return $sales->flatMap(function ($sale) {
            $items = $sale->items;
            $paidItems = $items->where('is_free', false);
            $freeItems = $items->where('is_free', true);

            $combined = $paidItems->map(function ($paidItem) use ($freeItems, $paidItems, $sale) {
                $relatedFree = $freeItems->where('product_id', $paidItem->product_id);

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
                        'customer_name' => $sale->customer_name,
                        'member_id' => $sale->member_id,
                        'member' => $sale->member ? [
                            'id' => $sale->member->id,
                            'name' => $sale->member->name,
                            'phone' => $sale->member->phone,
                            'points' => $sale->member->points,
                        ] : null,
                        'total' => $sale->total,
                        'cash_tendered' => $sale->cash_tendered,
                        'change_amount' => $sale->change_amount,
                        'payment_method' => $sale->payment_method ?? 'cash',
                        'status' => $sale->status,
                        'created_at' => $sale->created_at,
                        'operator_name' => $sale->operator_name,
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

            if ($paidItems->isEmpty() && $freeItems->isNotEmpty()) {
                $combined = $combined->merge($freeItems->map(function ($freeItem) use ($sale) {
                    return [
                        'id' => $freeItem->id,
                        'sale' => [
                            'id' => $sale->id,
                            'customer_name' => $sale->customer_name,
                            'member_id' => $sale->member_id,
                            'member' => $sale->member ? [
                                'id' => $sale->member->id,
                                'name' => $sale->member->name,
                                'phone' => $sale->member->phone,
                                'points' => $sale->member->points,
                            ] : null,
                            'total' => $sale->total,
                            'cash_tendered' => $sale->cash_tendered,
                            'change_amount' => $sale->change_amount,
                            'payment_method' => $sale->payment_method ?? 'cash',
                            'status' => $sale->status,
                            'created_at' => $sale->created_at,
                            'operator_name' => $sale->operator_name,
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
        })->values();
    }

    public function index(Request $request)
    {
        return Inertia::render('history/index', [
            ...$this->saleHistoryProps($request),
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ],
        ]);
    }

    public function exportData(Request $request)
    {
        $this->authorizeOwnerOnly();

        $sales = $this->baseSalesQuery($request)->get();

        $saleItems = $this->combineSaleItems($sales);

        return response()->json($saleItems->values());
    }

    public function edit(Sale $sale)
    {
        $this->authorizeCanEdit($sale);

        $sale->load([
            'items.product.cabang',
            'items.pack.packItems.product',
            'items.addon',
            'member',
            'cabang',
            'user',
        ]);

        $activeCabangId = $this->user->activeCabangId();

        $products = Product::with('cabang')
            ->where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->orderBy('name')
            ->get();

        $packs = Pack::with(['packItems.product'])
            ->where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->get()
            ->filter(fn ($pack) => $pack->packItems->contains(
                fn ($item) => $item->product?->is_active
            ))
            ->values();

        $addons = Addon::where('is_active', true)
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->orderBy('name')
            ->get();

        $members = Member::active()->orderBy('name')->get(['id', 'name', 'phone', 'points']);

        $cabangs = Cabang::orderBy('name')->get(['id', 'name']);

        $formattedItems = $sale->items->map(function ($item) {
            return [
                'id' => $item->id,
                'type' => $item->pack_id ? 'pack' : ($item->addon_id ? 'addon' : 'product'),
                'product_id' => $item->product_id,
                'pack_id' => $item->pack_id,
                'addon_id' => $item->addon_id,
                'product_name' => $item->product_name,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'subtotal' => $item->subtotal,
                'is_free' => (bool) $item->is_free,
                'pack_variants' => $item->pack_variants ?? [],
            ];
        })->values();

        return Inertia::render('history/edit', [
            'sale' => [
                'id' => $sale->id,
                'customer_name' => $sale->customer_name,
                'member_id' => $sale->member_id,
                'member' => $sale->member ? [
                    'id' => $sale->member->id,
                    'name' => $sale->member->name,
                    'phone' => $sale->member->phone,
                    'points' => $sale->member->points,
                ] : null,
                'total' => $sale->total,
                'cash_tendered' => $sale->cash_tendered,
                'change_amount' => $sale->change_amount,
                'payment_method' => $sale->payment_method ?? 'cash',
                'status' => $sale->status,
                'notes' => $sale->notes,
                'operator_name' => $sale->operator_name,
                'cabang_id' => $sale->cabang_id,
                'created_at' => $sale->created_at,
                // Transaksi hari stok lama tidak mengubah stok saat diedit
                'affects_stock' => $sale->created_at->gte($this->stockWindowStart()),
                'items' => $formattedItems,
            ],
            'products' => $products,
            'packs' => $packs,
            'addons' => $addons,
            'members' => $members,
            'cabangs' => $cabangs,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'role' => $this->user->role,
            ],
            'canEditAll' => $this->user->isOwner(),
        ]);
    }

    public function update(Request $request, Sale $sale)
    {
        $this->authorizeCanEdit($sale);

        $isOwner = $this->user->isOwner();

        $rules = [
            'payment_method' => ['required', 'string', 'in:cash,qris,grab,gofood'],
            'cash_tendered' => ['nullable', 'integer', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.type' => ['required', 'in:product,pack,addon'],
            'items.*.product_id' => ['required_if:items.*.type,product', 'nullable', 'exists:products,id'],
            'items.*.pack_id' => ['required_if:items.*.type,pack', 'nullable', 'exists:packs,id'],
            'items.*.addon_id' => ['required_if:items.*.type,addon', 'nullable', 'exists:addons,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'items.*.unit_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'items.*.is_free' => ['sometimes', 'boolean'],
            'items.*.pack_variants' => ['sometimes', 'nullable', 'array'],
            'items.*.pack_variants.*.product_id' => ['required', 'exists:products,id'],
            'items.*.pack_variants.*.quantity' => ['required', 'integer', 'min:1'],
        ];

        if ($isOwner) {
            $rules += [
                'customer_name' => ['sometimes', 'nullable', 'string', 'max:255'],
                'member_id' => ['sometimes', 'nullable', 'integer', 'exists:members,id'],
                'notes' => ['sometimes', 'nullable', 'string'],
                'status' => ['sometimes', 'string', 'in:completed,pending,cancelled'],
                'cabang_id' => ['sometimes', 'nullable', 'integer', 'exists:cabangs,id'],
            ];
        } elseif ($request->hasAny(['customer_name', 'member_id', 'notes', 'status', 'cabang_id'])) {
            abort(403, 'Kasir hanya boleh mengedit metode pembayaran, produk, dan quantity.');
        }

        $validated = $request->validate($rules);

        DB::transaction(function () use ($sale, $validated, $isOwner) {
            $sale = Sale::with('items')->lockForUpdate()->findOrFail($sale->id);
            $oldItems = $sale->items->keyBy('id');

            // Kasir: tidak boleh tambah / hapus baris
            if (! $isOwner) {
                $submitted = collect($validated['items'])->pluck('id')->filter()->map(fn ($v) => (int) $v)->sort()->values()->all();
                $existing = $oldItems->keys()->map(fn ($v) => (int) $v)->sort()->values()->all();
                if (count($validated['items']) !== count($existing) || $submitted !== $existing) {
                    abort(403, 'Kasir tidak boleh menambah atau menghapus item.');
                }
            }

            // Stok hanya disesuaikan untuk transaksi pada "hari stok" berjalan (reset 07.00)
            $touchStock = $sale->created_at->gte($this->stockWindowStart());
            $oldCount = $this->cirengCount($sale->items);
            $oldMemberId = $sale->member_id;

            if ($touchStock) {
                $this->restoreStock($sale);
            }

            $total = 0;
            $saleItems = [];

            foreach ($validated['items'] as $itemData) {
                $original = null;
                if (! empty($itemData['id'])) {
                    $original = $oldItems->get((int) $itemData['id']);
                    if (! $original) {
                        throw ValidationException::withMessages(['items' => 'Item tidak termasuk transaksi ini.']);
                    }
                }

                if (! $isOwner) {
                    // Kasir hanya boleh ganti produk & qty: harga, gratis, isi paket, dan tipe baris dikunci
                    $originalType = $original->pack_id ? 'pack' : ($original->addon_id ? 'addon' : 'product');
                    if ($itemData['type'] !== $originalType) {
                        abort(403, 'Tipe item tidak boleh diubah.');
                    }
                    unset($itemData['unit_price']);
                    $itemData['is_free'] = (bool) $original->is_free;
                    if ($originalType === 'pack') {
                        $itemData['pack_id'] = $original->pack_id;
                        $itemData['pack_variants'] = $original->pack_variants ?? [];
                    }
                    if ($originalType === 'addon') {
                        $itemData['addon_id'] = $original->addon_id;
                    }
                }

                $result = $this->processSaleItem($itemData, $isOwner, $touchStock, $sale->cabang_id, $original);
                $total += $result['subtotal'];
                $saleItems[] = $result['saleItem'];
            }

            if ($isOwner) {
                if (array_key_exists('customer_name', $validated) && filled($validated['customer_name'])) {
                    $sale->customer_name = $validated['customer_name'];
                }
                if (array_key_exists('member_id', $validated)) {
                    $sale->member_id = $validated['member_id'];
                }
                if (array_key_exists('notes', $validated)) {
                    $sale->notes = $validated['notes'];
                }
                if (isset($validated['status'])) {
                    $sale->status = $validated['status'];
                }
                if (! empty($validated['cabang_id'])) {
                    $sale->cabang_id = $validated['cabang_id'];
                }
            }

            $total = (int) round($total);
            $sale->payment_method = $validated['payment_method'];

            if ($sale->payment_method === 'cash') {
                $cash = (int) ($validated['cash_tendered'] ?? $total);
                if ($cash < $total) {
                    throw ValidationException::withMessages(['cash_tendered' => 'Uang tunai kurang dari total.']);
                }
                $sale->cash_tendered = $cash;
                $sale->change_amount = $cash - $total;
            } else {
                $sale->cash_tendered = $total;
                $sale->change_amount = 0;
            }

            $sale->total = $total;
            // operator_name sengaja tidak diubah: tetap kasir yang membuat transaksi
            $sale->save();

            $sale->items()->delete();
            $sale->items()->createMany($saleItems);

            // Poin member mengikuti selisih jumlah cireng, bukan ditambah ulang
            $newCount = $this->cirengCount($sale->items()->get());
            if ($oldMemberId === $sale->member_id) {
                $this->adjustMemberPoints($sale->member_id, $newCount - $oldCount);
            } else {
                $this->adjustMemberPoints($oldMemberId, -$oldCount);
                $this->adjustMemberPoints($sale->member_id, $newCount);
            }
        });

        return redirect()->route('history.index')->with('success', 'Transaksi berhasil diperbarui.');
    }

    private function authorizeCanEdit(Sale $sale): void
    {
        if (! $this->user?->inRole(['owner', 'kasir'])) {
            abort(403, 'Akses ditolak.');
        }

        if ($sale->status !== 'completed') {
            abort(403, 'Hanya transaksi dengan status completed yang bisa diedit.');
        }

        $activeCabangId = $this->user->activeCabangId();

        if ($this->user->isKasir()) {
            if ($this->user->cabang_id === null || $sale->cabang_id !== $this->user->cabang_id) {
                abort(403, 'Transaksi ini bukan milik cabang kamu.');
            }
        } elseif ($activeCabangId && $sale->cabang_id !== $activeCabangId) {
            abort(403, 'Transaksi ini bukan milik cabang aktif.');
        }
    }

    private function stockWindowStart(): CarbonInterface
    {
        $now = now('Asia/Makassar');
        $start = $now->copy()->setTime(7, 0);

        return $now->lt($start) ? $start->subDay() : $start;
    }

    private function cirengCount(Collection $items): int
    {
        return (int) $items->where('is_free', false)->whereNull('addon_id')->sum(function ($item) {
            if ($item->pack_id) {
                $perPack = collect($item->pack_variants ?? [])->sum('quantity');

                return ($perPack > 0 ? $perPack : 1) * $item->quantity;
            }

            return $item->quantity;
        });
    }

    private function adjustMemberPoints(?int $memberId, int $delta): void
    {
        if (! $memberId || $delta === 0) {
            return;
        }

        $member = Member::lockForUpdate()->find($memberId);
        if ($member && ! $member->is_deleted) {
            $member->points = max(0, $member->points + $delta);
            $member->save();
        }
    }

    private function restoreStock(Sale $sale): void
    {
        foreach ($sale->items as $item) {
            // Item gratis ikut mengurangi stok saat checkout, jadi ikut dikembalikan
            if ($item->addon_id) {
                continue;
            }

            if ($item->product_id) {
                Product::lockForUpdate()->find($item->product_id)?->increment('stock', $item->quantity);
            } elseif ($item->pack_id) {
                $variants = $item->pack_variants ?? [];
                if (! empty($variants)) {
                    foreach ($variants as $variant) {
                        Product::lockForUpdate()->find($variant['product_id'])
                            ?->increment('stock', $variant['quantity'] * $item->quantity);
                    }
                } else {
                    $pack = Pack::with('packItems.product')->find($item->pack_id);
                    foreach ($pack?->packItems ?? [] as $pi) {
                        $pi->product?->increment('stock', $pi->quantity * $item->quantity);
                    }
                }
            }
        }
    }

    private function processSaleItem(array $itemData, bool $isOwner, bool $touchStock, ?int $saleCabangId, $original = null): array
    {
        $type = $itemData['type'];
        $quantity = (int) $itemData['quantity'];
        $isFree = (bool) ($itemData['is_free'] ?? false);

        if ($type === 'product') {
            $product = Product::lockForUpdate()->findOrFail($itemData['product_id']);

            if ($saleCabangId && $product->cabang_id !== $saleCabangId) {
                throw ValidationException::withMessages(['items' => "Produk \"{$product->name}\" bukan dari cabang transaksi ini."]);
            }
            $unchanged = $original && (int) $original->product_id === (int) $product->id;
            if (! $unchanged && ! $product->is_active) {
                throw ValidationException::withMessages(['items' => "Produk \"{$product->name}\" tidak aktif."]);
            }
            if ($touchStock && $product->stock < $quantity) {
                throw ValidationException::withMessages(['items' => "Stok tidak mencukupi untuk \"{$product->name}\" (diperlukan: {$quantity}, tersedia: {$product->stock})."]);
            }

            // Harga: owner bisa override; selain itu pakai harga historis bila produk tidak diganti
            if ($isOwner && isset($itemData['unit_price'])) {
                $price = (int) $itemData['unit_price'];
            } elseif ($unchanged) {
                $price = (int) $original->unit_price;
            } else {
                $price = (int) $product->price;
            }
            $price = $isFree ? 0 : $price;
            $subtotal = $price * $quantity;

            if ($touchStock) {
                $product->decrement('stock', $quantity);
            }

            return [
                'subtotal' => $subtotal,
                'saleItem' => [
                    'product_id' => $product->id,
                    'pack_id' => null,
                    'addon_id' => null,
                    'product_name' => $isFree ? "[GRATIS] {$product->name}" : $product->name,
                    'unit_price' => $price,
                    'quantity' => $quantity,
                    'subtotal' => $subtotal,
                    'is_free' => $isFree,
                ],
            ];
        }

        if ($type === 'pack') {
            $pack = Pack::with('packItems.product')->findOrFail($itemData['pack_id']);

            $variants = ! empty($itemData['pack_variants'])
                ? collect($itemData['pack_variants'])->map(fn ($v) => [
                    'product_id' => (int) $v['product_id'],
                    'name' => $v['name'] ?? (Product::find($v['product_id'])?->name ?? '-'),
                    'quantity' => (int) $v['quantity'],
                ])->values()->all()
                : $pack->packItems->map(fn ($pi) => [
                    'product_id' => $pi->product_id,
                    'name' => $pi->product->name,
                    'quantity' => $pi->quantity,
                ])->values()->all();

            if ($touchStock) {
                $required = [];
                foreach ($variants as $v) {
                    $required[$v['product_id']] = ($required[$v['product_id']] ?? 0) + $v['quantity'] * $quantity;
                }
                foreach ($required as $productId => $need) {
                    $product = Product::lockForUpdate()->findOrFail($productId);
                    if ($product->stock < $need) {
                        throw ValidationException::withMessages(['items' => "Stok tidak mencukupi untuk \"{$product->name}\" (diperlukan: {$need}, tersedia: {$product->stock})."]);
                    }
                    $product->decrement('stock', $need);
                }
            }

            $price = $isOwner && isset($itemData['unit_price'])
                ? (int) $itemData['unit_price']
                : ($original ? (int) $original->unit_price : (int) $pack->price);

            return [
                'subtotal' => $price * $quantity,
                'saleItem' => [
                    'product_id' => null,
                    'pack_id' => $pack->id,
                    'addon_id' => null,
                    'product_name' => "[Paket] {$pack->name}",
                    'pack_variants' => $variants,
                    'unit_price' => $price,
                    'quantity' => $quantity,
                    'subtotal' => $price * $quantity,
                    'is_free' => false,
                ],
            ];
        }

        $addon = Addon::findOrFail($itemData['addon_id']);
        $unchanged = $original && (int) $original->addon_id === (int) $addon->id;
        if (! $unchanged && ! $addon->is_active) {
            throw ValidationException::withMessages(['items' => "Addon \"{$addon->name}\" tidak aktif."]);
        }

        if ($isOwner && isset($itemData['unit_price'])) {
            $price = (int) $itemData['unit_price'];
        } else {
            $price = $unchanged ? (int) $original->unit_price : (int) $addon->price;
        }

        return [
            'subtotal' => $price * $quantity,
            'saleItem' => [
                'product_id' => null,
                'pack_id' => null,
                'addon_id' => $addon->id,
                'product_name' => "[ADDON] {$addon->name}",
                'unit_price' => $price,
                'quantity' => $quantity,
                'subtotal' => $price * $quantity,
                'is_free' => false,
            ],
        ];
    }
}