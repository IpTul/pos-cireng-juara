<?php

use App\Models\Cabang;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function makeDashboardSale(User $user, Cabang $cabang, array $overrides = []): Sale
{
    return Sale::create(array_merge([
        'user_id' => $user->id,
        'cabang_id' => $cabang->id,
        'customer_name' => 'arsenal',
        'operator_name' => $user->name,
        'total' => 12000,
        'cash_tendered' => 20000,
        'change_amount' => 8000,
        'payment_method' => 'cash',
        'status' => 'completed',
    ], $overrides));
}

test('dashboard memuat riwayat penjualan hari ini beserta filternya', function () {
    $cabang = Cabang::create(['name' => 'Cabang Kilo 1']);
    $owner = User::factory()->create(['role' => 'owner']);

    makeDashboardSale($owner, $cabang);

    $this->actingAs($owner)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('sales.data', 1)
            ->where('sales.data.0.customer_name', 'arsenal')
            ->where('filters.start_date', now()->toDateString())
            ->where('filters.end_date', now()->toDateString())
            ->where('filters.payment_method', 'all')
            ->has('sideCounts')
            ->has('stats'));
});

test('riwayat di dashboard menghormati filter tanggal dan metode bayar', function () {
    $cabang = Cabang::create(['name' => 'Cabang Kilo 1']);
    $owner = User::factory()->create(['role' => 'owner']);

    makeDashboardSale($owner, $cabang, ['payment_method' => 'qris']);
    makeDashboardSale($owner, $cabang, ['payment_method' => 'cash']);

    $lama = makeDashboardSale($owner, $cabang, ['payment_method' => 'qris']);
    $lama->forceFill(['created_at' => now()->subDays(3)])->save();

    // Default: hanya hari ini (2 transaksi)
    $this->actingAs($owner)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('sales.data', 2));

    // Hanya QRIS hari ini (1 transaksi)
    $this->actingAs($owner)
        ->get(route('dashboard', ['payment_method' => 'qris']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('sales.data', 1)
            ->where('sales.data.0.payment_method', 'qris'));

    // Rentang tanggal lebar mencakup transaksi lama
    $this->actingAs($owner)
        ->get(route('dashboard', [
            'start_date' => now()->subDays(7)->toDateString(),
            'end_date' => now()->toDateString(),
            'payment_method' => 'qris',
        ]))
        ->assertInertia(fn (Assert $page) => $page->has('sales.data', 2));
});

test('halaman riwayat lama tetap berfungsi dengan props yang sama', function () {
    $cabang = Cabang::create(['name' => 'Cabang Kilo 1']);
    $owner = User::factory()->create(['role' => 'owner']);

    makeDashboardSale($owner, $cabang);

    $this->actingAs($owner)
        ->get(route('history.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('history/index')
            ->has('sales.data', 1)
            ->has('sideCounts')
            ->has('filters'));
});