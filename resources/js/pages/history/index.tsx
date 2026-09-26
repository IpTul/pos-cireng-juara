import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { PaginatedData } from '@/types';
import {
  Pencil,
  Eye,
  Package,
  QrCode,
  DollarSign,
  Bike,
  Printer,
  FileSpreadsheet,
  User,
  Award,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';

interface FreeItemInfo {
  id: number;
  name: string;
  quantity: number;
}

interface SaleItemRow {
  id: number;
  sale: {
    id: number;
    customer_name?: string | null;
    member_id?: number | null;
    member?: { id: number; name: string; phone: string; points: number } | null;
    total: number;
    cash_tendered: number;
    change_amount: number;
    payment_method: 'cash' | 'qris' | 'grab';
    status: string;
    created_at: string;
    operator_name?: string | null;
    user: { id: number; name: string };
  };
  product: {
    name: string;
    cabang: { name: string };
  } | null;
  pack: {
    name: string;
  } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
  free_items: FreeItemInfo[];
}

function formatRupiah(value: number) {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

interface Props {
  saleItems: PaginatedData<SaleItemRow>;
  user: { id: number; name: string; email: string; role: 'owner' | 'kasir' };
  can: { create: boolean };
  filters?: {
    start_date: string;
    end_date: string;
    payment_method: string;
  };
}

export default function History({ saleItems, user, can, filters }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<SaleItemRow | null>(null);

  const [startDate, setStartDate] = useState(filters?.start_date ?? '');
  const [endDate, setEndDate] = useState(filters?.end_date ?? '');
  const [paymentMethod, setPaymentMethod] = useState(
    filters?.payment_method ?? 'all',
  );
  const [exporting, setExporting] = useState(false);

  function handleViewDetail(sale: SaleItemRow) {
    setSelected(sale);
    setDetailOpen(true);
  }

  function handleDelete(saleItem: any) {
    if (!confirm(`Delete "${saleItem.product.name}"?`)) return;
    router.delete(`/history/${saleItem.id}`, {
      onSuccess: () => toast.success('History deleted.'),
    });
  }

  function handlePrint(sale: SaleItemRow) {
    window.open(`/receipt/${sale.sale.id}`, '_blank');
  }

  function handleFilter() {
    router.get(
      '/history',
      {
        start_date: startDate,
        end_date: endDate,
        payment_method: paymentMethod,
      },
      { preserveState: true, preserveScroll: true },
    );
  }

  function handlePrint_() {
    window.print();
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        payment_method: paymentMethod,
      });
      const response = await fetch(
        `/history/export-data?${params.toString()}`,
        {
          headers: { Accept: 'application/json' },
        },
      );
      if (!response.ok) throw new Error('Gagal mengambil data export');
      const rows: SaleItemRow[] = await response.json();

      const sheetData = rows.map((row) => ({
        Tanggal: new Date(row.sale.created_at).toLocaleString('id-ID'),
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
              : 'Tunai',
        Tunai:
          row.sale.payment_method === 'qris' ||
          row.sale.payment_method === 'grab'
            ? ''
            : row.sale.cash_tendered,
        Kembalian:
          row.sale.payment_method === 'qris' ||
          row.sale.payment_method === 'grab'
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
    } catch (err) {
      toast.error('Export gagal. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Head title="Riwayat Penjualan" />
      <div className="p-6 print:p-0">
        <div className="mb-4 flex items-center justify-between print:mb-4">
          <h1 className="text-2xl font-bold">Riwayat Penjualan</h1>
          <p className="hidden text-sm text-muted-foreground print:block">
            Periode: {startDate || 'awal'} s/d {endDate || 'sekarang'}
          </p>
        </div>

        <div className="mb-4 flex gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint_}>
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
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border p-4 print:hidden">
          <div className="p space-y-1">
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
          <div className="space-y-1">
            <Label htmlFor="payment_method">Metode Pembayaran</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment_method" className="w-[160px]">
                <SelectValue placeholder="Semua Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                <SelectItem value="grab">Grab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleFilter}>Terapkan Filter</Button>
        </div>

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Operator</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Cash Tendered</th>
                <th className="px-4 py-3 text-center">Change</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {saleItems.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No sale history found.
                  </td>
                </tr>
              ) : (
                saleItems.data.map((sale) => {
                  const isPack = !!sale.pack;
                  const isFree = sale.is_free;
                  const itemName = isPack
                    ? sale.pack?.name
                    : sale.product?.name;
                  const cabangName = isPack
                    ? 'Paket'
                    : sale.product?.cabang?.name;
                  const badgeIcon = isPack ? (
                    <Package className="mr-1 h-3 w-3" />
                  ) : null;

                  const hasFreeItems =
                    sale.free_items && sale.free_items.length > 0;
                  const freeItemsDisplay = hasFreeItems ? (
                    <span className="ml-2 text-xs text-green-600">
                      {' '}
                      + Gratis:{' '}
                      {sale.free_items
                        .map((f) => `${f.name} x${f.quantity}`)
                        .join(', ')}
                    </span>
                  ) : null;

                  return (
                    <tr key={sale.id}>
                      <td className="px-4 py-3">
                        {new Date(sale.sale.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-left font-medium">
                        {badgeIcon}
                        {cabangName} - {itemName}
                        {freeItemsDisplay}
                        {isFree && (
                          <Badge
                            variant="default"
                            className="ml-2 bg-green-600 text-xs"
                          >
                            Gratis
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sale.sale.customer_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sale.sale.operator_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRupiah(sale.sale.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sale.sale.payment_method === 'qris' ? (
                          <span className="flex items-center justify-center gap-1 text-primary">
                            <QrCode className="h-3 w-3" />
                            QRIS
                          </span>
                        ) : sale.sale.payment_method === 'grab' ? (
                          <span className="flex items-center justify-center gap-1 text-green-700">
                            <Bike className="h-3 w-3" />
                            Grab
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 text-green-600">
                            Tunai
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sale.sale.payment_method === 'qris' ||
                        sale.sale.payment_method === 'grab'
                          ? formatRupiah(sale.sale.total)
                          : formatRupiah(sale.sale.cash_tendered)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sale.sale.payment_method === 'qris' ||
                        sale.sale.payment_method === 'grab'
                          ? 'Rp0'
                          : formatRupiah(sale.sale.change_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            sale.sale.status === 'completed'
                              ? 'default'
                              : sale.sale.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {sale.sale.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right print:hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(sale)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {saleItems.data.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 print:hidden">
              <span className="text-sm text-muted-foreground">
                Menampilkan {saleItems.from} - {saleItems.to} dari{' '}
                {saleItems.total} transaksi
              </span>
              {saleItems.links.length > 1 && (
                <nav
                  className="flex items-center gap-1"
                  aria-label="Pagination"
                >
                  {saleItems.links.map((link, idx) =>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produk</span>
                <span className="flex items-center gap-2 font-medium">
                  {selected.pack ? (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Paket - {selected.pack.name}
                    </span>
                  ) : (
                    <span>
                      {selected.product?.cabang?.name} -{' '}
                      {selected.product?.name}
                    </span>
                  )}
                  {selected.is_free && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Gratis
                    </Badge>
                  )}
                </span>
              </div>
              {selected.free_items && selected.free_items.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item Gratis</span>
                  <span className="text-green-600">
                    {selected.free_items
                      .map((f) => `${f.name} x${f.quantity}`)
                      .join(', ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span>{selected.sale.customer_name || '-'}</span>
              </div>
              {selected.sale.member && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" />
                    Member
                  </span>
                  <span className="font-medium">
                    {selected.sale.member.name}
                  </span>
                </div>
              )}
              {selected.sale.member && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Award className="h-3 w-3" />
                    Poin Member
                  </span>
                  <span className="font-medium">
                    {selected.sale.member.points} poin
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operator</span>
                <span>{selected.sale.operator_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qty</span>
                <span>{selected.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Harga Satuan</span>
                <span>Rp {selected.unit_price.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rp {selected.subtotal.toLocaleString('id-ID')}</span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Transaksi</span>
                <span>{formatRupiah(selected.sale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode Bayar</span>
                <span className="flex items-center gap-1">
                  {selected.sale.payment_method === 'qris' ? (
                    <>
                      <QrCode className="h-3 w-3 text-primary" />
                      QRIS
                    </>
                  ) : selected.sale.payment_method === 'grab' ? (
                    <>
                      <Bike className="h-3 w-3 text-green-700" />
                      Grab
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-3 w-3 text-green-600" />
                      Tunai
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selected.sale.payment_method === 'qris'
                    ? 'Total QRIS'
                    : selected.sale.payment_method === 'grab'
                      ? 'Total Grab'
                      : 'Tunai'}
                </span>
                <span>
                  {selected.sale.payment_method === 'qris' ||
                  selected.sale.payment_method === 'grab'
                    ? formatRupiah(selected.sale.total)
                    : formatRupiah(selected.sale.cash_tendered)}
                </span>
              </div>
              {selected.sale.payment_method !== 'qris' &&
                selected.sale.payment_method !== 'grab' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kembalian</span>
                    <span>{formatRupiah(selected.sale.change_amount)}</span>
                  </div>
                )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    selected.sale.status === 'completed'
                      ? 'default'
                      : selected.sale.status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {selected.sale.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span>
                  {new Date(selected.sale.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

History.layout = {
  breadcrumbs: [{ title: 'Riwayat Penjualan', href: '/history' }],
};
