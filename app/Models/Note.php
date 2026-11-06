<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'author_name', 'title', 'body', 'color', 'is_pinned'])]
class Note extends Model
{
    public const COLORS = ['default', 'yellow', 'green', 'blue', 'pink', 'orange'];

    protected function casts(): array
    {
        return ['is_pinned' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}