<?php

use App\Models\Cabang;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function makeStockAdjustment(Product $product, User $user, string $reason, int $quantity, ?\DateTimeInterface $at = null): StockAdjustment
{
    $type = in_array($reason, ['Stok Awal', 'Tambahan'], true) ? 'increase' : 'decrease';

    $adjustment = StockAdjustment::create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'operator_name' => $user->name,
        'type' => $type,
        'quantity' => $quantity,
        'reason' => $reason,
        'previous_stock' => 0,
        'new_stock' => $quantity,
    ]);

    if ($at) {
        $adjustment->forceFill(['created_at' => $at])->save();
    }

    return $adjustment;
}

beforeEach(function () {
    $this->cabang = Cabang::create(['name' => 'Cabang Kilo 1']);
    $this->owner = User::factory()->create(['role' => 'owner']);
    $this->product = Product::create([
        'cabang_id' => $this->cabang->id,
        'name' => 'Cireng Original',
        'price' => 12000,
        'stock' => 10,
        'is_active' => true,
    ]);
});

test('dashboard memuat ringkasan stok per produk untuk hari ini', function () {
    makeStockAdjustment($this->product, $this->owner, 'Stok Awal', 20);
    makeStockAdjustment($this->product, $this->owner, 'Tambahan', 5);
    makeStockAdjustment($this->product, $this->owner, 'Rusak', 2);
    makeStockAdjustment($this->product, $this->owner, 'Stok Awal', 99, now()->subDays(3));

    $this->actingAs($this->owner)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('stockSummary', 1)
            ->where('stockSummary.0.name', 'Cireng Original')
            ->where('stockSummary.0.stok_awal', 20)
            ->where('stockSummary.0.tambahan', 5)
            ->where('stockSummary.0.rusak', 2)
            ->where('stockSummary.0.stock', 10)
            ->where('stockFilters.period', 'today'));
});

test('periode ringkasan stok di dashboard bisa diganti', function () {
    makeStockAdjustment($this->product, $this->owner, 'Stok Awal', 20);
    makeStockAdjustment($this->product, $this->owner, 'Stok Awal', 99, now()->subDays(3));

    $this->actingAs($this->owner)
        ->get(route('dashboard', ['stok_period' => '7days']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stockSummary.0.stok_awal', 119)
            ->where('stockFilters.period', '7days'));

    $this->actingAs($this->owner)
        ->get(route('dashboard', [
            'stok_period' => 'custom',
            'stok_start' => now()->subDays(4)->toDateString(),
            'stok_end' => now()->subDays(2)->toDateString(),
        ]))
        ->assertInertia(fn (Assert $page) => $page->where('stockSummary.0.stok_awal', 99));
});

test('tanggal custom yang tidak valid tidak membuat dashboard error', function () {
    $this->actingAs($this->owner)
        ->get(route('dashboard', [
            'stok_period' => 'custom',
            'stok_start' => 'bukan-tanggal',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('stockSummary', 1));
});

test('halaman stok tetap memuat ringkasan yang sama', function () {
    makeStockAdjustment($this->product, $this->owner, 'Stok Awal', 20);

    $this->actingAs($this->owner)
        ->get(route('stok.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('stock/index')
            ->where('stockSummary.0.stok_awal', 20));
});