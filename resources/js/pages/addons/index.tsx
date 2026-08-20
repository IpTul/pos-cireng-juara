import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Heading from '@/components/heading';
import { formatRupiah } from '@/lib/utils';
import type { Addon } from '@/types';

interface PaginatedAddons {
  data: Addon[];
  links: { url: string | null; label: string; active: boolean }[];
  from: number;
  to: number;
  total: number;
}

export default function AddonIndex() {
  const { addons } = usePage().props as unknown as { addons: PaginatedAddons };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  function openCreateDialog() {
    setEditingAddon(null);
    setFormData({ name: '', description: '', price: 0, is_active: true });
    setIsDialogOpen(true);
  }

  function openEditDialog(addon: Addon) {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description || '',
      price: parseFloat(addon.price),
      is_active: addon.is_active,
    });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingAddon(null);
    setFormData({ name: '', description: '', price: 0, is_active: true });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const method = editingAddon ? 'put' : 'post';
    const url = editingAddon ? `/addons/${editingAddon.id}` : '/addons';

    router[method](
      url,
      formData,
      {
        onSuccess: () => {
          toast.success(editingAddon ? 'Addon berhasil diperbarui.' : 'Addon berhasil ditambahkan.');
          closeDialog();
          setSubmitting(false);
        },
        onError: (errors) => {
          toast.error(Object.values(errors).flat().join(', '));
          setSubmitting(false);
        },
      },
    );
  }

  function handleDelete(addon: Addon) {
    if (!confirm(`Yakin ingin menghapus "${addon.name}"?`)) return;

    router.delete(`/addons/${addon.id}`, {
      onSuccess: () => toast.success('Addon berhasil dihapus.'),
      onError: () => toast.error('Gagal menghapus addon.'),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Manajemen Addon" description="Kelola addon tambahan seperti Mentai, Chilli Oil, dll." />
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Addon
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-center hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addons.data.map((addon: Addon) => (
              <TableRow key={addon.id}>
                <TableCell className="font-medium">{addon.name}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {addon.description || '-'}
                </TableCell>
                <TableCell className="text-right font-mono">{formatRupiah(parseFloat(addon.price))}</TableCell>
                <TableCell className="text-center hidden md:table-cell">
                  <Switch
                    checked={addon.is_active}
                    onCheckedChange={(checked: boolean) => {
                      router.put(`/addons/${addon.id}`, {
                        ...formData,
                        name: addon.name,
                        description: addon.description,
                        price: parseFloat(addon.price),
                        is_active: checked,
                      });
                    }}
                    disabled={submitting}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(addon)}
                      disabled={submitting}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(addon)}
                      disabled={submitting}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {addons.data.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Belum ada addon. Klik "Tambah Addon" untuk memulai.
          </div>
        )}

        {addons.links.length > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Menampilkan {addons.from} - {addons.to} dari {addons.total} addon
            </span>
            <nav className="flex items-center gap-1" aria-label="Pagination">
              {addons.links.map((link) =>
                link.url ? (
                  <Button
                    key={link.url}
                    variant="ghost"
                    size="sm"
                    className={link.active ? 'bg-muted' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      router.get(link.url!, { preserveScroll: true });
                    }}
                  >
                    {link.label}
                  </Button>
                ) : (
                  <span key={link.label} className="px-2 text-muted-foreground">
                    {link.label}
                  </span>
                ),
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddon ? 'Edit Addon' : 'Tambah Addon Baru'}</DialogTitle>
            <DialogDescription>
              {editingAddon
                ? 'Perbarui informasi addon di bawah ini.'
                : 'Isi form di bawah untuk menambahkan addon baru.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Addon *</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Mentai, Chilli Oil"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  placeholder="Deskripsi singkat addon"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Harga (Rp) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="500"
                  min="0"
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Aktif</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_active: checked })}
                  disabled={submitting}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting}>
                <X className="h-4 w-4 mr-2" />
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingAddon ? 'Simpan Perubahan' : 'Tambah Addon'}
                {!submitting && <Check className="h-4 w-4 ml-2" />}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}