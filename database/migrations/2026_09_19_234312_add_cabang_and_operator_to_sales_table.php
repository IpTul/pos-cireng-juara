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
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('cabang_id')
                ->nullable()
                ->after('user_id')
                ->constrained('cabangs')
                ->nullOnDelete();
            // Nama operator yang login saat transaksi ini dibuat (Iptul/Amir/dst) —
            // beda dari user_id (akun login), karena 1 akun bisa dipakai gantian orang.
            $table->string('operator_name')->nullable()->after('cabang_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['cabang_id']);
            $table->dropColumn(['cabang_id', 'operator_name']);
        });
    }
};
