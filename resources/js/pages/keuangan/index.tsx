import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  TrendingUp,
  Receipt,
  Wallet,
  Printer,
  FileSpreadsheet,
  Banknote,
  QrCode,
  Bike,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';

interface TopItem {
  name: string;
  type: 'produk' | 'paket';
  total_qty: number;
  total_revenue: number;
}

interface PaymentTotal {
  method: string;
  label: string;
  revenue: number;
  transactions: number;
}

const PAYMENT_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  qris: QrCode,
  grab: Bike,
  gofood: Bike,
};

const METHODS = [
  { key: 'cash', label: 'Tunai' },
  { key: 'qris', label: 'QRIS' },
  { key: 'grab', label: 'Grab' },
  { key: 'gofood', label: 'GoFood' },
] as const;

interface Props {
  summary: {
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
  };
  payments: PaymentTotal[];
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
    by_method: Record<string, number>;
  }>;
  topItems: TopItem[];
  cabangName: string;
  filters: {
    start_date: string;
    end_date: string;
  };
}

function formatIDR(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatDateLabel(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function TypeBadge({ type }: { type: 'produk' | 'paket' }) {
  return (
    <span
      className={
        type === 'paket'
          ? 'inline-flex shrink-0 items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800'
          : 'inline-flex shrink-0 items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800'
      }
    >
      {type === 'paket' ? 'Paket' : 'Produk'}
    </span>
  );
}

export default function KeuanganIndex({
  summary,
  payments,
  dailyRevenue,
  topItems,
  cabangName,
  filters,
}: Props) {
  const [startDate, setStartDate] = useState(filters.start_date);
  const [endDate, setEndDate] = useState(filters.end_date);

  function handleFilter() {
    router.get(
      '/keuangan',
      { start_date: startDate, end_date: endDate },
      { preserveState: true, preserveScroll: true },
    );
  }

  function handlePrint() {
    window.print();
  }

  function handleExportExcel() {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Laporan Keuangan Cireng Juara'],
      [`periode: ${filters.start_date} s/d ${filters.end_date}`],
      [`cabang: ${cabangName}`],
      [],
      ['Ringkasan', ''],
      ['Total Pendapatan', summary.total_revenue],
      ['Jumlah Transaksi', summary.total_transactions],
      ['Rata-rata / Transaksi', summary.average_transaction],
      [],
      ['Pendapatan per Metode Pembayaran', ''],
      ...payments.map((p) => [p.label, p.revenue]),
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

    const dailySheet = XLSX.utils.json_to_sheet(
      dailyRevenue.map((row) => ({
        Tanggal: row.date,
        Transaksi: row.transactions,
        Tunai: row.by_method.cash ?? 0,
        QRIS: row.by_method.qris ?? 0,
        Grab: row.by_method.grab ?? 0,
        GoFood: row.by_method.gofood ?? 0,
        Pendapatan: row.revenue,
      })),
    );
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Pendapatan Harian');

    const productSheet = XLSX.utils.json_to_sheet(
      topItems.map((row) => ({
        Item: row.name,
        Tipe: row.type === 'paket' ? 'Paket' : 'Produk',
        'Qty Terjual': row.total_qty,
        Pendapatan: row.total_revenue,
      })),
    );
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Produk Terlaris');

    XLSX.writeFile(
      workbook,
      `laporan-keuangan-${cabangName.toLowerCase().replace(/\s+/g, '-')}-${filters.start_date}_${filters.end_date}.xlsx`,
    );
  }

  return (
    <>
      <Head title="Laporan Keuangan" />
      <div className="p-4 md:p-6 print:p-0">
        <div className="mb-4 flex items-center justify-between md:mb-6 print:mb-4">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">Laporan Keuangan</h1>
            <p className="text-sm text-muted-foreground">{cabangName}</p>
          </div>
          <p className="hidden text-sm text-muted-foreground print:block">
            Periode: {filters.start_date} s/d {filters.end_date}
          </p>
        </div>

        {/* Aksi: di HP dua tombol sama lebar */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:mb-6 md:flex print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Filter: dua tanggal bersebelahan di HP */}
        <div className="mb-4 grid grid-cols-2 items-end gap-3 rounded-lg border p-3 sm:flex sm:flex-wrap md:mb-6 md:p-4 print:hidden">
          <div className="space-y-1">
            <Label htmlFor="start_date">Dari Tanggal</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end_date">Sampai Tanggal</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button
            onClick={handleFilter}
            className="col-span-2 w-full sm:w-auto"
          >
            Terapkan Filter
          </Button>
        </div>

        {/* Ringkasan: Total Pendapatan penuh, dua lainnya berdampingan di HP */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:mb-6">
          <div className="col-span-2 rounded-lg border p-3 sm:col-span-1 md:p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Pendapatan
              </span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-bold md:mt-2">
              {formatIDR(summary.total_revenue)}
            </p>
          </div>
          <div className="rounded-lg border p-3 md:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm text-muted-foreground">Transaksi</span>
              <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xl font-bold md:mt-2 md:text-2xl">
              {summary.total_transactions}
            </p>
          </div>
          <div className="rounded-lg border p-3 md:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm text-muted-foreground">Rata-rata</span>
              <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xl font-bold md:mt-2 md:text-2xl">
              {formatIDR(summary.average_transaction)}
            </p>
          </div>
        </div>

        {/* Pendapatan per metode pembayaran (mengikuti rentang tanggal) */}
        <div className="mb-4 md:mb-6">
          <h2 className="font-semibold">Pendapatan per Metode Pembayaran</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {filters.start_date === filters.end_date
              ? `Tanggal ${filters.start_date}`
              : `${filters.start_date} s/d ${filters.end_date}`}
          </p>
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {payments.map((p) => {
              const Icon = PAYMENT_ICONS[p.method] ?? Wallet;

              return (
                <div key={p.method} className="rounded-lg border p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {p.label}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-lg font-bold md:mt-2 md:text-2xl">
                    {formatIDR(p.revenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.transactions} transaksi
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {/* Pendapatan harian */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Pendapatan Harian</h2>
            </div>

            {/* HP: kartu per hari, tidak perlu geser */}
            <div className="md:hidden print:hidden">
              {dailyRevenue.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data pada rentang ini.
                </p>
              ) : (
                <ul className="divide-y">
                  {dailyRevenue.map((row) => (
                    <li key={row.date} className="space-y-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {formatDateLabel(row.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.transactions} transaksi
                          </p>
                        </div>
                        <p className="text-base font-bold whitespace-nowrap">
                          {formatIDR(row.revenue)}
                        </p>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {METHODS.map((m) => {
                          const value = row.by_method[m.key] ?? 0;

                          return (
                            <div
                              key={m.key}
                              className="flex items-center justify-between"
                            >
                              <dt className="text-muted-foreground">
                                {m.label}
                              </dt>
                              <dd
                                className={
                                  value > 0
                                    ? 'font-medium'
                                    : 'text-muted-foreground'
                                }
                              >
                                {formatIDR(value)}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tablet/desktop dan cetak: tabel */}
            <div className="hidden overflow-x-auto md:block print:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Tanggal</th>
                    <th className="px-4 py-2 text-right">Transaksi</th>
                    {METHODS.map((m) => (
                      <th key={m.key} className="px-4 py-2 text-right">
                        {m.label}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-right">Pendapatan</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRevenue.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        Tidak ada data pada rentang ini.
                      </td>
                    </tr>
                  ) : (
                    dailyRevenue.map((row) => (
                      <tr key={row.date} className="border-b last:border-0">
                        <td className="px-4 py-2">
                          {formatDateLabel(row.date)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.transactions}
                        </td>
                        {METHODS.map((m) => (
                          <td
                            key={m.key}
                            className="px-4 py-2 text-right whitespace-nowrap"
                          >
                            {formatIDR(row.by_method[m.key] ?? 0)}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                          {formatIDR(row.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Item terlaris (Produk + Paket) */}
          {/* <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Item Terlaris</h2>
            </div> */}

          {/* HP: kartu per item */}
          {/* <div className="md:hidden print:hidden">
              {topItems.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data pada rentang ini.
                </p>
              ) : (
                <ul className="divide-y">
                  {topItems.map((row, i) => (
                    <li
                      key={`${row.type}-${row.name}-${i}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{row.name}</p>
                          <TypeBadge type={row.type} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.total_qty} terjual
                        </p>
                      </div>
                      <p className="text-sm font-bold whitespace-nowrap">
                        {formatIDR(row.total_revenue)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div> */}

          {/* Tablet/desktop dan cetak: tabel */}
          {/* <div className="hidden overflow-x-auto md:block print:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-center">Tipe</th>
                    <th className="px-4 py-2 text-right">Qty Terjual</th>
                    <th className="px-4 py-2 text-right">Pendapatan</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        Tidak ada data pada rentang ini.
                      </td>
                    </tr>
                  ) : (
                    topItems.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{row.name}</td>
                        <td className="px-4 py-2 text-center">
                          <TypeBadge type={row.type} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.total_qty}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatIDR(row.total_revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div> */}
        </div>
      </div>
      {/* </div> */}
    </>
  );
}

KeuanganIndex.layout = {
  breadcrumbs: [{ title: 'Laporan Keuangan', href: '/keuangan' }],
};
