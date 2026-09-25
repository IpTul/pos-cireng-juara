import { Head, router, useForm } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import type { Member, PaginatedData, Cabang } from '@/types';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import { Pencil, Plus, Trash2, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';

interface Props {
  members: PaginatedData<Member>;
  search: string;
}

export default function MemberIndex({ members, search }: Props) {
  const { auth, cabangs } = usePage().props as unknown as {
    auth: { user: { role: 'owner' | 'kasir' } };
    cabangs: Cabang[];
  };
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const { data, setData, post, put, processing, errors, reset } = useForm({
    name: '',
    phone: '',
    cabang_id: '' as string | number,
  });

  // Sync searchInput and debouncedSearch with server search prop
  useEffect(() => {
    setSearchInput(search);
    setDebouncedSearch(search);
  }, [search]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reload when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      router.get(
        '/members',
        { search: debouncedSearch },
        { preserveScroll: true },
      );
    }
  }, [debouncedSearch]);

  function openCreate() {
    reset();
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(m: Member) {
    setData({
      name: m.name,
      phone: m.phone,
      cabang_id: m.cabang_id ?? '',
    });
    setEditing(m);
    setShowForm(true);
  }

  function closeForm() {
    reset();
    setShowForm(false);
    setEditing(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      put(`/members/${editing.id}`, {
        onSuccess: () => {
          toast.success('Member berhasil diperbarui.');
          closeForm();
        },
      });
    } else {
      post('/members', {
        onSuccess: () => {
          toast.success('Member berhasil dibuat.');
          closeForm();
        },
      });
    }
  }

  function handleDelete(m: Member) {
    if (!confirm(`Hapus member "${m.name}"?`)) return;
    router.delete(`/members/${m.id}`, {
      onSuccess: () => toast.success('Member berhasil dihapus.'),
    });
  }

  return (
    <>
      <Head title="Manajemen Member" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Manajemen Member</h1>
          <Button onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Tambah Member
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari nama atau nomor HP..."
              value={debouncedSearch}
              onChange={(e) => setDebouncedSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Nomor HP</th>
                <th className="px-4 py-3 text-left">Poin</th>
                <th className="px-4 py-3 text-left">Pembelian Terakhir</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada member.
                  </td>
                </tr>
              ) : (
                members.data.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b last:border-0 hover:bg-muted/25"
                  >
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.phone}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">
                        {m.points} poin
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.last_purchase_at
                        ? new Date(m.last_purchase_at).toLocaleString('id-ID')
                        : 'Belum pernah belanja'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(m)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {members.last_page > 1 && (
            <div className="border-t p-4">
              {/* Simple pagination - could extract to component */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Menampilkan {members.from} sampai {members.to} dari{' '}
                  {members.total} data
                </span>
                <div className="flex gap-2">
                  {members.current_page > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.get(
                          '/members',
                          {
                            page: members.current_page - 1,
                            search: debouncedSearch,
                          },
                          { preserveScroll: true },
                        )
                      }
                    >
                      Sebelumnya
                    </Button>
                  )}
                  {members.current_page < members.last_page && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.get(
                          '/members',
                          {
                            page: members.current_page + 1,
                            search: debouncedSearch,
                          },
                          { preserveScroll: true },
                        )
                      }
                    >
                      Selanjutnya
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Member' : 'Tambah Member'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="member-name">Nama</Label>
              <Input
                id="member-name"
                value={data.name ?? ''}
                onChange={(e) => setData('name', e.target.value)}
              />
              <InputError message={errors.name} />
            </div>
            <div>
              <Label htmlFor="member-phone">Nomor HP</Label>
              <Input
                id="member-phone"
                type="tel"
                value={data.phone ?? ''}
                onChange={(e) => setData('phone', e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
              <InputError message={errors.phone} />
            </div>
            {auth.user?.role === 'owner' && (
              <div>
                <Label htmlFor="member-cabang">Cabang</Label>
                <Select
                  value={data.cabang_id ? String(data.cabang_id) : ''}
                  onValueChange={(value) => setData('cabang_id', value)}
                >
                  <SelectTrigger id="member-cabang">
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {cabangs?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <InputError message={errors.cabang_id} />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? 'Menyimpan…' : editing ? 'Update' : 'Buat'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

MemberIndex.layout = {
  breadcrumbs: [{ title: 'Manajemen Member', href: '/members' }],
};
