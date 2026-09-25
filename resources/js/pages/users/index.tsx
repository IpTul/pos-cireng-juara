import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { type User, type Cabang } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Plus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  users: User[];
  user: {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'kasir';
  };
}

export default function UserIndex({ users, user }: Props) {
  const { cabangs } = usePage().props as unknown as { cabangs: Cabang[] };
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data, setData, post, put, processing, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'kasir',
    cabang_id: '' as string | number,
  });

  function openCreate() {
    reset({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: 'kasir',
      cabang_id: '',
    });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(u: User) {
    setData({
      name: u.name,
      email: u.email,
      password: '',
      password_confirmation: '',
      role: u.role,
      cabang_id: u.cabang_id ?? '',
    });
    setEditing(u);
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
      put(`/users/${editing.id}`, {
        onSuccess: () => {
          toast.success('User berhasil diperbarui.');
          closeForm();
        },
      });
    } else {
      post('/users', {
        onSuccess: () => {
          toast.success('User berhasil dibuat.');
          closeForm();
        },
      });
    }
  }

  function handleDelete(u: User) {
    if (u.id === user.id) {
      toast.error('Tidak bisa menghapus akun sendiri.');
      return;
    }
    if (!confirm(`Hapus user "${u.name}"?`)) return;
    router.delete(`/users/${u.id}`, {
      onSuccess: () => toast.success('User berhasil dihapus.'),
    });
  }

  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    kasir: 'Kasir',
  };

  const roleIcons: Record<string, typeof Shield> = {
    owner: Shield,
    kasir: Shield,
  };

  return (
    <>
      <Head title="Manajemen Pengguna" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Manajemen Pengguna</h1>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah User
          </Button>
        </div>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada user.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b last:border-0 hover:bg-muted/25"
                >
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        u.role === 'owner'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        u.role === 'owner'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {roleLabels[u.role]}
                    </span>
                    {u.role === 'kasir' && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {u.cabang?.name ?? '(belum ada cabang)'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(u)}
                      disabled={u.id === user.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Tambah User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="user-name">Nama</Label>
              <Input
                id="user-name"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
              />
              <InputError message={errors.name} />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
              />
              <InputError message={errors.email} />
            </div>
            <div>
              <Label htmlFor="user-password">
                Password {editing ? '(kosongkan jika tidak diubah)' : ''}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                required={!editing}
              />
              <InputError message={errors.password} />
            </div>
            {!editing && (
              <div>
                <Label htmlFor="user-password-confirm">
                  Konfirmasi Password
                </Label>
                <Input
                  id="user-password-confirm"
                  type="password"
                  value={data.password_confirmation}
                  onChange={(e) =>
                    setData('password_confirmation', e.target.value)
                  }
                />
                <InputError message={errors.password_confirmation} />
              </div>
            )}
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={data.role}
                onValueChange={(value) => setData('role', value)}
              >
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="kasir">Kasir</SelectItem>
                </SelectContent>
              </Select>
              <InputError message={errors.role} />
            </div>
            {data.role === 'kasir' && (
              <div>
                <Label htmlFor="user-cabang">Cabang</Label>
                <Select
                  value={data.cabang_id ? String(data.cabang_id) : ''}
                  onValueChange={(value) => setData('cabang_id', value)}
                >
                  <SelectTrigger id="user-cabang">
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

UserIndex.layout = {
  breadcrumbs: [{ title: 'Manajemen Pengguna', href: '/users' }],
};
