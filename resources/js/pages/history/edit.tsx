import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Trash2,
  Package,
  Gift,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  cabang?: { id: number; name: string };
  isSide?: boolean;
}

interface Pack {
  id: number;
  name: string;
  price: number;
  max_items: number;
  is_active: boolean;
  pack_items: Array<{
    id: number;
    product_id: number;
    quantity: number;
    product: Product;
  }>;
}

interface Addon {
  id: number;
  name: string;
  price: number;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  points: number;
}

interface Cabang {
  id: number;
  name: string;
}

interface SaleItem {
  id?: number;
  type: 'product' | 'pack' | 'addon';
  product_id?: number;
  pack_id?: number;
  addon_id?: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  is_free: boolean;
  pack_variants?: Array<{
    product_id: number;
    name: string;
    quantity: number;
  }>;
}

interface Sale {
  id: number;
  customer_name: string;
  member_id: number | null;
  member: Member | null;
  total: number;
  cash_tendered: number;
  change_amount: number;
  payment_method: 'cash' | 'qris' | 'grab' | 'gofood';
  status: string;
  notes: string | null;
  operator_name: string;
  cabang_id: number | null;
  created_at: string;
  affects_stock?: boolean;
  items: SaleItem[];
}

interface Props {
  sale: Sale;
  products: Product[];
  packs: Pack[];
  addons: Addon[];
  members: Member[];
  cabangs: Cabang[];
  user: {
    id: number;
    name: string;
    role: 'owner' | 'kasir';
  };
  canEditAll: boolean;
}

/**
 * Input angka yang boleh dikosongkan saat mengetik (mis. hapus "1" lalu
 * ketik "20"). Nilai baru dikirim ke induk hanya kalau angkanya valid;
 * kalau dibiarkan kosong, saat keluar dari kolom nilainya kembali ke semula.
 */
function NumberInput({
  value,
  onCommit,
  min = 0,
  ...rest
}: {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
} & Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'min'
>) {
  const [text, setText] = useState(String(value));

  // Ikuti nilai dari induk (mis. perubahan ditolak atau diubah dari tempat lain)
  useEffect(() => {
    setText((current) =>
      current !== '' && Number(current) === value ? current : String(value),
    );
  }, [value]);

  return (
    <Input
      {...rest}
      type="number"
      min={min}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n) && n >= min) {
          onCommit(n);
        }
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

