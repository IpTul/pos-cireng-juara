import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SaleItemRow {
  id: number;
  sale: {
    id: number;
    total: number;
    cash_tendered: number;
    change_amount: number;
    status: string;
    created_at: string;
    user: { id: number; name: string };
  };
  product: {
    name: string;
    category: { name: string };
  };
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Props {
  saleItems: SaleItemRow[];
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
            <thead className="border=b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">User Name</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-center">Cash Tendered</th>
                <th className="px-4 py-3 text-center">Change</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {saleItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No sale history found.
                  </td>
                </tr>
              ) : (
                saleItems.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b last:border-0 hover:bg-muted/25"
                  >
                    <td className="px-4 py-3">
                      {new Date(sale.sale.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-left font-medium">
                      {sale.product.category.name} - {sale.product.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sale.sale.user.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sale.sale.total}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sale.sale.cash_tendered}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sale.sale.change_amount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          sale.sale.status === 'completed'
                            ? 'default'
                            : sale.sale.status === 'pending'
                              ? 'warning'
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
                ))
              )}
            </tbody>
          </table>
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
                <span className="font-medium">
                  {selected.product?.category?.name} - {selected.product?.name}
                </span>
              </div>
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
                <span>Rp {selected.sale.total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Tendered</span>
                <span>
                  Rp {selected.sale.cash_tendered.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kembalian</span>
                <span>
                  Rp {selected.sale.change_amount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    selected.sale.status === 'completed'
                      ? 'default'
                      : selected.sale.status === 'pending'
                        ? 'warning'
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
  breadcrumbs: [{ title: 'History', href: '/history' }],
};
