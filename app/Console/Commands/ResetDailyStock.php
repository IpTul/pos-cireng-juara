<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class ResetDailyStock extends Command
{
    protected $signature = 'stock:reset {--dry-run : Hanya tampilkan jumlah produk, tanpa mengubah stok}';

    protected $description = 'Reset stok semua produk menjadi 0 (tanpa mencatat di riwayat stok)';

    public function handle(): int
    {
        $query = Product::where('stock', '>', 0);

        if ($this->option('dry-run')) {
            $this->info("[dry-run] {$query->count()} produk akan di-reset ke stok 0.");

            return Command::SUCCESS;
        }

        // Satu query UPDATE: atomik, dan tidak menulis apa pun ke riwayat stok
        $count = $query->update(['stock' => 0]);

        $this->info("Stok di-reset ke 0 untuk {$count} produk.");

        return Command::SUCCESS;
    }
}