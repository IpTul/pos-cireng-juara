<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pengeluaran yang diambil dari uang tunai kasir (mis. beli gas).
 */
#[Fillable(['cabang_id', 'user_id', 'operator_name', 'description', 'amount'])]
class Expense extends Model
{
    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}