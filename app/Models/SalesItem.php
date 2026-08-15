<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['sale_id', 'product_id', 'pack_id', 'product_name', 'unit_price', 'quantity', 'subtotal', 'is_free'])]
class SalesItem extends Model
{
    protected $table = 'sales_items';

    public function sale() : BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product() : BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function pack() : BelongsTo
    {
        return $this->belongsTo(Pack::class);
    }
}