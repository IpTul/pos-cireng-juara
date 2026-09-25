<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'description',
    'price',
    'image',
    'is_active',
    'max_items',
    'cabang_id',
])]
class Pack extends Model
{
    public function casts(): array
    {
        return [
            'price' => 'integer',
            'is_active' => 'boolean',
            'max_items' => 'integer',
        ];
    }

    public function packItems(): HasMany
    {
        return $this->hasMany(PackItem::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'pack_items')
            ->withPivot('quantity')
            ->withTimestamps();
    }

    public function cabang(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Cabang::class);
    }
}