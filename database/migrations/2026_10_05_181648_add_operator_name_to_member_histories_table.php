<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_histories', function (Blueprint $table) {
            $table->string('operator_name')->nullable()->after('user_id');
        });

        // Isi riwayat lama dengan nama operator saat ini.
        // Nama lama sebelum diganti tidak bisa dipulihkan.
        DB::table('member_histories')
            ->whereNotNull('user_id')
            ->orderBy('id')
            ->each(function ($history) {
                $user = DB::table('users')->where('id', $history->user_id)->first();

                if ($user) {
                    DB::table('member_histories')
                        ->where('id', $history->id)
                        ->update(['operator_name' => $user->operator_name ?: $user->name]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('member_histories', function (Blueprint $table) {
            $table->dropColumn('operator_name');
        });
    }
};