<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['sale_id', 'product_id', 'product_name', 'unit_price', 'quantity', 'subtotal'])]
class SalesItem extends Model
{
    protected $casts = [
        'total' => 'integer',
        'cash_tendered' => 'integer',
        'change_amount' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(SalesItem::class);
    }
}