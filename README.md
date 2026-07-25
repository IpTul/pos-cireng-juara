# Cireng Juara

Aplikasi Point of Sale (POS) sederhana untuk bisnis cireng, dibangun menggunakan Laravel, Inertia, React, dan Tailwind CSS.

## Fitur

- Manajemen produk (tambah, edit, hapus)
- Tampilan harga dalam format Rupiah
- Antarmuka kasir untuk transaksi penjualan
- Dashboard berbasis React dengan Inertia.js

## Tech Stack

- **Backend:** Laravel
- **Frontend:** React + Inertia.js
- **Styling:** Tailwind CSS
- **Database:** MySQL / SQLite (sesuai konfigurasi `.env`)

## Instalasi

1. Clone repository ini
   ```bash
   git clone https://github.com/IpTul/pos-cireng-juara.git
   cd pos-cireng-juara
   ```

2. Install dependency PHP
   ```bash
   composer install
   ```

3. Install dependency Node.js
   ```bash
   npm install
   ```

4. Salin file environment dan generate key
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. Sesuaikan konfigurasi database di `.env`, lalu jalankan migrasi
   ```bash
   php artisan migrate
   ```

6. Jalankan development server
   ```bash
   composer run dev
   ```
   atau jalankan Laravel dan Vite secara terpisah:
   ```bash
   php artisan serve
   npm run dev
   ```

## Lisensi

Proyek ini dibuat untuk keperluan pribadi/bisnis Cireng Juara.
