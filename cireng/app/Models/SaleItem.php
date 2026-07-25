<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'total',
    'cash_tendered',
    'change_amount',
    'status',
    'notes',
])]
class SaleItem extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}