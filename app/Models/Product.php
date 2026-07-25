<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\relations\BelongsTo;

#[Fillable([
    'category_id',
    'name',
    'description',
    'price',
    'stock',
    'image',
    'is_active',
])]
class Product extends Model
{
    public function casts(): array
    {
        return [
            'price' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
