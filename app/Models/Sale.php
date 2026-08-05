<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'total',
    'cash_tendered',
    'change_amount',
    'status',
    'notes',
])]
class Sale extends Model
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
