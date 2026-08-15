import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  TrendingUp,
  Receipt,
  Wallet,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
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

interface Props {
  summary: {
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
  };
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  topItems: TopItem[];
  filters: {
    start_date: string;
    end_date: string;
  };
}

function formatIDR(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function KeuanganIndex({
  summary,
  dailyRevenue,
  topItems,
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
      [],
      ['Ringkasan', ''],
      ['Total Pendapatan', summary.total_revenue],
      ['Jumlah Transaksi', summary.total_transactions],
      ['Rata-rata / Transaksi', summary.average_transaction],
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

    const dailySheet = XLSX.utils.json_to_sheet(
      dailyRevenue.map((row) => ({
        Tanggal: row.date,
        Transaksi: row.transactions,
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
      `laporan-keuangan-${filters.start_date}_${filters.end_date}.xlsx`,
    );
  }

  return (
    <>
      <Head title="Laporan Keuangan" />
      <div className="p-6 print:p-0">
        <div className="mb-6 flex items-center justify-between print:mb-4">
          <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
          <p className="hidden text-sm text-muted-foreground print:block">
            Periode: {filters.start_date} s/d {filters.end_date}
          </p>
        </div>
        <div className="mb-6 flex gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border p-4">
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
          <Button onClick={handleFilter}>Terapkan Filter</Button>
        </div>

        {/* Ringkasan */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Pendapatan
              </span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatIDR(summary.total_revenue)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Jumlah Transaksi
              </span>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {summary.total_transactions}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Rata-rata / Transaksi
              </span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatIDR(summary.average_transaction)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pendapatan harian */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Pendapatan Harian</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Tanggal</th>
                  <th className="px-4 py-2 text-right">Transaksi</th>
                  <th className="px-4 py-2 text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {dailyRevenue.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      Tidak ada data pada rentang ini.
                    </td>
                  </tr>
                ) : (
                  dailyRevenue.map((row) => (
                    <tr key={row.date} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        {new Date(row.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.transactions}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatIDR(row.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Item terlaris (Produk + Paket) */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Item Terlaris</h2>
            </div>
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
                      <td className="px-4 py-2 font-medium">
                        {row.name}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={
                            row.type === 'paket'
                              ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800'
                              : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800'
                          }
                        >
                          {row.type === 'paket' ? 'Paket' : 'Produk'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{row.total_qty}</td>
                      <td className="px-4 py-2 text-right">
                        {formatIDR(row.total_revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

KeuanganIndex.layout = {
  breadcrumbs: [{ title: 'Keuangan', href: '/keuangan' }],
};
