import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface StockSummaryRow {
  product_id: number;
  name: string;
  cabang: string | null;
  stock: number;
  sisa: number | null;
  stok_awal: number;
  tambahan: number;
  pengurangan: number;
  rusak: number;
  ke_double: number;
}

export interface StockSummaryFilters {
  period?: string;
  start_date?: string | null;
  end_date?: string | null;
}

type Period = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hari ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: '7days', label: '7 hari terakhir' },
  { value: '30days', label: '30 hari terakhir' },
  { value: 'all', label: 'Semua waktu' },
  { value: 'custom', label: 'Pilih tanggal' },
];

type SummaryKey =
  'stok_awal' | 'tambahan' | 'pengurangan' | 'rusak' | 'ke_double';

const SUMMARY_COLUMNS: {
  key: SummaryKey;
  label: string;
  tone: 'plus' | 'minus';
}[] = [
  { key: 'stok_awal', label: 'Stok Awal', tone: 'plus' },
  { key: 'tambahan', label: 'Tambahan', tone: 'plus' },
  { key: 'pengurangan', label: 'Pengurangan', tone: 'minus' },
  { key: 'rusak', label: 'Rusak', tone: 'minus' },
  { key: 'ke_double', label: 'Ke Double', tone: 'minus' },
];

function valueClass(tone: 'plus' | 'minus', value: number) {
  if (value === 0) return 'text-muted-foreground';
  return tone === 'plus'
    ? 'font-medium text-green-600'
    : 'font-medium text-red-600';
}

interface Props {
  /** Data per produk; di sini hanya dijumlahkan menjadi satu kotak total */
  stockSummary: StockSummaryRow[];
  filters?: StockSummaryFilters;
  /** Halaman tujuan saat periode diganti, mis. '/dashboard' */
  basePath: string;
  /** Parameter query lain yang harus ikut terbawa (mis. filter riwayat penjualan) */
  extraParams?: Record<string, string>;
}

export function StockSummarySection({
  stockSummary,
  filters,
  basePath,
  extraParams,
}: Props) {
  const [period, setPeriod] = useState<Period>(
    (filters?.period as Period) ?? 'today',
  );
  const [startDate, setStartDate] = useState(filters?.start_date ?? '');
  const [endDate, setEndDate] = useState(filters?.end_date ?? '');
  const dateRangeInvalid = !!startDate && !!endDate && endDate < startDate;

  const appliedPeriod = (filters?.period as Period) ?? 'today';
  const periodLabel =
    appliedPeriod === 'custom'
      ? `${filters?.start_date ?? '...'} s/d ${filters?.end_date ?? '...'}`
      : (PERIODS.find((p) => p.value === appliedPeriod)?.label ?? 'Hari ini');

  function applyPeriod(next: {
    period?: Period;
    start?: string;
    end?: string;
  }) {
    const p = next.period ?? period;
    const s = next.start ?? startDate;
    const e = next.end ?? endDate;

    const params: Record<string, string> = {
      ...extraParams,
      stok_period: p,
    };
    if (p === 'custom') {
      if (s) params.stok_start = s;
      if (e) params.stok_end = e;
    }

    router.get(basePath, params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  function handlePeriodChange(value: string) {
    const next = value as Period;
    setPeriod(next);
    // "Pilih tanggal" menunggu tombol Terapkan
    if (next !== 'custom') applyPeriod({ period: next });
  }

  // Total semua produk
  const summaryTotals = stockSummary.reduce(
    (t, r) => ({
      stok_awal: t.stok_awal + r.stok_awal,
      tambahan: t.tambahan + r.tambahan,
      pengurangan: t.pengurangan + r.pengurangan,
      rusak: t.rusak + r.rusak,
      ke_double: t.ke_double + r.ke_double,
    }),
    { stok_awal: 0, tambahan: 0, pengurangan: 0, rusak: 0, ke_double: 0 },
  );

  const sisaTotal = stockSummary.some((r) => r.sisa !== null)
    ? stockSummary.reduce((sum, r) => sum + (r.sisa ?? 0), 0)
    : null;

  return (
    <section>
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">Periode: {periodLabel}</p>
        <p className="text-xs text-muted-foreground">
          Sisa = stok yang tidak terjual. Dicatat otomatis saat reset jam 00.00;
          untuk hari ini sama dengan stok saat ini. "–" berarti belum ada
          catatan.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2 md:p-4 lg:flex lg:flex-wrap lg:items-end print:hidden">
        <div className="space-y-1 lg:w-48">
          <label className="text-sm font-medium">Periode</label>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Hari ini" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {period === 'custom' && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium">Dari</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Sampai</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              disabled={dateRangeInvalid}
              onClick={() => applyPeriod({ period: 'custom' })}
            >
              Terapkan
            </Button>
            {dateRangeInvalid && (
              <p className="text-sm text-red-600">
                Tanggal "Sampai" tidak boleh sebelum "Dari".
              </p>
            )}
          </>
        )}
      </div>

      {stockSummary.length === 0 ? (
        <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada produk.
        </div>
      ) : (
        <div className="max-w-md rounded-lg border bg-muted/50 p-3">
          <p className="font-medium">Total semua produk</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {SUMMARY_COLUMNS.map((c) => (
              <div
                key={c.key}
                className="flex justify-between last:odd:col-span-2"
              >
                <dt className="text-muted-foreground">{c.label}</dt>
                <dd className={valueClass(c.tone, summaryTotals[c.key])}>
                  {summaryTotals[c.key]}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">Sisa stok</span>
            <span className="font-semibold">{sisaTotal ?? '–'}</span>
          </div>
        </div>
      )}
    </section>
  );
}
