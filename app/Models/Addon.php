<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Addon extends Model
{
    protected $fillable = [
        'name',
        'description',
        'price',
        'is_active',
        'cabang_id',
    ];

    protected $casts = [
        'price' => 'integer',
        'is_active' => 'boolean',
    ];

    public function cabang(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Cabang::class);
    }
}