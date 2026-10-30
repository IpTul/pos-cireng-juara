import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Pencil,
  ChevronLeft,
  ChevronRight,
  History,
  Package,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface Product {
  id: number;
  name: string;
  stock: number;
  cabang_id: number;
  cabang: { name: string };
}

interface Adjustment {
  id: number;
  product: Product;
  operator_name: string | null;
  user: { name: string; operator_name: string } | null;
  type: 'increase' | 'decrease';
  quantity: number;
  reason: string | null;
  previous_stock: number;
  new_stock: number;
  created_at: string;
  edited_at?: string | null;
  edited_by?: string | null;
}

interface StockSummary {
  product_id: number;
  name: string;
  cabang: string | null;
  stock: number;
  stok_awal: number;
  tambahan: number;
  pengurangan: number;
  rusak: number;
  ke_double: number;
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
  stockSummary: StockSummary[];
  user: {
    id: number;
    name: string;
    operator_name: string;
    email: string;
    role: 'owner' | 'kasir' | 'produksi';
  };
  can: { create: boolean };
  filters?: {
    reason: string;
    period?: string;
    start_date?: string | null;
    end_date?: string | null;
  };
}

const INCREASE_REASONS = ['Stok Awal', 'Tambahan'] as const;
const DECREASE_REASONS = [
  'Pengurangan',
  'Rusak',
  'Ke double (konfirmasi owner)',
] as const;
const REASONS = [...INCREASE_REASONS, ...DECREASE_REASONS] as const;

type Period = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Semua waktu' },
  { value: 'today', label: 'Hari ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: '7days', label: '7 hari terakhir' },
  { value: '30days', label: '30 hari terakhir' },
  { value: 'custom', label: 'Pilih tanggal' },
];

type SummaryKey =
  'stok_awal' | 'tambahan' | 'pengurangan' | 'rusak' | 'ke_double';

const SUMMARY_COLUMNS: {
  key: SummaryKey;
  label: string;
  tone: 'plus' | 'minus';
}[] = [
  { key: 'stok_awal', label: 'Stok Awal', tone: 'plus' },
  { key: 'tambahan', label: 'Tambahan', tone: 'plus' },
  { key: 'pengurangan', label: 'Pengurangan', tone: 'minus' },
  { key: 'rusak', label: 'Rusak', tone: 'minus' },
  { key: 'ke_double', label: 'Ke Double', tone: 'minus' },
];

const SUMMARY_PER_PAGE = 15;

type View = 'riwayat' | 'ringkasan';

function valueClass(tone: 'plus' | 'minus', value: number) {
  if (value === 0) return 'text-muted-foreground';
  return tone === 'plus'
    ? 'font-medium text-green-600'
    : 'font-medium text-red-600';
}

/** Nomor halaman yang ditampilkan: 1 … (sekarang-1) sekarang (sekarang+1) … terakhir */
function getPageItems(current: number, total: number): (number | 'dots')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: (number | 'dots')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) items.push('dots');
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push('dots');
  items.push(total);

  return items;
}

