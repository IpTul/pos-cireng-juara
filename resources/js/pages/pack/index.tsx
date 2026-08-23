import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Product, Pack, PackItem, Category } from '@/types';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  packs: Pack[];
  products: Product[];
  categories?: Category[];
}

export default function PackIndex({ packs, products, categories }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pack | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    is_active: true,
    max_items: 5,
    items: [] as { product_id: number; quantity: number }[],
  });

  function handleEdit(pack: Pack) {
    setEditing(pack);
    setFormData({
      name: pack.name,
      description: pack.description || '',
      price: pack.price,
      image: pack.image || '',
      is_active: pack.is_active,
      max_items: pack.max_items || 5,
      items: pack.pack_items?.map((item: PackItem) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })) || [],
    });
    setShowForm(true);
  }

  function handleDelete(pack: Pack) {
    if (!confirm(`Hapus paket "${pack.name}"?`)) return;
    router.delete(`/pack/${pack.id}`, {
      onSuccess: () => toast.success('Paket berhasil dihapus.'),
    });
  }

  function handleClose() {
    setShowForm(false);
    setEditing(null);
    resetForm();
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      price: '',
      image: '',
      is_active: true,
      max_items: 5,
      items: [],
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editing) {
      router.put(`/pack/${editing.id}`, formData, {
        onSuccess: () => {
          toast.success('Paket berhasil diperbarui.');
          handleClose();
        },
        onError: () => {
          toast.error('Gagal menyimpan paket.');
        },
      });
    } else {
      router.post('/pack', formData, {
        onSuccess: () => {
          toast.success('Paket berhasil dibuat.');
          handleClose();
        },
        onError: () => {
          toast.error('Gagal menyimpan paket.');
        },
      });
    }
  }

  function addItem() {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: 0, quantity: 1 }],
    }));
  }

  function removeItem(index: number) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function updateItem(index: number, field: 'product_id' | 'quantity', value: string | number) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: field === 'quantity' ? Number(value) : Number(value) } : item
      ),
    }));
  }

  return (
    <>
      <Head title="Kelola Paket" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Kelola Paket Makanan</h1>
          <Button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Paket
          </Button>
        </div>

        {/* Paket List */}
        <div className="rounded-lg border mb-6">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Nama Paket</th>
                <th className="px-4 py-3 text-left">Isi Paket</th>
                <th className="px-4 py-3 text-right">Harga</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {packs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada paket. Klik "Tambah Paket" untuk memulai.
                  </td>
                </tr>
              )}
              {packs.map((pack) => (
                <tr key={pack.id} className="border-b last:border-0 hover:bg-muted/25">
                  <td className="px-4 py-3 font-medium">{pack.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="space-y-1">
                      {pack.pack_items?.map((item: PackItem) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span>{item.product?.name} x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    Rp{Number(pack.price).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={pack.is_active ? 'default' : 'secondary'}>
                      {pack.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(pack)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pack)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Paket' : 'Tambah Paket Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama Paket</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Paket Hemat 1"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Deskripsi paket (opsional)"
                    rows={2}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="price">Harga Paket (Rp)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    required
                    min="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="image">URL Gambar (opsional)</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Aktif
                  </Label>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="max_items">Maksimal Item yang Bisa Dipilih</Label>
                  <Input
                    id="max_items"
                    type="number"
                    value={formData.max_items}
                    onChange={(e) => setFormData({ ...formData, max_items: parseInt(e.target.value) || 5 })}
                    min="1"
                    max="20"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Jumlah maksimal item yang bisa dipilih pelanggan (default: 5)</p>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-medium">Isi Paket (Minimal 1 item)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-1 h-3 w-3" />
                      Tambah Item
                    </Button>
                  </div>

                  {formData.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">Klik "Tambah Item" untuk menambahkan produk ke paket.</p>
                  )}

                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                      <Select
                        value={item.product_id > 0 ? String(item.product_id) : ''}
                        onValueChange={(value) => updateItem(index, 'product_id', value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name} (Stok: {product.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        min="1"
                        className="w-20"
                      />
                      <Label className="text-sm text-muted-foreground">pcs</Label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {formData.items.length > 0 && (
                    <div className="text-right text-sm text-muted-foreground">
                      Total item: {formData.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t px-4 py-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Batal
                </Button>
                <Button type="submit" disabled={formData.items.length === 0}>
                  {editing ? 'Update' : 'Buat'} Paket
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

PackIndex.layout = {
  breadcrumbs: [{ title: 'Paket', href: '/pack' }],
};