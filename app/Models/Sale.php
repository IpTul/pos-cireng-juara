<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'cabang_id',
    'customer_name',
    'member_id',
    'operator_name',
    'total',
    'cash_tendered',
    'change_amount',
    'payment_method',
    'status',
    'notes',
])]
class Sale extends Model
{
    protected $casts = [
        'total' => 'integer',
        'cash_tendered' => 'integer',
        'change_amount' => 'integer',
        'payment_method' => 'string',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(SalesItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function cabang(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Cabang::class);
    }
}
