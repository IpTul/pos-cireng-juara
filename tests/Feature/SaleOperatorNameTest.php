<?php

use App\Models\Cabang;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->cabang = Cabang::create(['name' => 'Cabang Kilo 1']);
    $this->product = Product::create([
        'cabang_id' => $this->cabang->id,
        'name' => 'Cireng Original',
        'price' => 12000,
        'stock' => 50,
        'is_active' => true,
    ]);
});

function operatorCheckoutPayload(int $productId): array
{
    return [
        'customer_name' => 'arsenal',
        'items' => [['product_id' => $productId, 'quantity' => 1]],
        'cash_tendered' => 12000,
        'payment_method' => 'cash',
    ];
}

test('transaksi kasir menyimpan operator_name dari session', function () {
    $kasir = User::factory()->create(['role' => 'kasir', 'cabang_id' => $this->cabang->id]);

    $this->actingAs($kasir)
        ->withSession(['operator_name' => 'Iptul'])
        ->post(route('checkout'), operatorCheckoutPayload($this->product->id));

    expect(Sale::first()->operator_name)->toBe('Iptul');
});

test('transaksi owner memakai nama akun sebagai operator_name', function () {
    $owner = User::factory()->create(['role' => 'owner']);

    $this->actingAs($owner)
        ->post(route('checkout'), operatorCheckoutPayload($this->product->id));

    expect(Sale::first()->operator_name)->toBe($owner->name);
});

test('riwayat mengekspos operator_name pada prop sale', function () {
    $kasir = User::factory()->create(['role' => 'kasir', 'cabang_id' => $this->cabang->id]);

    $this->actingAs($kasir)
        ->withSession(['operator_name' => 'Iptul'])
        ->post(route('checkout'), operatorCheckoutPayload($this->product->id));

    $this->actingAs($kasir)
        ->get(route('history.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('history/index')
            ->where('saleItems.data.0.sale.operator_name', 'Iptul')
        );
});
