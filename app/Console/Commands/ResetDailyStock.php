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

    protected $description = 'Catat sisa stok hari itu, reset stok produk menjadi 0, dan isi ulang Kuah Creamy/Chili Oil/Mentai ke 1000 (tanpa mencatat di riwayat stok)';

    public function handle(): int
    {
        if ($this->option('dry-run')) {
            $resetCount = Product::nonSide()->where('stock', '>', 0)->count();
            $sideCount = Product::side()->where('stock', '!=', Product::SIDE_DAILY_STOCK)->count();

            $this->info("[dry-run] {$resetCount} produk akan di-reset ke stok 0.");
            $this->info("[dry-run] {$sideCount} produk pelengkap (kuah/saus) akan diisi ulang ke " . Product::SIDE_DAILY_STOCK . '.');

            return Command::SUCCESS;
        }

        $date = $this->option('date')
            ?: (now()->hour < 12 ? now()->subDay() : now())->toDateString();

        $resetCount = 0;
        $sideCount = 0;

        DB::transaction(function () use ($date, &$resetCount, &$sideCount) {
            $now = now();

            // Catat sisa stok sebelum di-reset. Kuah Creamy, Chili Oil, dan Mentai tidak dicatat
            Product::nonSide()
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

            // Produk biasa: reset ke 0
            $resetCount = Product::nonSide()->where('stock', '>', 0)->update(['stock' => 0]);

            // Kuah Creamy, Chili Oil, Mentai: diisi ulang ke 1000
            $sideCount = Product::side()
                ->where('stock', '!=', Product::SIDE_DAILY_STOCK)
                ->update(['stock' => Product::SIDE_DAILY_STOCK]);
        });

        $this->info("Sisa stok tanggal {$date} dicatat (tanpa kuah/saus).");
        $this->info("Stok di-reset ke 0 untuk {$resetCount} produk; kuah/saus diisi ulang ke " . Product::SIDE_DAILY_STOCK . " untuk {$sideCount} produk.");

        return Command::SUCCESS;
    }
}