export default function HistoryEdit(props: Props) {
  const { sale, products, packs, addons, cabangs, canEditAll } = props;

  const [customerName, setCustomerName] = useState(sale.customer_name || '');
  const [memberId, setMemberId] = useState<string>(
    sale.member_id?.toString() || '',
  );
  const [paymentMethod, setPaymentMethod] = useState(sale.payment_method);
  const [cashTendered, setCashTendered] = useState(
    sale.cash_tendered.toString(),
  );
  const [notes, setNotes] = useState(sale.notes || '');
  const [status, setStatus] = useState(sale.status);
  const [cabangId, setCabangId] = useState<string>(
    sale.cabang_id?.toString() || '',
  );
  const [items, setItems] = useState<SaleItem[]>(sale.items);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemType, setNewItemType] = useState<'product' | 'pack' | 'addon'>(
    'product',
  );
  const [newProductId, setNewProductId] = useState('');
  const [newPackId, setNewPackId] = useState('');
  const [newAddonId, setNewAddonId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [packVariants, setPackVariants] = useState<
    Array<{ product_id: number; quantity: number }>
  >([]);
  const [showPackVariantModal, setShowPackVariantModal] = useState<{
    open: boolean;
    packId?: number;
    itemIndex?: number;
  }>({ open: false });
  const [memberSearch, setMemberSearch] = useState(sale.member?.name ?? '');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.stock > 0 ||
          p.isSide ||
          sale.items.some((it) => it.product_id === p.id),
      ),
    [products, sale.items],
  );

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const isSettled =
    paymentMethod === 'qris' ||
    paymentMethod === 'grab' ||
    paymentMethod === 'gofood';

  const cash = parseFloat(cashTendered) || 0;
  const change = cash - subtotal;

  // Reset cashTendered when switching to settled payment method
  useEffect(() => {
    if (isSettled) {
      setCashTendered(subtotal.toString());
    }
  }, [isSettled, subtotal]);

  const canSubmit = useMemo(() => {
    const nameOk = !canEditAll || customerName.trim().length > 0;
    if (isSettled) return items.length > 0 && nameOk;
    return items.length > 0 && nameOk && cash >= subtotal;
  }, [items, customerName, cash, subtotal, isSettled, canEditAll]);

  // Member search
  useEffect(() => {
    if (!memberSearch.trim() || memberSearch.length < 2) {
      setMemberResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/members/search?q=${encodeURIComponent(memberSearch)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setMemberResults(data);
        }
      } catch (e) {
        console.error('Member search failed:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  function handleMemberSelect(member: Member) {
    setMemberId(member.id.toString());
    setMemberSearch(member.name);
    setMemberResults([]);
    setShowMemberDropdown(false);
  }

  function handleMemberClear() {
    setMemberId('');
    setMemberSearch('');
    setMemberResults([]);
  }

  function formatRupiah(value: number) {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
  }

  function getProductName(productId: number) {
    return products.find((p) => p.id === productId)?.name || '-';
  }

  function getAddonName(addonId: number) {
    return addons.find((a) => a.id === addonId)?.name || '-';
  }

  function getProductPrice(productId: number) {
    return products.find((p) => p.id === productId)?.price || 0;
  }

  function getAddonPrice(addonId: number) {
    return addons.find((a) => a.id === addonId)?.price || 0;
  }

  function getProductStock(productId: number) {
    return products.find((p) => p.id === productId)?.stock || 0;
  }

  function getPackMaxItems(packId: number) {
    return packs.find((p) => p.id === packId)?.max_items || 0;
  }

  function getPackItems(packId: number) {
    const pack = packs.find((p) => p.id === packId);
    return pack?.pack_items || [];
  }

  function updateItemQuantity(index: number, quantity: number) {
    if (quantity < 1) {
      removeItem(index);
      return;
    }
    const newItems = [...items];
    const item = newItems[index];

    // Validasi stok (server tetap yang memutuskan). Stok yang dipakai
    // transaksi ini sebelum diedit dianggap tersedia kembali.
    // Item gratis juga mengurangi stok (sama seperti saat checkout)
    const need = new Map<number, number>();
    const add = (productId: number, qty: number) =>
      need.set(productId, (need.get(productId) ?? 0) + qty);

    items.forEach((it, i) => {
      const q = i === index ? quantity : it.quantity;
      if (it.type === 'product' && it.product_id) add(it.product_id, q);
      if (it.type === 'pack')
        (it.pack_variants ?? []).forEach((v) =>
          add(v.product_id, v.quantity * q),
        );
    });

    const back = new Map<number, number>();
    sale.items.forEach((it) => {
      if (it.type === 'product' && it.product_id)
        back.set(it.product_id, (back.get(it.product_id) ?? 0) + it.quantity);
      if (it.type === 'pack')
        (it.pack_variants ?? []).forEach((v) =>
          back.set(
            v.product_id,
            (back.get(v.product_id) ?? 0) + v.quantity * it.quantity,
          ),
        );
    });

    // Transaksi hari stok lama tidak mengubah stok, jadi tidak perlu dicek
    for (const [productId, qty] of sale.affects_stock === false ? [] : need) {
      const available = getProductStock(productId) + (back.get(productId) ?? 0);
      if (qty > available) {
        toast.error(
          `Stok "${getProductName(productId)}" tidak mencukupi (tersedia ${available})`,
        );
        return;
      }
    }

    newItems[index] = {
      ...item,
      quantity,
      subtotal: item.is_free ? 0 : item.unit_price * quantity,
    };
    setItems(newItems);
  }

  function changeItemProduct(index: number, productId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const newItems = [...items];
    const item = newItems[index];
    const unit = item.is_free ? 0 : product.price;
    newItems[index] = {
      ...item,
      product_id: productId,
      product_name: item.is_free ? `[GRATIS] ${product.name}` : product.name,
      unit_price: unit,
      subtotal: unit * item.quantity,
    };
    setItems(newItems);
  }

  function removeItem(index: number) {
    if (!canEditAll) return; // Kasir tidak boleh menghapus baris
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  }

  function handleAddItem() {
    if (newItemType === 'product' && newProductId) {
      const productId = parseInt(newProductId);
      const existingIndex = items.findIndex(
        (i) => i.type === 'product' && i.product_id === productId && !i.is_free,
      );
      if (existingIndex >= 0) {
        updateItemQuantity(
          existingIndex,
          items[existingIndex].quantity + newQuantity,
        );
      } else {
        const stock = getProductStock(productId);
        if (newQuantity > stock) {
          toast.error(
            `Stok "${getProductName(productId)}" hanya tersisa ${stock}`,
          );
          return;
        }
        const price = getProductPrice(productId);
        setItems([
          ...items,
          {
            type: 'product',
            product_id: productId,
            product_name: getProductName(productId),
            unit_price: price,
            quantity: newQuantity,
            subtotal: price * newQuantity,
            is_free: false,
          },
        ]);
      }
      resetNewItemForm();
    } else if (newItemType === 'pack' && newPackId) {
      setShowPackVariantModal({ open: true, packId: parseInt(newPackId) });
    } else if (newItemType === 'addon' && newAddonId) {
      const addonId = parseInt(newAddonId);
      const existingIndex = items.findIndex(
        (i) => i.type === 'addon' && i.addon_id === addonId,
      );
      if (existingIndex >= 0) {
        updateItemQuantity(
          existingIndex,
          items[existingIndex].quantity + newQuantity,
        );
      } else {
        const price = getAddonPrice(addonId);
        setItems([
          ...items,
          {
            type: 'addon',
            addon_id: addonId,
            product_name: `[ADDON] ${getAddonName(addonId)}`,
            unit_price: price,
            quantity: newQuantity,
            subtotal: price * newQuantity,
            is_free: false,
          },
        ]);
      }
      resetNewItemForm();
    }
  }

  function handlePackVariantConfirm(
    variants: Array<{ product_id: number; quantity: number }>,
  ) {
    if (!showPackVariantModal.packId) return;
    const packId = showPackVariantModal.packId;
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;

    // Validate stock (quantity per pack * pack quantity)
    for (const variant of variants) {
      const stock = getProductStock(variant.product_id);
      const required = variant.quantity * newQuantity;
      if (required > stock) {
        toast.error(
          `Stok "${getProductName(variant.product_id)}" hanya tersisa ${stock} (butuh ${required} untuk ${newQuantity} paket)`,
        );
        return;
      }
    }

    if (variants.length > pack.max_items) {
      toast.error(`Maksimal ${pack.max_items} item untuk paket ini`);
      return;
    }

    const existingIndex = items.findIndex(
      (i) => i.type === 'pack' && i.pack_id === packId,
    );
    const variantsWithNames = variants.map((v) => ({
      ...v,
      name: getProductName(v.product_id),
    }));

    if (existingIndex >= 0) {
      updateItemQuantity(
        existingIndex,
        items[existingIndex].quantity + newQuantity,
      );
      // Update variants
      const newItems = [...items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        pack_variants: variantsWithNames,
      };
      setItems(newItems);
    } else {
      setItems([
        ...items,
        {
          type: 'pack',
          pack_id: packId,
          product_name: `[Paket] ${pack.name}`,
          unit_price: pack.price,
          quantity: newQuantity,
          subtotal: pack.price * newQuantity,
          is_free: false,
          pack_variants: variantsWithNames,
        },
      ]);
    }
    resetNewItemForm();
    setShowPackVariantModal({ open: false });
  }

  // Kosongkan isian saja (jenis item dan dialog tetap)
  function resetNewItemFields() {
    setNewProductId('');
    setNewPackId('');
    setNewAddonId('');
    setNewQuantity(1);
    setPackVariants([]);
  }

  // Kosongkan isian, kembali ke "Produk", dan tutup dialog
  function resetNewItemForm() {
    setNewItemType('product');
    resetNewItemFields();
    setShowAddItem(false);
  }

  async function handleSubmit() {
    if (canEditAll && !customerName.trim()) {
      setError('Nama customer wajib diisi.');
      return;
    }
    if (!isSettled && cash < subtotal) {
      setError('Uang tunai kurang dari total.');
      return;
    }
    if (items.length === 0) {
      setError('Minimal 1 item diperlukan.');
      return;
    }
    setError(null);
    setProcessing(true);

    const payload = {
      payment_method: paymentMethod,
      cash_tendered: isSettled ? Math.round(subtotal) : Math.round(cash),
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        product_id: item.product_id,
        pack_id: item.pack_id,
        addon_id: item.addon_id,
        quantity: item.quantity,
        is_free: item.is_free,
        pack_variants: item.pack_variants,
      })),
      ...(canEditAll ? { customer_name: customerName.trim() } : {}),
      ...(canEditAll
        ? { member_id: memberId ? parseInt(memberId) : null }
        : {}),
      ...(canEditAll ? { notes } : {}),
      ...(canEditAll && status ? { status } : {}),
      ...(canEditAll && cabangId ? { cabang_id: parseInt(cabangId) } : {}),
    };

    try {
      await router.put(`/history/${sale.id}`, payload, {
        onSuccess: () => {
          toast.success('Transaksi berhasil diperbarui');
        },
        onError: (errors) => {
          setError(Object.values(errors).flat()[0] as string);
          toast.error('Gagal memperbarui transaksi');
        },
        onFinish: () => setProcessing(false),
      });
    } catch (e) {
      setProcessing(false);
      toast.error('Terjadi kesalahan');
    }
  }

  function handleCancel() {
    window.history.back();
  }

  return (
    <>
      <Head title="Edit Transaksi" />
      <div className="min-w-0 overflow-x-hidden p-3 md:p-6">
        <div className="mb-4 flex items-center gap-4">
          <Link
            href="/history"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Transaksi</h1>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          {/* Left: Form */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Item Transaksi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    Belum ada item. Tambahkan produk, paket, atau addon.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {item.type === 'pack' && (
                              <Package className="h-4 w-4 text-primary" />
                            )}
                            {item.type === 'addon' && (
                              <Tag className="h-4 w-4 text-orange-500" />
                            )}
                            {!!item.is_free && (
                              <Gift className="h-4 w-4 text-green-600" />
                            )}
                            {item.type === 'product' ? (
                              <Select
                                value={String(item.product_id ?? '')}
                                onValueChange={(v) =>
                                  changeItemProduct(index, parseInt(v))
                                }
                              >
                                <SelectTrigger className="h-8 w-full max-w-60">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredProducts.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="truncate font-medium">
                                {item.product_name}
                              </span>
                            )}
                          </div>
                          {item.pack_variants &&
                            item.pack_variants.length > 0 && (
                              <div className="mt-1 ml-6 text-xs text-muted-foreground">
                                {item.pack_variants.map((v, vi) => (
                                  <div key={vi}>
                                    - {v.name} ×{v.quantity}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor={`qty-${index}`} className="sr-only">
                            Quantity
                          </Label>
                          <NumberInput
                            id={`qty-${index}`}
                            min={1}
                            value={item.quantity}
                            onCommit={(n) =>
                              updateItemQuantity(index, Math.floor(n))
                            }
                            className="w-20 text-center"
                          />
                          {canEditAll && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="text-right font-medium sm:w-32">
                          {formatRupiah(item.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canEditAll && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddItem(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Item
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Customer & Member */}
            <Card>
              <CardHeader>
                <CardTitle>Customer & Member</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nama Customer</Label>
                  <Input
                    id="customer_name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Masukkan nama customer"
                    disabled={!canEditAll}
                  />
                </div>

                {canEditAll && (
                  <div className="space-y-2">
                    <Label htmlFor="member_search">Member (opsional)</Label>
                    <div className="relative">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="member_search"
                        type="tel"
                        placeholder="Cari member by nama/no HP..."
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value);
                          setShowMemberDropdown(true);
                        }}
                        onFocus={() =>
                          setShowMemberDropdown(memberResults.length > 0)
                        }
                        onBlur={() =>
                          setTimeout(() => setShowMemberDropdown(false), 200)
                        }
                        className="pl-9"
                      />
                    </div>
                    {memberId && (
                      <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-green-800">
                                {memberSearch}
                              </p>
                              <p className="text-xs text-green-600">
                                Member terpilih
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleMemberClear}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {showMemberDropdown && memberResults.length > 0 && (
                      <div className="z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
                        {memberResults.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            className="w-full rounded px-3 py-2 text-left transition-colors hover:bg-accent"
                            onClick={() => handleMemberSelect(member)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {member.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.phone}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-primary">
                                {member.points} poin
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!canEditAll && sale.member && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="font-medium text-green-800">
                      {sale.member.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {sale.member.phone} • {sale.member.points} poin
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment & Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Pembayaran & Catatan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['cash', 'qris', 'grab', 'gofood'] as const).map(
                      (method) => (
                        <Button
                          key={method}
                          variant={
                            paymentMethod === method ? 'default' : 'outline'
                          }
                          onClick={() => setPaymentMethod(method)}
                          className="gap-2"
                        >
                          {method === 'cash' && <span>💵</span>}
                          {method === 'qris' && <span>📱</span>}
                          {method === 'grab' && <span>🛵</span>}
                          {method === 'gofood' && <span>🛵</span>}
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </Button>
                      ),
                    )}
                  </div>
                </div>

                {!isSettled && (
                  <div className="space-y-2">
                    <Label htmlFor="cash_tendered">Uang Tunai</Label>
                    <Input
                      id="cash_tendered"
                      type="number"
                      step={500}
                      min={Math.round(subtotal)}
                      placeholder="0"
                      value={cashTendered}
                      onChange={(e) => {
                        setCashTendered(e.target.value);
                        setError(null);
                      }}
                    />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Kembalian</span>
                      <span
                        className={
                          change >= 0 ? 'text-green-600' : 'text-destructive'
                        }
                      >
                        {formatRupiah(change)}
                      </span>
                    </div>
                  </div>
                )}

                {isSettled && (
                  <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                    <span className="text-muted-foreground">
                      Total via {paymentMethod.toUpperCase()}
                    </span>
                    <span className="font-bold">{formatRupiah(subtotal)}</span>
                  </div>
                )}

                {canEditAll && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Catatan (opsional)</Label>
                      <Input
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan tambahan..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cabang_id">Cabang</Label>
                      <Select value={cabangId} onValueChange={setCabangId}>
                        <SelectTrigger id="cabang_id">
                          <SelectValue placeholder="Pilih cabang" />
                        </SelectTrigger>
                        <SelectContent>
                          {cabangs.map((cabang) => (
                            <SelectItem
                              key={cabang.id}
                              value={cabang.id.toString()}
                            >
                              {cabang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Item</span>
                    <span>{totalItems}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Bayar</span>
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <p className="font-medium">Operator: {sale.operator_name}</p>
                  <p className="text-muted-foreground">
                    Dibuat:{' '}
                    {new Date(sale.created_at).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  {sale.cabang_id && (
                    <p className="text-muted-foreground">
                      Cabang:{' '}
                      {cabangs.find((c) => c.id === sale.cabang_id)?.name}
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancel}
                  >
                    Batal
                  </Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    disabled={!canSubmit || processing}
                    onClick={handleSubmit}
                  >
                    {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Item Dialog */}
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                {(['product', 'pack', 'addon'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={newItemType === type ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => {
                      setNewItemType(type);
                      resetNewItemFields();
                    }}
                  >
                    {type === 'product' && 'Produk'}
                    {type === 'pack' && 'Paket'}
                    {type === 'addon' && 'Addon'}
                  </Button>
                ))}
              </div>

              {newItemType === 'product' && (
                <div className="space-y-2">
                  <Label>Produk</Label>
                  <Select value={newProductId} onValueChange={setNewProductId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem
                          key={product.id}
                          value={product.id.toString()}
                        >
                          {product.name} - {formatRupiah(product.price)} (Stok:{' '}
                          {product.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newItemType === 'pack' && (
                <div className="space-y-2">
                  <Label>Paket</Label>
                  <Select value={newPackId} onValueChange={setNewPackId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih paket" />
                    </SelectTrigger>
                    <SelectContent>
                      {packs.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id.toString()}>
                          {pack.name} - {formatRupiah(pack.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newItemType === 'addon' && (
                <div className="space-y-2">
                  <Label>Addon</Label>
                  <Select value={newAddonId} onValueChange={setNewAddonId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih addon" />
                    </SelectTrigger>
                    <SelectContent>
                      {addons.map((addon) => (
                        <SelectItem key={addon.id} value={addon.id.toString()}>
                          {addon.name} - {formatRupiah(addon.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Quantity</Label>
                <NumberInput
                  min={1}
                  value={newQuantity}
                  onCommit={(n) => setNewQuantity(Math.floor(n))}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetNewItemForm}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddItem}
                  disabled={!canAddItem()}
                >
                  Tambah
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pack Variant Modal */}
        <Dialog
          open={showPackVariantModal.open}
          onOpenChange={(open) =>
            setShowPackVariantModal({ ...showPackVariantModal, open })
          }
        >
          <DialogContent className="max-h-[80vh] max-w-md">
            <DialogHeader>
              <DialogTitle>Pilih Varian Paket</DialogTitle>
            </DialogHeader>
            {showPackVariantModal.packId && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Pilih maksimal {getPackMaxItems(showPackVariantModal.packId)}{' '}
                  item
                </p>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {getPackItems(showPackVariantModal.packId).map((pi) => {
                    const currentQty =
                      packVariants.find((v) => v.product_id === pi.product_id)
                        ?.quantity || 0;
                    const maxQty = Math.floor(pi.product.stock / newQuantity); // max per pack
                    return (
                      <div
                        key={pi.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{pi.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stok: {pi.product.stock} • Default: {pi.quantity} •
                            Max/paket: {maxQty}
                          </p>
                        </div>
                        <NumberInput
                          min={0}
                          max={maxQty}
                          value={currentQty}
                          onCommit={(n) => {
                            const qty = Math.floor(n);
                            const others = packVariants.filter(
                              (v) => v.product_id !== pi.product_id,
                            );
                            setPackVariants(
                              qty === 0
                                ? others
                                : [
                                    ...others,
                                    {
                                      product_id: pi.product_id,
                                      quantity: qty,
                                    },
                                  ],
                            );
                          }}
                          className="w-20 text-center"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPackVariantModal({ open: false })}
                  >
                    Batal
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handlePackVariantConfirm(packVariants)}
                    disabled={packVariants.length === 0}
                  >
                    Konfirmasi
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );

  function canAddItem() {
    if (newItemType === 'product') return !!newProductId;
    if (newItemType === 'pack') return !!newPackId;
    if (newItemType === 'addon') return !!newAddonId;
    return false;
  }
}

HistoryEdit.layout = {
  breadcrumbs: [
    { title: 'Riwayat Penjualan', href: '/history' },
    { title: 'Edit Transaksi' },
  ],
};