/** Pagination yang dipakai di Riwayat dan Ringkasan supaya tampilannya sama. */
function Paginator({
  currentPage,
  totalPages,
  from,
  to,
  total,
  unit,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  unit: string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const itemCls =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-input bg-background px-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:min-w-9';
  const activeCls =
    'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground';

  return (
    <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Menampilkan {from}–{to} dari {total} {unit}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          className={itemCls}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageItems(currentPage, totalPages).map((item, i) =>
          item === 'dots' ? (
            <span key={`dots-${i}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={`${itemCls} ${item === currentPage ? activeCls : ''}`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className={itemCls}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

export default function StockIndex({
  adjustments,
  products,
  stockSummary,
  user,
  filters,
}: Props) {
  const { url } = usePage();

  const { cabangs, activeCabangId } = usePage().props as unknown as {
    cabangs: { id: number; name: string }[];
    activeCabangId: number | null;
  };
  const needsCabangPick = !activeCabangId;

  const [view, setView] = useState<View>('riwayat');
  const historyRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCabangId, setSelectedCabangId] = useState('');

  const isProduksi = user.role === 'produksi';
  const [editing, setEditing] = useState<Adjustment | null>(null);
  const [editType, setEditType] = useState<'increase' | 'decrease'>('increase');
  const [editQuantity, setEditQuantity] = useState('');
  const [editReason, setEditReason] = useState('');
  const editQty = parseInt(editQuantity, 10);
  const validEditQty = !Number.isNaN(editQty) && editQty >= 1;
  const editReasonOptions: readonly string[] =
    editType === 'increase' ? INCREASE_REASONS : DECREASE_REASONS;

  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [type, setType] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState('');
  const qty = parseInt(quantity, 10);
  const validQty = !Number.isNaN(qty) && qty >= 1;
  const [reason, setReason] = useState('');
  const [search] = useState('');

  const [reasonFilter, setReasonFilter] = useState(filters?.reason ?? 'all');
  const [period, setPeriod] = useState<Period>(
    (filters?.period as Period) ?? 'all',
  );
  const [startDate, setStartDate] = useState(filters?.start_date ?? '');
  const [endDate, setEndDate] = useState(filters?.end_date ?? '');

  const filterActive = reasonFilter !== 'all' || period !== 'all';
  const dateRangeInvalid = !!startDate && !!endDate && endDate < startDate;

  const appliedPeriod = (filters?.period as Period) ?? 'all';
  const periodLabel =
    appliedPeriod === 'custom'
      ? `${filters?.start_date ?? '...'} s/d ${filters?.end_date ?? '...'}`
      : (PERIODS.find((p) => p.value === appliedPeriod)?.label ??
        'Semua waktu');

  // Ringkasan: total semua produk + pagination di sisi tampilan
  const summaryTotals = stockSummary.reduce(
    (t, r) => ({
      stok_awal: t.stok_awal + r.stok_awal,
      tambahan: t.tambahan + r.tambahan,
      pengurangan: t.pengurangan + r.pengurangan,
      rusak: t.rusak + r.rusak,
      ke_double: t.ke_double + r.ke_double,
    }),
    { stok_awal: 0, tambahan: 0, pengurangan: 0, rusak: 0, ke_double: 0 },
  );

  const [summaryPage, setSummaryPage] = useState(1);
  const summaryLastPage = Math.max(
    1,
    Math.ceil(stockSummary.length / SUMMARY_PER_PAGE),
  );
  // Kalau produk berkurang (ganti cabang/periode), halaman otomatis disesuaikan
  const currentSummaryPage = Math.min(summaryPage, summaryLastPage);
  const summaryOffset = (currentSummaryPage - 1) * SUMMARY_PER_PAGE;
  const pagedSummary = stockSummary.slice(
    summaryOffset,
    summaryOffset + SUMMARY_PER_PAGE,
  );

  function goToSummaryPage(page: number) {
    setSummaryPage(page);
    summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goToHistoryPage(page: number) {
    const target = new URL(url, window.location.origin);
    if (page > 1) target.searchParams.set('page', String(page));
    else target.searchParams.delete('page');

    router.get(
      target.pathname + target.search,
      {},
      {
        only: ['adjustments'],
        preserveState: true,
        preserveScroll: true,
        onSuccess: () =>
          historyRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
      },
    );
  }

  // Kirim semua filter sekaligus; `next` menimpa nilai state yang baru diubah
  function applyFilters(next: {
    reason?: string;
    period?: Period;
    start?: string;
    end?: string;
  }) {
    const r = next.reason ?? reasonFilter;
    const p = next.period ?? period;
    const s = next.start ?? startDate;
    const e = next.end ?? endDate;

    const params: Record<string, string> = {};
    if (r !== 'all') params.reason = r;
    if (p !== 'all') params.period = p;
    if (p === 'custom') {
      if (s) params.start_date = s;
      if (e) params.end_date = e;
    }

    router.get('/stok', params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  function handlePeriodChange(value: string) {
    const next = value as Period;
    setPeriod(next);
    // "Pilih tanggal" menunggu tombol Terapkan
    if (next !== 'custom') applyFilters({ period: next });
  }

  function resetFilters() {
    setReasonFilter('all');
    setPeriod('all');
    setStartDate('');
    setEndDate('');
    router.get(
      '/stok',
      {},
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      },
    );
  }

  const reasonOptions: readonly string[] =
    type === 'increase' ? INCREASE_REASONS : DECREASE_REASONS;

  function handleTypeChange(value: string) {
    const next = value as 'increase' | 'decrease';
    setType(next);

    const allowed: readonly string[] =
      next === 'increase' ? INCREASE_REASONS : DECREASE_REASONS;
    if (!allowed.includes(reason)) setReason('');
  }

  function handleReasonFilter(value: string) {
    setReasonFilter(value);
    applyFilters({ reason: value });
  }

  const filteredProducts = products
    .filter((p) => !needsCabangPick || String(p.cabang_id) === selectedCabangId)
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.cabang?.name || '').toLowerCase().includes(search.toLowerCase()),
    );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsCabangPick && !selectedCabangId) return;
    if (!selectedProductId || !validQty || !reason.trim()) return;

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
          setQuantity('');
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

  function openEdit(adj: Adjustment) {
    setEditing(adj);
    setEditType(adj.type);
    setEditQuantity(String(adj.quantity));
    setEditReason(adj.reason ?? '');
  }

  function handleEditTypeChange(value: string) {
    const next = value as 'increase' | 'decrease';
    setEditType(next);
    const allowed: readonly string[] =
      next === 'increase' ? INCREASE_REASONS : DECREASE_REASONS;
    if (!allowed.includes(editReason)) setEditReason('');
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !validEditQty || !editReason.trim()) return;

    router.put(
      `/stok/${editing.id}`,
      { type: editType, quantity: editQuantity, reason: editReason },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success('Riwayat stok berhasil diubah.');
          setEditing(null);
        },
        onError: (errors) => {
          toast.error(
            Object.values(errors).flat().join(', ') ||
              'Gagal mengubah riwayat.',
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

  const viewBtn = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
      active
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <>
      <Head title="Stok Cireng" />
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
          <h1 className="text-xl font-bold md:text-2xl">Stok Cireng</h1>
          <Button
            className="w-full sm:w-auto"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah / Kurangi Stok
          </Button>
        </div>

        {/* Dialog tambah / kurangi stok */}
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
                {needsCabangPick && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cabang</label>
                    <Select
                      value={selectedCabangId}
                      onValueChange={(v) => {
                        setSelectedCabangId(v);
                        setSelectedProductId(null); // ganti cabang = pilih produk ulang
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih cabang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cabangs.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Produk</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select
                      value={String(selectedProductId || '')}
                      onValueChange={(v) =>
                        setSelectedProductId(v ? Number(v) : null)
                      }
                      disabled={needsCabangPick && !selectedCabangId}
                    >
                      <SelectTrigger className="w-full pl-9">
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
                  <Select value={type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-full">
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
                    inputMode="numeric"
                    min={1}
                    value={quantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Alasan <span className="text-destructive">*</span>
                  </label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih alasan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    (needsCabangPick && !selectedCabangId) ||
                    !selectedProductId ||
                    !validQty ||
                    !reason.trim()
                  }
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog edit riwayat (khusus produksi) */}
        <Dialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Riwayat Stok</DialogTitle>
              <DialogDescription>
                {editing?.product.name} • stok produk akan ikut disesuaikan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Perubahan</label>
                <Select value={editType} onValueChange={handleEditTypeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Tambah Stok</SelectItem>
                    <SelectItem value="decrease">Kurang Stok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah</label>
                <Input
                  type="number"
                  min={1}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Alasan</label>
                <Select value={editReason} onValueChange={setEditReason}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih alasan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {editReasonOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={!validEditQty || !editReason.trim()}
                >
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Pilih tampilan: Riwayat / Ringkasan */}
        <div
          role="tablist"
          className="mb-4 flex w-full rounded-lg bg-muted p-1 sm:inline-flex sm:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'riwayat'}
            onClick={() => setView('riwayat')}
            className={viewBtn(view === 'riwayat')}
          >
            <History className="h-4 w-4" />
            Riwayat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'ringkasan'}
            onClick={() => setView('ringkasan')}
            className={viewBtn(view === 'ringkasan')}
          >
            <Package className="h-4 w-4" />
            Ringkasan per Produk
          </button>
        </div>

        {/* Filter */}
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2 md:p-4 lg:flex lg:flex-wrap lg:items-end">
          {view === 'riwayat' && (
            <div className="space-y-1 lg:w-64">
              <label className="text-sm font-medium">Alasan</label>
              <Select value={reasonFilter} onValueChange={handleReasonFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua alasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua alasan</SelectItem>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Lainnya (alasan lama)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1 lg:w-48">
            <label className="text-sm font-medium">Periode</label>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua waktu" />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Dari</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Sampai</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button
                type="button"
                className="w-full sm:col-span-2 lg:w-auto"
                disabled={(!startDate && !endDate) || dateRangeInvalid}
                onClick={() => applyFilters({ period: 'custom' })}
              >
                Terapkan
              </Button>
            </>
          )}

          {filterActive && (
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:col-span-2 lg:w-auto"
              onClick={resetFilters}
            >
              Reset
            </Button>
          )}

          {dateRangeInvalid && (
            <p className="text-sm text-destructive sm:col-span-2 lg:basis-full">
              Tanggal "Sampai" tidak boleh lebih awal dari "Dari".
            </p>
          )}
        </div>

        {/* ===================== RIWAYAT ===================== */}
        {view === 'riwayat' && (
          <section ref={historyRef} className="scroll-mt-16">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Riwayat Perubahan Stok</h2>
              <span className="text-sm text-muted-foreground">
                {adjustments.total} total
              </span>
            </div>

            {/* HP & tablet: kartu, tidak perlu geser */}
            <div className="lg:hidden">
              {adjustments.data.length === 0 ? (
                <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada riwayat perubahan stok.
                </div>
              ) : (
                <div className="space-y-3">
                  {adjustments.data.map((adj, index) => (
                    <div key={adj.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            #{adjustments.from + index}
                          </p>
                          <p className="font-medium break-words">
                            {adj.product.name}
                          </p>
                        </div>
                        {getTypeBadge(adj.type)}
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                          Jumlah{' '}
                          <span className="font-semibold text-foreground">
                            {adj.quantity}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {adj.previous_stock}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold">{adj.new_stock}</span>
                        </span>
                      </div>

                      <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Alasan</dt>
                          <dd className="text-right">
                            {adj.reason || '-'}
                            {adj.edited_at && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (diedit)
                              </span>
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Oleh</dt>
                          <dd className="text-right">
                            {adj.operator_name ??
                              adj.user?.operator_name ??
                              adj.user?.name ??
                              'User dihapus'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Waktu</dt>
                          <dd className="text-right">
                            {formatDate(adj.created_at)}
                          </dd>
                        </div>
                      </dl>

                      {isProduksi && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => openEdit(adj)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden overflow-x-auto rounded-lg border lg:block">
              <table className="w-full min-w-[900px] text-sm">
                <caption className="sr-only">
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
                    {isProduksi && (
                      <th className="px-4 py-3 text-center">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="whitespace-nowrap">
                  {adjustments.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isProduksi ? 9 : 8}
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
                        <td className="px-4 py-3 text-center">
                          {adj.quantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <span className="text-muted-foreground">
                              {adj.previous_stock}
                            </span>
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{adj.new_stock}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left">
                          {adj.reason || '-'}
                          {adj.edited_at && (
                            <span
                              className="ml-1 text-xs text-muted-foreground"
                              title={`Diedit oleh ${adj.edited_by ?? '-'} • ${formatDate(adj.edited_at)}`}
                            >
                              (diedit)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {adj.operator_name ??
                            adj.user?.operator_name ??
                            adj.user?.name ??
                            'User dihapus'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {formatDate(adj.created_at)}
                        </td>
                        {isProduksi && (
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(adj)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Paginator
              currentPage={adjustments.current_page}
              totalPages={adjustments.last_page}
              from={adjustments.from}
              to={adjustments.to}
              total={adjustments.total}
              unit="riwayat"
              onPageChange={goToHistoryPage}
            />
          </section>
        )}

        {/* ===================== RINGKASAN ===================== */}
        {view === 'ringkasan' && (
          <section ref={summaryRef} className="scroll-mt-16">
            <div className="mb-2">
              <h2 className="font-semibold">Ringkasan Stok per Produk</h2>
              <p className="text-sm text-muted-foreground">
                Periode: {periodLabel}
              </p>
            </div>

            {/* HP & tablet: kartu */}
            <div className="space-y-3 lg:hidden">
              {stockSummary.length === 0 ? (
                <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada produk.
                </div>
              ) : (
                <>
                  {pagedSummary.map((row) => (
                    <div key={row.product_id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium break-words">{row.name}</p>
                          {needsCabangPick && (
                            <p className="text-xs text-muted-foreground">
                              {row.cabang}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Stok: {row.stock}
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {SUMMARY_COLUMNS.map((c) => (
                          <div
                            key={c.key}
                            className="flex justify-between last:odd:col-span-2"
                          >
                            <dt className="text-muted-foreground">{c.label}</dt>
                            <dd className={valueClass(c.tone, row[c.key])}>
                              {row[c.key]}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}

                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="font-medium">Total semua produk</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {SUMMARY_COLUMNS.map((c) => (
                        <div
                          key={c.key}
                          className="flex justify-between last:odd:col-span-2"
                        >
                          <dt className="text-muted-foreground">{c.label}</dt>
                          <dd
                            className={valueClass(c.tone, summaryTotals[c.key])}
                          >
                            {summaryTotals[c.key]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </>
              )}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden overflow-x-auto rounded-lg border lg:block">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Produk</th>
                    {needsCabangPick && (
                      <th className="px-4 py-3 text-left">Cabang</th>
                    )}
                    {SUMMARY_COLUMNS.map((c) => (
                      <th key={c.key} className="px-4 py-3 text-center">
                        {c.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center">Stok Saat Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {stockSummary.length === 0 ? (
                    <tr>
                      <td
                        colSpan={needsCabangPick ? 9 : 8}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Belum ada produk.
                      </td>
                    </tr>
                  ) : (
                    pagedSummary.map((row, i) => (
                      <tr
                        key={row.product_id}
                        className="border-b last:border-0 hover:bg-muted/25"
                      >
                        <td className="px-4 py-3">{summaryOffset + i + 1}</td>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        {needsCabangPick && (
                          <td className="px-4 py-3">{row.cabang}</td>
                        )}
                        {SUMMARY_COLUMNS.map((c) => (
                          <td
                            key={c.key}
                            className={`px-4 py-3 text-center ${valueClass(c.tone, row[c.key])}`}
                          >
                            {row[c.key]}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-semibold">
                          {row.stock}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {stockSummary.length > 0 && (
                  <tfoot className="border-t bg-muted/50 font-semibold">
                    <tr>
                      <td
                        className="px-4 py-3"
                        colSpan={needsCabangPick ? 3 : 2}
                      >
                        Total semua produk
                      </td>
                      {SUMMARY_COLUMNS.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-center">
                          {summaryTotals[c.key]}
                        </td>
                      ))}
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <Paginator
              currentPage={currentSummaryPage}
              totalPages={summaryLastPage}
              from={stockSummary.length === 0 ? 0 : summaryOffset + 1}
              to={Math.min(
                summaryOffset + SUMMARY_PER_PAGE,
                stockSummary.length,
              )}
              total={stockSummary.length}
              unit="produk"
              onPageChange={goToSummaryPage}
            />
          </section>
        )}
      </div>
    </>
  );
}

StockIndex.layout = {
  breadcrumbs: [{ title: 'Stok Cireng', href: '/stok' }],
};
