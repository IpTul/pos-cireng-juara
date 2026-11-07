import { Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/utils';

interface Expense {
  id: number;
  description: string;
  amount: number;
  cabang: string | null;
  operator: string;
  created_at: string;
  can_modify: boolean;
}

interface Summary {
  cash_sales: number;
  expenses: number;
  balance: number;
}

interface PerCabang extends Omit<Summary, 'cash_sales'> {
  cabang: string;
  cash_sales: number;
}

interface Props {
  date: string;
  isToday: boolean;
  cabangName: string | null;
  canAdd: boolean;
  summary: Summary;
  perCabang: PerCabang[];
  expenses: Expense[];
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });
}

function balanceClass(value: number) {
  return value < 0 ? 'text-red-600' : 'text-green-600';
}

export default function ExpensesIndex({
  date,
  isToday,
  cabangName,
  canAdd,
  summary,
  perCabang,
  expenses,
}: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Expense | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const digits = (v: string) => v.replace(/\D/g, '');

  const changeDate = (value: string) => {
    if (!value) return;
    router.get('/pengeluaran', { date: value }, { preserveState: true });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    router.post(
      '/pengeluaran',
      { description, amount: Number(amount) },
      {
        preserveScroll: true,
        onSuccess: () => {
          setDescription('');
          setAmount('');
          setErrors({});
        },
        onError: (errs) => setErrors(errs),
        onFinish: () => setSaving(false),
      },
    );
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setEditDescription(expense.description);
    setEditAmount(String(expense.amount));
  };

  const saveEdit = () => {
    if (!editing) return;
    setSaving(true);
    router.put(
      `/pengeluaran/${editing.id}`,
      { description: editDescription, amount: Number(editAmount) },
      {
        preserveScroll: true,
        onSuccess: () => setEditing(null),
        onError: (errs) => toast.error(Object.values(errs)[0] as string),
        onFinish: () => setSaving(false),
      },
    );
  };

  const remove = () => {
    if (!deleting) return;
    setSaving(true);
    router.delete(`/pengeluaran/${deleting.id}`, {
      preserveScroll: true,
      onSuccess: () => setDeleting(null),
      onFinish: () => setSaving(false),
    });
  };

  return (
    <>
      <Head title="Pengeluaran" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Pengeluaran Tunai</h1>
            <p className="text-sm text-muted-foreground">
              {cabangName ?? 'Semua cabang'} · {isToday ? 'Hari ini' : date}
            </p>
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => changeDate(e.target.value)}
            className="w-auto"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Penjualan tunai</p>
            <p className="text-lg font-semibold">
              {formatRupiah(summary.cash_sales)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pengeluaran</p>
            <p className="text-lg font-semibold text-red-600">
              − {formatRupiah(summary.expenses)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Sisa uang tunai</p>
            <p
              className={`text-lg font-semibold ${balanceClass(summary.balance)}`}
            >
              {formatRupiah(summary.balance)}
            </p>
          </div>
        </div>

        {perCabang.length > 0 && (
          <div className="rounded-lg border">
            <p className="border-b px-3 py-2 text-sm font-medium">Per cabang</p>
            <ul className="divide-y">
              {perCabang.map((c) => (
                <li
                  key={c.cabang}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.cabang}</span>
                  <span className="text-muted-foreground">
                    {formatRupiah(c.cash_sales)} − {formatRupiah(c.expenses)}
                  </span>
                  <span className={`font-semibold ${balanceClass(c.balance)}`}>
                    {formatRupiah(c.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canAdd ? (
          <form
            onSubmit={submit}
            className="flex flex-col gap-3 rounded-lg border p-3"
          >
            <p className="text-sm font-medium">Catat pengeluaran baru</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="grid gap-1">
                <Label htmlFor="description">Keterangan</Label>
                <Input
                  id="description"
                  placeholder="mis. Beli gas 3kg"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && (
                  <p className="text-xs text-red-600">{errors.description}</p>
                )}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  placeholder="60000"
                  value={amount}
                  onChange={(e) => setAmount(digits(e.target.value))}
                />
                {errors.amount && (
                  <p className="text-xs text-red-600">{errors.amount}</p>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={saving || !description.trim() || !amount}
            >
              <Plus className="size-4" /> Simpan pengeluaran
            </Button>
          </form>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            {isToday
              ? 'Pilih cabang di sidebar untuk mencatat pengeluaran.'
              : 'Pengeluaran hanya bisa dicatat untuk hari ini.'}
          </p>
        )}

        <div className="rounded-lg border">
          <p className="border-b px-3 py-2 text-sm font-medium">
            Daftar pengeluaran ({expenses.length})
          </p>
          {expenses.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Belum ada pengeluaran.
            </p>
          ) : (
            <ul className="divide-y">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(e.created_at)} · {e.operator}
                      {!cabangName && e.cabang ? ` · ${e.cabang}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    − {formatRupiah(e.amount)}
                  </span>
                  {e.can_modify && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(e)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(e)}
                        aria-label="Hapus"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit pengeluaran</DialogTitle>
            <DialogDescription>Ubah keterangan atau jumlah.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <Input
              inputMode="numeric"
              value={editAmount}
              onChange={(e) => setEditAmount(digits(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button
              disabled={saving || !editDescription.trim() || !editAmount}
              onClick={saveEdit}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus pengeluaran?</DialogTitle>
            <DialogDescription>
              {deleting?.description} (
              {deleting && formatRupiah(deleting.amount)}) akan dihapus dan sisa
              tunai dihitung ulang.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button variant="destructive" disabled={saving} onClick={remove}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

ExpensesIndex.layout = {
  breadcrumbs: [{ title: 'Pengeluaran', href: '/pengeluaran' }],
};
