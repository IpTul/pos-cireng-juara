import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Eye, Package, QrCode, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SimplePagination } from '@/components/ui/pagination';

interface FreeItemInfo {
  id: number;
  name: string;
  quantity: number;
}

interface SaleItemRow {
  id: number;
  sale: {
    id: number;
    total: number;
    cash_tendered: number;
    change_amount: number;
    payment_method: 'cash' | 'qris';
    status: string;
    created_at: string;
    user: { id: number; name: string };
  };
  product: {
    name: string;
    category: { name: string };
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

interface PaginatedData<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface Props {
  saleItems: PaginatedData<SaleItemRow>;
  user: { id: number; name: string; email: string; role: 'owner' | 'kasir' };
  can: { create: boolean };
}

export default function History({ saleItems, user, can }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<SaleItemRow | null>(null);

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

  return (
    <>
      <Head title="Riwayat Penjualan" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Riwayat Penjualan</h1>
        </div>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">User Name</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Cash Tendered</th>
                <th className="px-4 py-3 text-center">Change</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {saleItems.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                  const categoryName = isPack
                    ? 'Paket'
                    : sale.product?.category?.name;
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
                    <tr
                      key={sale.id}
                      // className={`border-b ${isFree ? 'bg-green-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        {new Date(sale.sale.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-left font-medium">
                        {badgeIcon}
                        {categoryName} - {itemName}
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
                        {sale.sale.user.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRupiah(sale.sale.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sale.sale.payment_method === 'qris' ? (
                          <span className="flex items-center gap-1 justify-center text-primary">
                            <QrCode className="h-3 w-3" />
                            QRIS
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 justify-center text-green-600">
                            <DollarSign className="h-3 w-3" />
                            Tunai
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sale.sale.payment_method === 'qris'
                          ? formatRupiah(sale.sale.total)
                          : formatRupiah(sale.sale.cash_tendered)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sale.sale.payment_method === 'qris'
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
                      <td className="px-4 py-3 text-right">
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
          {saleItems.last_page > 1 && (
            <div className="border-t p-4">
              <SimplePagination
                currentPage={saleItems.current_page}
                totalPages={saleItems.last_page}
                baseUrl="/history"
              />
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
                      {selected.product?.category?.name} -{' '}
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
                <span className="text-muted-foreground">Kasir</span>
                <span>{selected.sale.user?.name ?? '-'}</span>
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
                    : 'Tunai'}
                </span>
                <span>
                  {selected.sale.payment_method === 'qris'
                    ? formatRupiah(selected.sale.total)
                    : formatRupiah(selected.sale.cash_tendered)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selected.sale.payment_method === 'qris' ? 'Kembalian' : ''}
                </span>
                {selected.sale.payment_method !== 'qris' && (
                  <span>{formatRupiah(selected.sale.change_amount)}</span>
                )}
              </div>
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
