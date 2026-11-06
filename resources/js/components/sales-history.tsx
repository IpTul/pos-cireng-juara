import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { PaginatedData } from '@/types';
import {
  Eye,
  Package,
  QrCode,
  DollarSign,
  Bike,
  Printer,
  FileSpreadsheet,
  User,
  Award,
  Gift,
  Plus,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

type PaymentMethod = 'cash' | 'qris' | 'grab' | 'gofood';

interface SaleLine {
  id: number;
  name: string;
  is_pack: boolean;
  cabang: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
  variants?: { name: string; quantity: number }[];
}

interface SaleRow {
  id: number;
  customer_name?: string | null;
  member?: { id: number; name: string; phone: string; points: number } | null;
  total: number;
  cash_tendered: number;
  change_amount: number;
  payment_method: PaymentMethod;
  status: string;
  created_at: string;
  operator_name?: string | null;
  user: { id: number; name: string };
  cabang?: string | null;
  items: SaleLine[];
}

interface ExportRow {
  id: number;
  sale: {
    customer_name?: string | null;
    total: number;
    cash_tendered: number;
    change_amount: number;
    payment_method: PaymentMethod;
    status: string;
    created_at: string;
    operator_name?: string | null;
  };
  product: { name: string; cabang: { name: string } } | null;
  pack: { name: string } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
}

function formatRupiah(value: number | string) {
  return `Rp${Math.round(Number(value)).toLocaleString('id-ID')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID');
}

function isSettled(method: PaymentMethod) {
  return method === 'qris' || method === 'grab' || method === 'gofood';
}

function PaymentLabel({ method }: { method: PaymentMethod }) {
  if (method === 'qris') {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <QrCode className="h-3 w-3" />
        QRIS
      </span>
    );
  }
  if (method === 'grab' || method === 'gofood') {
    return (
      <span className="inline-flex items-center gap-1 text-green-700">
        <Bike className="h-3 w-3" />
        {method === 'grab' ? 'Grab' : 'GoFood'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-green-600">
      <DollarSign className="h-3 w-3" />
      Tunai
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === 'completed'
          ? 'default'
          : status === 'pending'
            ? 'secondary'
            : 'destructive'
      }
    >
      {status}
    </Badge>
  );
}

function ItemName({ item }: { item: SaleLine }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {item.is_pack && <Package className="h-3 w-3" />}
      <span>{item.name}</span>
      {item.is_free && (
        <Badge variant="default" className="bg-green-600 text-xs">
          Gratis
        </Badge>
      )}
    </span>
  );
}

function ItemVariants({ item }: { item: SaleLine }) {
  if (!item.variants || item.variants.length === 0) return null;

  return (
    <ul className="mt-1 space-y-0.5 text-xs font-normal text-muted-foreground">
      {item.variants.map((v, i) => (
        <li key={i}>
          - {v.name} ×{v.quantity * item.quantity}
        </li>
      ))}
    </ul>
  );
}

const PAYMENT_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'grab', label: 'Grab' },
  { value: 'gofood', label: 'GoFood' },
];

// Kuah & saus yang dijual sebagai PRODUK (dipisah dari addon)
const SIDE_PRODUCT_FILTERS = [
  { value: 'kuah_creamy', label: 'Kuah Creamy Juara' },
  { value: 'chili_oil', label: 'Chili Oil Juara' },
  { value: 'mentai', label: 'Mentai Juara' },
] as const;

// Kuah & saus yang dijual sebagai ADDON
const SIDE_ADDON_FILTERS = [
  { value: 'addon_kuah_creamy', label: 'Addon Kuah Creamy' },
  { value: 'addon_chili_oil', label: 'Addon Chili Oil' },
  { value: 'addon_mentai', label: 'Addon Mentai' },
] as const;

// Produk yang difilter khusus
const PRODUCT_FILTERS = [
  { value: 'rendang', label: 'Daging Rendang' },
] as const;

type SideKey =
  | (typeof SIDE_PRODUCT_FILTERS)[number]['value']
  | (typeof SIDE_ADDON_FILTERS)[number]['value']
  | (typeof PRODUCT_FILTERS)[number]['value'];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export interface SalesHistoryProps {
  sales: PaginatedData<SaleRow>;
  sideCounts: Record<SideKey | 'paket', number>;
  /** Total qty item di semua halaman hasil filter (dihitung di server) */
  itemsSold: number;
  filters?: {
    start_date: string;
    end_date: string;
    payment_method: string;
    free?: string;
    addon?: string;
    side?: string;
    pack?: string;
  };
}

interface Props extends SalesHistoryProps {
  /** Halaman tujuan saat filter diterapkan, mis. '/history' atau '/dashboard' */
  basePath: string;
  /** Parameter query lain yang harus ikut terbawa (mis. filter ringkasan stok) */
  extraParams?: Record<string, string>;
}

export function SalesHistory({
  sales,
  sideCounts,
  itemsSold,
  filters,
  basePath,
  extraParams,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<SaleRow | null>(null);

  const [startDate, setStartDate] = useState(filters?.start_date ?? '');
  const [endDate, setEndDate] = useState(filters?.end_date ?? '');
  const [paymentMethod, setPaymentMethod] = useState(
    filters?.payment_method ?? 'all',
  );
  const [freeFilter, setFreeFilter] = useState(filters?.free ?? 'all');
  const [addonFilter, setAddonFilter] = useState(filters?.addon ?? 'all');
  const [sideFilter, setSideFilter] = useState(filters?.side ?? 'all');
  const [packFilter, setPackFilter] = useState(filters?.pack ?? 'all');
  const [exporting, setExporting] = useState(false);

  function handleViewDetail(sale: SaleRow) {
    setSelected(sale);
    setDetailOpen(true);
  }

  function handlePrintReceipt(sale: SaleRow) {
    window.open(`/receipt/${sale.id}`, '_blank');
  }

  function applyFilters(
    next: {
      payment?: string;
      free?: string;
      addon?: string;
      side?: string;
      pack?: string;
    } = {},
  ) {
    router.get(
      basePath,
      {
        ...extraParams,
        start_date: startDate,
        end_date: endDate,
        payment_method: next.payment ?? paymentMethod,
        free: next.free ?? freeFilter,
        addon: next.addon ?? addonFilter,
        side: next.side ?? sideFilter,
        pack: next.pack ?? packFilter,
      },
      { preserveState: true, preserveScroll: true },
    );
  }

  function selectPayment(value: string) {
    setPaymentMethod(value);
    applyFilters({ payment: value });
  }

  function toggleFree() {
    const value = freeFilter === 'with' ? 'all' : 'with';
    setFreeFilter(value);
    applyFilters({ free: value });
  }

  function toggleAddon() {
    const value = addonFilter === 'with' ? 'all' : 'with';
    setAddonFilter(value);
    applyFilters({ addon: value });
  }

  function toggleSide(value: string) {
    const next = sideFilter === value ? 'all' : value;
    setSideFilter(next);
    applyFilters({ side: next });
  }

  function togglePack() {
    const value = packFilter === 'with' ? 'all' : 'with';
    setPackFilter(value);
    applyFilters({ pack: value });
  }

  function clearFilters() {
    setPaymentMethod('all');
    setFreeFilter('all');
    setAddonFilter('all');
    setSideFilter('all');
    setPackFilter('all');
    applyFilters({
      payment: 'all',
      free: 'all',
      addon: 'all',
      side: 'all',
      pack: 'all',
    });
  }

  const renderSideChip = (s: { value: SideKey; label: string }) => (
    <Chip
      key={s.value}
      active={sideFilter === s.value}
      onClick={() => toggleSide(s.value)}
    >
      {s.label}
      <span
        className={`rounded-full px-1.5 text-xs ${
          sideFilter === s.value
            ? 'bg-primary-foreground/20'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {sideCounts?.[s.value] ?? 0}
      </span>
    </Chip>
  );

  const datesChanged =
    startDate !== (filters?.start_date ?? '') ||
    endDate !== (filters?.end_date ?? '');
  const filterActive =
    paymentMethod !== 'all' ||
    freeFilter !== 'all' ||
    addonFilter !== 'all' ||
    sideFilter !== 'all' ||
    packFilter !== 'all';

  async function handleExportExcel() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        payment_method: paymentMethod,
        free: freeFilter,
        addon: addonFilter,
        side: sideFilter,
        pack: packFilter,
      });
      const response = await fetch(
        `/history/export-data?${params.toString()}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) throw new Error('Gagal mengambil data export');
      const rows: ExportRow[] = await response.json();

      const sheetData = rows.map((row) => ({
        Tanggal: formatDate(row.sale.created_at),
        Item: row.pack
          ? `Paket - ${row.pack.name}`
          : (row.product?.name ?? '-'),
        Kategori: row.pack ? 'Paket' : (row.product?.cabang?.name ?? '-'),
        Customer: row.sale.customer_name || '-',
        Operator: row.sale.operator_name || '-',
        Qty: row.quantity,
        'Harga Satuan': row.unit_price,
        Subtotal: row.subtotal,
        'Total Transaksi': row.sale.total,
        Pembayaran:
          row.sale.payment_method === 'qris'
            ? 'QRIS'
            : row.sale.payment_method === 'grab'
              ? 'Grab'
              : row.sale.payment_method === 'gofood'
                ? 'GoFood'
                : 'Tunai',
        Tunai: isSettled(row.sale.payment_method) ? '' : row.sale.cash_tendered,
        Kembalian: isSettled(row.sale.payment_method)
          ? ''
          : row.sale.change_amount,
        Status: row.sale.status,
        Gratis: row.is_free ? 'Ya' : 'Tidak',
      }));

      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet([
        ['Riwayat Penjualan Cireng Juara'],
        [`Periode: ${startDate || 'awal'} s/d ${endDate || 'sekarang'}`],
        [],
      ]);
      XLSX.utils.sheet_add_json(sheet, sheetData, { origin: 'A4' });
      XLSX.utils.book_append_sheet(workbook, sheet, 'Riwayat');

      XLSX.writeFile(
        workbook,
        `riwayat-penjualan-${startDate || 'semua'}_${endDate || 'semua'}.xlsx`,
      );
    } catch {
      toast.error('Export gagal. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div>
        <p className="mb-4 hidden text-sm text-muted-foreground print:block">
          Periode: {startDate || 'awal'} s/d {endDate || 'sekarang'}
        </p>

        {/* <div className="mb-4 flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {exporting ? 'Mengekspor…' : 'Export Excel'}
          </Button>
        </div> */}

        <div className="mb-4 space-y-3 rounded-lg border p-3 md:p-4 print:hidden">
          <div className="grid grid-cols-2 items-end gap-3 sm:flex">
            <div className="space-y-1">
              <Label htmlFor="start_date">Dari</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end_date">Sampai</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {datesChanged && (
              <Button
                className="col-span-2 sm:col-span-1"
                onClick={() => applyFilters()}
              >
                Terapkan
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PAYMENT_FILTERS.map((p) => (
              <Chip
                key={p.value}
                active={paymentMethod === p.value}
                onClick={() => selectPayment(p.value)}
              >
                {p.label}
              </Chip>
            ))}

            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

            <Chip active={freeFilter === 'with'} onClick={toggleFree}>
              <Gift className="h-4 w-4" />
              Ada gratis
            </Chip>
            <Chip active={addonFilter === 'with'} onClick={toggleAddon}>
              <Plus className="h-4 w-4" />
              Ada addon
            </Chip>
            <Chip active={packFilter === 'with'} onClick={togglePack}>
              <Package className="h-4 w-4" />
              Ada paket
              <span
                className={`rounded-full px-1.5 text-xs ${
                  packFilter === 'with'
                    ? 'bg-primary-foreground/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {sideCounts?.paket ?? 0}
              </span>
            </Chip>

            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

            {SIDE_PRODUCT_FILTERS.map(renderSideChip)}

            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

            {SIDE_ADDON_FILTERS.map(renderSideChip)}

            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

            {PRODUCT_FILTERS.map(renderSideChip)}

            {filterActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Hapus filter
              </Button>
            )}
          </div>
        </div>

        <div className="mb-4 rounded-lg border bg-muted/50 px-4 py-3 print:hidden">
          <p>Total Transaksi: {sales.total}</p>
          <p>Total Item Terjual: {itemsSold ?? 0}</p>
        </div>

        <div className="rounded-lg border">
          {/* HP & tablet: kartu per transaksi, tidak perlu geser */}
          <div className="lg:hidden print:hidden">
            {sales.data.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada riwayat penjualan.
              </div>
            ) : (
              <div className="divide-y">
                {sales.data.map((sale) => {
                  const settled = isSettled(sale.payment_method);

                  return (
                    <div key={sale.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(sale.created_at)}
                        </p>
                        <StatusBadge status={sale.status} />
                      </div>

                      {sale.items.length > 0 && (
                        <ul className="space-y-1.5">
                          {sale.items.map((item) => (
                            <li key={item.id} className="font-medium">
                              <ItemName item={item} />{' '}
                              <span className="font-normal text-muted-foreground">
                                ×{item.quantity}
                              </span>
                              <ItemVariants item={item} />
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                        <PaymentLabel method={sale.payment_method} />
                        <span className="text-lg font-semibold">
                          {formatRupiah(sale.total)}
                        </span>
                      </div>

                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Customer</dt>
                          <dd className="text-right">
                            {sale.customer_name || '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Operator</dt>
                          <dd className="text-right">
                            {sale.operator_name || sale.user.name}
                          </dd>
                        </div>
                        {!settled && (
                          <>
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Tunai</dt>
                              <dd className="text-right">
                                {formatRupiah(sale.cash_tendered)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">
                                Kembalian
                              </dt>
                              <dd className="text-right">
                                {formatRupiah(sale.change_amount)}
                              </dd>
                            </div>
                          </>
                        )}
                      </dl>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => handleViewDetail(sale)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Detail
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => handlePrintReceipt(sale)}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Struk
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => router.get(`/history/${sale.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PC: tabel */}
          <div className="hidden overflow-x-auto lg:block print:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Operator</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-center">Pembayaran</th>
                  <th className="hidden px-4 py-3 text-center lg:table-cell">
                    Tunai
                  </th>
                  <th className="hidden px-4 py-3 text-center lg:table-cell">
                    Kembalian
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sales.data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Belum ada riwayat penjualan.
                    </td>
                  </tr>
                ) : (
                  sales.data.map((sale) => {
                    const settled = isSettled(sale.payment_method);

                    return (
                      <tr key={sale.id} className="border-b last:border-0">
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {formatDate(sale.created_at)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {sale.items.length === 0 ? (
                            '-'
                          ) : (
                            <ul className="space-y-1">
                              {sale.items.map((item) => (
                                <li key={item.id} className="font-medium">
                                  <ItemName item={item} />{' '}
                                  <span className="font-normal text-muted-foreground">
                                    ×{item.quantity}
                                  </span>
                                  <ItemVariants item={item} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {sale.customer_name || '-'}
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {sale.operator_name || sale.user.name}
                        </td>
                        <td className="px-4 py-3 align-top font-medium whitespace-nowrap">
                          {formatRupiah(sale.total)}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <PaymentLabel method={sale.payment_method} />
                        </td>
                        <td className="hidden px-4 py-3 text-center align-top lg:table-cell">
                          {formatRupiah(
                            settled ? sale.total : sale.cash_tendered,
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-center align-top lg:table-cell">
                          {formatRupiah(settled ? 0 : sale.change_amount)}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <StatusBadge status={sale.status} />
                        </td>
                        <td className="px-4 py-3 text-right align-top whitespace-nowrap print:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Detail transaksi"
                            onClick={() => handleViewDetail(sale)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Buka struk"
                            onClick={() => handlePrintReceipt(sale)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit transaksi"
                            onClick={() =>
                              router.get(`/history/${sale.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {sales.data.length > 0 && (
            <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <span className="text-sm text-muted-foreground">
                Menampilkan {sales.from} - {sales.to} dari {sales.total}{' '}
                transaksi
              </span>
              {sales.links.length > 1 && (
                <nav
                  className="flex flex-wrap items-center gap-1"
                  aria-label="Pagination"
                >
                  {sales.links.map((link, idx) =>
                    link.url ? (
                      <Button
                        key={`${link.label}-${idx}`}
                        variant="ghost"
                        size="sm"
                        className={link.active ? 'bg-muted' : ''}
                        onClick={(e) => {
                          e.preventDefault();
                          router.get(
                            link.url!,
                            {},
                            { preserveState: true, preserveScroll: true },
                          );
                        }}
                      >
                        <span
                          dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                      </Button>
                    ) : (
                      <span
                        key={`${link.label}-${idx}`}
                        className="px-2 text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    ),
                  )}
                </nav>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail transaksi */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Produk</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <ItemName item={item} />
                          <ItemVariants item={item} />
                          <div className="text-xs text-muted-foreground">
                            {formatRupiah(item.unit_price)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatRupiah(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.cabang && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cabang</span>
                  <span>{selected.cabang}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span>{selected.customer_name || '-'}</span>
              </div>
              {selected.member && (
                <>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" />
                      Member
                    </span>
                    <span className="font-medium">{selected.member.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Award className="h-3 w-3" />
                      Poin Member
                    </span>
                    <span className="font-medium">
                      {selected.member.points} poin
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operator</span>
                <span>{selected.operator_name || selected.user.name}</span>
              </div>
              <hr />
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Total Transaksi</span>
                <span>{formatRupiah(selected.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode Bayar</span>
                <PaymentLabel method={selected.payment_method} />
              </div>
              {!isSettled(selected.payment_method) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tunai</span>
                    <span>{formatRupiah(selected.cash_tendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kembalian</span>
                    <span>{formatRupiah(selected.change_amount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span>{formatDate(selected.created_at)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
