<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

#[Fillable([
    'name',
    'phone',
    'points',
    'last_purchase_at',
    'is_deleted',
    'cabang_id',
])]
class Member extends Model
{
    protected $casts = [
        'points' => 'integer',
        'last_purchase_at' => 'datetime',
        'is_deleted' => 'boolean',
    ];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_deleted', false);
    }

    public function scopeInactive3Months(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->where('last_purchase_at', '<', Carbon::now()->subMonths(3))
              ->orWhere(function ($q2) {
                  $q2->whereNull('last_purchase_at')
                     ->where('created_at', '<', Carbon::now()->subMonths(3));
              });
        })->where('is_deleted', false);
    }

    public function scopeInactive6Months(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->where('last_purchase_at', '<', Carbon::now()->subMonths(6))
              ->orWhere(function ($q2) {
                  $q2->whereNull('last_purchase_at')
                     ->where('created_at', '<', Carbon::now()->subMonths(6));
              });
        })->where('is_deleted', false);
    }

    public function addPoints(int $count): void
    {
        $this->increment('points', $count);
    }

    public function resetPoints(): void
    {
        $this->points = 0;
        $this->save();
    }

    public function updateLastPurchase(): void
    {
        $this->last_purchase_at = Carbon::now();
        $this->save();
    }

    public function softDelete(): void
    {
        $this->is_deleted = true;
        $this->points = 0;
        $this->save();
    }

    public function cabang(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Cabang::class);
    }
}