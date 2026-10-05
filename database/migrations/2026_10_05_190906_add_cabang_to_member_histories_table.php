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
            $table->foreignId('cabang_id')->nullable()->after('operator_name')
                ->constrained('cabangs')->nullOnDelete();
            $table->string('cabang_name')->nullable()->after('cabang_id');
        });

        // Isi riwayat lama dengan cabang kasir saat ini (perkiraan terbaik,
        // karena cabang asli saat member dibuat tidak tercatat sebelumnya).
        DB::table('member_histories')
            ->whereNotNull('user_id')
            ->orderBy('id')
            ->each(function ($history) {
                $row = DB::table('users')
                    ->join('cabangs', 'cabangs.id', '=', 'users.cabang_id')
                    ->where('users.id', $history->user_id)
                    ->select('cabangs.id as cabang_id', 'cabangs.name as cabang_name')
                    ->first();

                if ($row) {
                    DB::table('member_histories')
                        ->where('id', $history->id)
                        ->update([
                            'cabang_id' => $row->cabang_id,
                            'cabang_name' => $row->cabang_name,
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('member_histories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cabang_id');
            $table->dropColumn('cabang_name');
        });
    }
};