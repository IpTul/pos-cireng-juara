<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\SaleHistoryController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinancialReportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PackController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\AddonController;
use App\Http\Controllers\MemberController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])
        ->name('dashboard')
        ->middleware('role:owner,kasir');

    Route::resource('pack', PackController::class)->except(['create', 'show', 'edit']);
    Route::resource('products', ProductController::class)->except(['create', 'show', 'edit']);
    Route::resource('categories', CategoryController::class)->except(['create', 'show', 'edit']);

    Route::get('pos', [PosController::class, 'index'])
        ->name('pos.index')
        ->middleware('role:owner,kasir');

    Route::get('/history', [SaleHistoryController::class, 'index'])->name('history.index');
    Route::get('/history/export-data', [SaleHistoryController::class, 'exportData'])->name('history.export-data');

    Route::post('checkout', [CheckoutController::class, 'store'])->name('checkout');
    Route::get('receipt/{sale}', [CheckoutController::class, 'receipt'])->name('receipt');

    Route::get('/keuangan', [FinancialReportController::class, 'index'])
        ->middleware('role:owner')
        ->name('keuangan.index');

    Route::prefix('stok')->middleware('role:owner,kasir')->group(function () {
        Route::get('/', [StockAdjustmentController::class, 'index'])->name('stok.index');
        Route::post('/', [StockAdjustmentController::class, 'store'])->name('stok.store');
    });

    Route::resource('users', UserController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('role:owner');

    Route::resource('addons', AddonController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('role:owner,kasir');

    Route::resource('members', MemberController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->middleware('role:owner,kasir');

    Route::get('members/search', [MemberController::class, 'search'])
        ->middleware('role:owner,kasir')
        ->name('members.search');
});

require __DIR__.'/settings.php';
