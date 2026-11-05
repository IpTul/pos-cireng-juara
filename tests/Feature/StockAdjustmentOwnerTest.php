<?php

use App\Models\Cabang;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $cabang = Cabang::create(['name' => 'Cabang Kilo 1']);
    $this->owner = User::factory()->create(['role' => 'owner']);
    $this->product = Product::create([
        'cabang_id' => $cabang->id, 'name' => 'Cireng Original', 'price' => 12000, 'stock' => 20, 'is_active' => true,
    ]);
    $this->adjustment = StockAdjustment::create([
        'product_id' => $this->product->id, 'user_id' => $this->owner->id, 'operator_name' => 'Owner',
        'type' => 'increase', 'quantity' => 20, 'reason' => 'Stok Awal', 'previous_stock' => 0, 'new_stock' => 20,
    ]);
});

test('owner bisa mengedit riwayat stok dan stok produk ikut menyesuaikan', function () {
    $this->actingAs($this->owner)
        ->put(route('stok.update', $this->adjustment), ['type' => 'increase', 'quantity' => 25, 'reason' => 'Tambahan'])
        ->assertSessionHasNoErrors();

    expect($this->product->fresh()->stock)->toBe(25)
        ->and($this->adjustment->fresh()->quantity)->toBe(25)
        ->and($this->adjustment->fresh()->edited_by)->not->toBeNull();
});

test('owner bisa menghapus riwayat stok dan stok dikembalikan', function () {
    $this->product->update(['stock' => 30]);

    $this->actingAs($this->owner)->delete(route('stok.destroy', $this->adjustment))->assertSessionHasNoErrors();

    expect(StockAdjustment::count())->toBe(0)->and($this->product->fresh()->stock)->toBe(10);
});

test('kasir tidak bisa mengedit atau menghapus riwayat stok', function () {
    $kasir = User::factory()->create(['role' => 'kasir', 'cabang_id' => $this->product->cabang_id]);

    $this->actingAs($kasir)->withSession(['operator_name' => 'Iptul'])
        ->delete(route('stok.destroy', $this->adjustment));

    expect(StockAdjustment::count())->toBe(1);
});