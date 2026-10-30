import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2,
  Package,
  Gift,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  CartItem,
  PackCartItem,
  Product,
  Addon,
  AddonSelection,
  PackVariant,
} from '@/types';
import FreeProductModal from './free-product-modal';
import PackVariantModal from './pack-variant-modal';
import { FreeItemSelection } from './use-cart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  items: (
    | (CartItem & {
        freeQuantity?: number;
        totalQuantity?: number;
        freeItems?: FreeItemSelection[];
      })
    | (PackCartItem & {
        freeQuantity?: number;
        totalQuantity?: number;
        freeItems?: FreeItemSelection[];
        variants?: PackVariant[];
      })
  )[];
  subtotal: number;
  totalItems: number;
  onRemoveProduct: (productId: number) => void;
  onRemovePack: (packId: number) => void;
  onSetProductQuantity: (productId: number, qty: number) => void;
  onSetPackQuantity: (packId: number, qty: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  products: Product[];
  availableAddons: Addon[];
  cartAddons: AddonSelection[];
  onSetFreeItems: (freeItems: FreeItemSelection[]) => void;
  onAddAddon: (addon: Addon) => void;
  onRemoveAddon: (addonId: number) => void;
  onSetPackVariants: (packId: number, variants: PackVariant[]) => void;
}

function isCartItem(item: Props['items'][0]): item is CartItem & {
  freeQuantity?: number;
  totalQuantity?: number;
  freeItems?: FreeItemSelection[];
} {
  return 'product' in item;
}

function isPackCartItem(item: Props['items'][0]): item is PackCartItem & {
  freeQuantity?: number;
  totalQuantity?: number;
  freeItems?: FreeItemSelection[];
  variants?: PackVariant[];
} {
  return 'pack' in item;
}

function formatRupiah(value: string | number) {
  return `Rp${Math.round(Number(value)).toLocaleString('id-ID')}`;
}

