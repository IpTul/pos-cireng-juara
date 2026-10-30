<?php

namespace App\Console\Commands;

use App\Models\DailyStockLeftover;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetDailyStock extends Command
{
    protected $signature = 'stock:reset
        {--dry-run : Hanya tampilkan jumlah produk, tanpa mengubah stok}
        {--date= : Tanggal sisa stok yang dicatat (Y-m-d). Default: kemarin jika dijalankan sebelum jam 12, selain itu hari ini}';

    protected $description = 'Catat sisa stok hari itu, lalu reset stok semua produk menjadi 0 (tanpa mencatat di riwayat stok)';

    public function handle(): int
    {
        $query = Product::where('stock', '>', 0);

        if ($this->option('dry-run')) {
            $this->info("[dry-run] {$query->count()} produk akan di-reset ke stok 0.");

            return Command::SUCCESS;
        }

        $date = $this->option('date')
            ?: (now()->hour < 12 ? now()->subDay() : now())->toDateString();

        $count = 0;

        DB::transaction(function () use ($query, $date, &$count) {
            $now = now();

            Product::query()
                ->get(['id', 'stock'])
                ->map(fn ($p) => [
                    'product_id' => $p->id,
                    'date' => $date,
                    'stock' => $p->stock,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
                ->chunk(500)
                ->each(fn ($chunk) => DailyStockLeftover::insertOrIgnore($chunk->all()));

            $count = $query->update(['stock' => 0]);
        });

        $this->info("Sisa stok tanggal {$date} dicatat. Stok di-reset ke 0 untuk {$count} produk.");

        return Command::SUCCESS;
    }
}