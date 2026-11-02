<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\relations\BelongsTo;

#[Fillable([
    'cabang_id',
    'name',
    'description',
    'price',
    'stock',
    'image',
    'is_active',
])]
class Product extends Model
{
    /**
     * Produk pelengkap (bukan cireng). Dicocokkan dengan nama, tidak peka huruf besar/kecil.
     * Stoknya tidak di-nol-kan saat reset harian, dan tidak dicatat sebagai sisa stok.
     */
    public const SIDE_NAMES = ['kuah creamy juara', 'chili oil juara', 'mentai juara'];

    /** Stok yang diisi ulang untuk produk pelengkap setiap reset harian. */
    public const SIDE_DAILY_STOCK = 1000;

    public function casts(): array
    {
        return [
            'price' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class);
    }

    /** Hanya Kuah Creamy, Chili Oil, dan Mentai. */
    public function scopeSide(Builder $query): Builder
    {
        $placeholders = implode(',', array_fill(0, count(self::SIDE_NAMES), '?'));

        return $query->whereRaw("LOWER(TRIM(products.name)) IN ({$placeholders})", self::SIDE_NAMES);
    }

    /** Semua produk kecuali Kuah Creamy, Chili Oil, dan Mentai. */
    public function scopeNonSide(Builder $query): Builder
    {
        $placeholders = implode(',', array_fill(0, count(self::SIDE_NAMES), '?'));

        return $query->whereRaw("LOWER(TRIM(products.name)) NOT IN ({$placeholders})", self::SIDE_NAMES);
    }

    public function isSide(): bool
    {
        return in_array(mb_strtolower(trim($this->name)), self::SIDE_NAMES, true);
    }
}