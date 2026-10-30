<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('daily_stock_leftovers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->integer('stock');
            $table->timestamps();
    
            $table->unique(['product_id', 'date']);
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('daily_stock_leftovers');
    }
};
