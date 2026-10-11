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
        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->string('operator_name')->nullable()->after('user_id');
        });

        // isi data lama dari user saat ini (sekali jalan)
        DB::statement("
            UPDATE stock_adjustments sa
            JOIN users u ON u.id = sa.user_id
            SET sa.operator_name = COALESCE(u.operator_name, u.name)
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->dropColumn('operator_name');
        });
    }
};