function QuantityStepper({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (qty: number) => void;
}) {
  const arrow =
    'flex flex-1 items-center justify-center text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-30';

  return (
    <>
      {/* PC (mouse): tampilan lama */}
      <Input
        type="number"
        min={1}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="hidden w-16 text-center desk:flex [@media(max-height:500px)]:h-8"
      />

      {/* HP & tablet: kotak angka + panah naik/turun */}
      <div className="flex h-14 items-stretch overflow-hidden rounded-md border desk:hidden [@media(max-height:500px)]:h-10">
        <Input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          max={max}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="h-full w-11 [appearance:textfield] rounded-none border-0 px-1 text-center shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div className="flex w-8 flex-col border-l">
          <button
            type="button"
            aria-label="Tambah jumlah"
            disabled={disabled || value >= max}
            onClick={() => onChange(value + 1)}
            className={arrow}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Kurangi jumlah"
            disabled={disabled || value <= 1}
            onClick={() => onChange(value - 1)}
            className={`${arrow} border-t`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function CartPanel({
  items,
  subtotal,
  totalItems,
  onRemoveProduct,
  onRemovePack,
  onSetProductQuantity,
  onSetPackQuantity,
  onClear,
  onCheckout,
  products,
  availableAddons,
  cartAddons,
  onSetFreeItems,
  onAddAddon,
  onRemoveAddon,
  onSetPackVariants,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedMaxFree, setSelectedMaxFree] = useState(0);
  const [selectedCurrentFree, setSelectedCurrentFree] = useState<
    FreeItemSelection[]
  >([]);
  const [packVariantModal, setPackVariantModal] = useState<{
    open: boolean;
    pack: any | null;
    variants: PackVariant[] | null;
  }>({
    open: false,
    pack: null,
    variants: null,
  });
  const [freeWarningOpen, setFreeWarningOpen] = useState(false);

  // Jumlah gratis yang menjadi hak pelanggan vs yang sudah dipilih
  const freeEntitled = items.reduce((s, i) => s + (i.freeQuantity || 0), 0);
  const freeChosen = items.reduce(
    (s, i) => s + (i.freeItems || []).reduce((a, f) => a + f.quantity, 0),
    0,
  );
  const freeMissing = Math.max(0, freeEntitled - freeChosen);

  function openPackVariantModal(packItem: any, variants: PackVariant[] = []) {
    setPackVariantModal({
      open: true,
      pack: packItem.pack,
      variants: variants,
    });
  }

  function handlePackVariantsConfirm(variants: PackVariant[]) {
    if (packVariantModal.pack && packVariantModal.variants !== null) {
      onSetPackVariants(packVariantModal.pack.id, variants);
    }
    setPackVariantModal({ open: false, pack: null, variants: null });
  }

  function handlePackVariantsCancel() {
    setPackVariantModal({ open: false, pack: null, variants: null });
  }

  function openFreeModal(item: Props['items'][0]) {
    const freeQty = item.freeQuantity || 0;
    if (freeQty > 0) {
      const itemId = isCartItem(item) ? item.product.id : item.pack.id;
      const itemName = isCartItem(item) ? item.product.name : item.pack.name;
      setSelectedItemId(itemId);
      setSelectedItemName(itemName);
      setSelectedMaxFree(freeQty);
      setSelectedCurrentFree(item.freeItems || []);
      setModalOpen(true);
    }
  }

  function handleFreeItemsConfirm(freeItems: FreeItemSelection[]) {
    onSetFreeItems(freeItems);
    setModalOpen(false);
  }

  function handleCheckoutClick() {
    if (freeMissing > 0) {
      setFreeWarningOpen(true);
      return;
    }
    onCheckout();
  }

  function handleChooseFreeNow() {
    const itemWithFree = items.find((i) => (i.freeQuantity || 0) > 0);
    setFreeWarningOpen(false);
    if (itemWithFree) openFreeModal(itemWithFree);
  }

  function handleCheckoutWithoutFree() {
    setFreeWarningOpen(false);
    onCheckout();
  }

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col bg-card md:w-80 md:shrink-0 md:border-l [@media(max-height:500px)]:md:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3 [@media(max-height:500px)]:py-1.5">
          <h2 className="font-semibold">Keranjang</h2>
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Kosongkan
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [@media(max-height:500px)]:p-2">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada item.
            </p>
          ) : (
            items.map((item, index) => {
              const freeQty = item.freeQuantity ?? 0;
              const pickedFree = (item.freeItems ?? []).reduce(
                (s, f) => s + f.quantity,
                0,
              );
              const freeDone = freeQty > 0 && pickedFree >= freeQty;

              return (
                <div
                  key={index}
                  className="rounded-xl border bg-background p-3 [@media(max-height:500px)]:p-2"
                >
                  {/* Nama, harga, hapus */}
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isPackCartItem(item) && (
                          <Package className="h-4 w-4 shrink-0 text-primary" />
                        )}
                        <p className="text-base font-semibold break-words">
                          {isCartItem(item)
                            ? item.product.name
                            : item.pack.name}
                        </p>
                      </div>

                      {isCartItem(item) ? (
                        <p className="text-sm text-muted-foreground">
                          {formatRupiah(item.product.price)}
                        </p>
                      ) : (
                        <>
                          <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                            {item.variants && item.variants.length > 0 ? (
                              item.variants.map((variant, idx) => (
                                <p key={idx}>
                                  {variant.product.name} ×{variant.quantity}
                                </p>
                              ))
                            ) : (
                              <p>
                                {item.pack.pack_items
                                  ?.map(
                                    (pi) =>
                                      `${pi.product.name} ×${pi.quantity}`,
                                  )
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 h-9"
                            onClick={() =>
                              openPackVariantModal(item, item.variants || [])
                            }
                          >
                            Ubah isi paket
                          </Button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label="Hapus dari keranjang"
                      onClick={() => {
                        if (isCartItem(item)) {
                          onRemoveProduct(item.product.id);
                        } else {
                          onRemovePack(item.pack.id);
                        }
                      }}
                      className="-mt-1 -mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 active:bg-destructive/20"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Tombol pilih produk gratis: besar, selebar kartu */}
                  {freeQty > 0 && (
                    <button
                      type="button"
                      onClick={() => openFreeModal(item)}
                      className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-colors active:scale-[0.99] ${
                        freeDone
                          ? 'border-green-600/40 bg-green-600/10 text-green-600'
                          : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <Gift className="h-4 w-4" />
                      {freeDone
                        ? `Gratis ${freeQty} sudah dipilih · Ubah`
                        : `Pilih Gratis (${freeQty - pickedFree} lagi)`}
                    </button>
                  )}

                  {item.stock <= 0 && (
                    <p className="mt-2 text-sm text-destructive">
                      Stok habis — produk tidak dapat ditambahkan
                    </p>
                  )}

                  {/* Jumlah dan total */}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <QuantityStepper
                      value={item.quantity}
                      max={
                        item.stock <= 0
                          ? 0
                          : isCartItem(item)
                            ? item.product.stock
                            : 999
                      }
                      disabled={item.stock <= 0}
                      onChange={(qty) => {
                        if (isCartItem(item)) {
                          onSetProductQuantity(item.product.id, qty);
                        } else {
                          onSetPackQuantity(item.pack.id, qty);
                        }
                      }}
                    />
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg leading-tight font-semibold">
                        {item.totalQuantity ?? item.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {items.length > 0 && availableAddons.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">
                Addon (untuk transaksi ini)
              </p>
              <div className="space-y-2">
                {availableAddons.map((addon) => {
                  const qty =
                    cartAddons.find((a) => a.addon.id === addon.id)?.quantity ??
                    0;

                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center justify-between gap-2 rounded-lg border p-2 pl-3 ${
                        qty > 0 ? 'border-primary bg-primary/10' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">
                          {addon.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRupiah(addon.price)}
                        </p>
                      </div>

                      {qty > 0 ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            aria-label={`Kurangi ${addon.name}`}
                            onClick={() => onRemoveAddon(addon.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {qty}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            aria-label={`Tambah ${addon.name}`}
                            onClick={() => onAddAddon(addon)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 shrink-0"
                          onClick={() => onAddAddon(addon)}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Tambah
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 space-y-3 border-t p-4 [@media(max-height:500px)]:space-y-1 [@media(max-height:500px)]:p-2">
          <div className="flex justify-between text-sm text-muted-foreground [@media(max-height:500px)]:hidden">
            <span>Item dibayar</span>
            <span>{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600 [@media(max-height:500px)]:hidden">
            <span>Gratis (Beli 10 Gratis 1)</span>
            <span>
              {items.reduce((sum, i) => sum + (i.freeQuantity || 0), 0)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold [@media(max-height:500px)]:text-sm">
            <span>Total Item</span>
            <span>{totalItems}</span>
          </div>
          <div className="flex justify-between text-lg font-bold [@media(max-height:500px)]:text-sm">
            <span>Total Bayar</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <Button
            className="w-full [@media(max-height:500px)]:h-8"
            size="lg"
            disabled={items.length === 0}
            onClick={handleCheckoutClick}
          >
            Bayar
          </Button>
        </div>
      </div>

      <Dialog open={freeWarningOpen} onOpenChange={setFreeWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Gratis belum dipilih
            </DialogTitle>
            <DialogDescription>
              Pelanggan berhak mendapat {freeEntitled} item gratis (Beli 10
              Gratis 1), tapi baru {freeChosen} yang dipilih. Pilih gratisnya
              dulu sebelum membayar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCheckoutWithoutFree}>
              Lanjut Tanpa Gratis
            </Button>
            <Button onClick={handleChooseFreeNow}>Pilih Gratis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FreeProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleFreeItemsConfirm}
        products={products}
        maxFreeQuantity={selectedMaxFree}
        itemName={selectedItemName}
        itemId={selectedItemId || 0}
        currentSelections={selectedCurrentFree}
      />
      <PackVariantModal
        open={packVariantModal.open}
        onClose={handlePackVariantsCancel}
        onConfirm={handlePackVariantsConfirm}
        pack={packVariantModal.pack!}
        products={products}
        currentVariants={packVariantModal.variants || []}
      />
    </>
  );
}
