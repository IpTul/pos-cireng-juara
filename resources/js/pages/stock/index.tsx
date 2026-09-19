import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';

interface Product {
  id: number;
  name: string;
  stock: number;
  cabang: { name: string };
}

interface Adjustment {
  id: number;
  product: Product;
  user: { name: string };
  type: 'increase' | 'decrease';
  quantity: number;
  reason: string | null;
  previous_stock: number;
  new_stock: number;
  created_at: string;
}

interface Props {
  adjustments: {
    data: Adjustment[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  products: Product[];
  user: { id: number; name: string; email: string; role: 'owner' | 'kasir' };
  can: { create: boolean };
}

export default function StockIndex({
  adjustments,
  products,
  user,
  can,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [type, setType] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.cabang?.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0 || !reason.trim()) return;

    router.post(
      '/stok',
      {
        product_id: selectedProductId,
        type,
        quantity,
        reason,
      },
      {
        onSuccess: () => {
          toast.success('Stok berhasil diubah.');
          setModalOpen(false);
          setSelectedProductId(null);
          setQuantity(1);
          setReason('');
        },
        onError: (errors) => {
          toast.error(
            Object.values(errors).flat().join(', ') || 'Gagal mengubah stok.',
          );
        },
      },
    );
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getTypeBadge(type: 'increase' | 'decrease') {
    return (
      <Badge
        variant={type === 'increase' ? 'default' : 'destructive'}
        className="text-xs"
      >
        {type === 'increase' ? (
          <>
            <ArrowUp className="mr-1 h-3 w-3" /> Tambah
          </>
        ) : (
          <>
            <ArrowDown className="mr-1 h-3 w-3" /> Kurang
          </>
        )}
      </Badge>
    );
  }

  return (
    <>
      <Head title="Stok Cireng" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Stok Cireng</h1>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah / Kurangi Stok
          </Button>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ubah Stok Produk</DialogTitle>
              <DialogDescription>
                Tambah atau kurangi stok secara manual. Riwayat akan tersimpan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Produk</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select
                      value={String(selectedProductId || '')}
                      onValueChange={(v) =>
                        setSelectedProductId(v ? Number(v) : null)
                      }
                    >
                      <SelectTrigger className="pl-9">
                        <SelectValue placeholder="Pilih produk..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={String(product.id)}
                          >
                            <div className="flex flex-col">
                              <span>{product.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {product.cabang?.name || ''} • Stok:{' '}
                                {product.stock}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Jenis Perubahan</label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as 'increase' | 'decrease')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">
                        <ArrowUp className="mr-2 h-4 w-4 text-green-600" />
                        Tambah Stok
                      </SelectItem>
                      <SelectItem value="decrease">
                        <ArrowDown className="mr-2 h-4 w-4 text-red-600" />
                        Kurangi Stok
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Jumlah</label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Alasan <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Contoh: Penjualan manual, Rusak, Koreksi stok..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !selectedProductId || quantity <= 0 || !reason.trim()
                  }
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <caption>
              Riwayat perubahan stok ({adjustments.total} total)
            </caption>
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Produk</th>
                <th className="px-4 py-3 text-center">Jenis</th>
                <th className="px-4 py-3 text-center">Jumlah</th>
                <th className="px-4 py-3 text-center">
                  Stok Sebelum → Sesudah
                </th>
                <th className="px-4 py-3 text-left">Alasan</th>
                <th className="px-4 py-3 text-center">Oleh</th>
                <th className="px-4 py-3 text-center">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada riwayat perubahan stok.
                  </td>
                </tr>
              ) : (
                adjustments.data.map((adj, index) => (
                  <tr
                    key={adj.id}
                    className="border-b last:border-0 hover:bg-muted/25"
                  >
                    <td className="px-4 py-3 font-medium">
                      {adjustments.from + index}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {adj.product.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getTypeBadge(adj.type)}
                    </td>
                    <td className="px-4 py-3 text-center">{adj.quantity}</td>
                    <td className="py-3 pl-30">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">
                          {adj.previous_stock}
                        </span>
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{adj.new_stock}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left">{adj.reason || '-'}</td>
                    <td className="px-4 py-3 text-center">{adj.user.name}</td>
                    <td className="px-4 py-3 text-center">
                      {formatDate(adj.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* {adjustments.last_page > 1 && (
            <div className="border-t p-4">
              <Pagination
                currentPage={adjustments.current_page}
                totalPages={adjustments.last_page}
                baseUrl="/stok"
              />
            </div>
          )} */}
        </div>
      </div>
    </>
  );
}

StockIndex.layout = {
  breadcrumbs: [{ title: 'Stok Cireng', href: '/stok' }],
};
