import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { CartItem, PackCartItem, AddonSelection, PackVariant } from '@/types';
import { FreeItemSelection } from './use-cart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Gift, QrCode } from 'lucide-react';

interface Props {
  open: boolean;
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
  cartAddons: AddonSelection[];
  subtotal: number;
  totalItems: number;
  onSuccess: () => void;
  onClose: () => void;
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

function formatRupiah(value: number) {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

export default function CheckoutDialog({
  open,
  items,
  cartAddons,
  subtotal,
  totalItems,
  onSuccess,
  onClose,
}: Props) {
  const [cashInput, setCashInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isQris, setIsQris] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cash = parseFloat(cashInput) || 0;
  const change = cash - subtotal;

  const isCustomerNameFilled = customerName.trim().length > 0;

  const canSubmit = isQris
    ? !processing && isCustomerNameFilled
    : !processing && !!cashInput && cash >= subtotal && isCustomerNameFilled;

  function handleQrisToggle(checked: boolean) {
    setIsQris(checked);
    setError(null);
    if (checked) {
      setCashInput('');
    }
  }

  function handleCheckout() {
    if (!isCustomerNameFilled) {
      setError('Nama customer wajib diisi.');
      return;
    }
    if (!isQris && cash < subtotal) {
      setError('Jumlah tunai kurang dari total.');
      return;
    }
    setError(null);
    setProcessing(true);

    // Collect all free items from all items (they're stored on the first item)
    const allFreeItems = items
      .flatMap((i) => i.freeItems || [])
      .map((f) => ({ product_id: f.product_id, quantity: f.quantity }));

    const regularItems = items.filter(isCartItem).map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
    }));

    interface PackCheckoutItem {
      pack_id: number;
      quantity: number;
      variants: { product_id: number; quantity: number }[];
    }

    const packItems = items.filter(isPackCartItem).map((i) => ({
      pack_id: i.pack.id,
      quantity: i.quantity,
      variants: (i.variants || []).map((v) => ({
        product_id: v.product_id,
        quantity: v.quantity,
      })),
    }));

    // Addon sekarang level-cart, langsung dari cartAddons
    const allAddons = cartAddons
      .filter((a) => a.quantity > 0)
      .map((a) => ({
        addon_id: a.addon.id,
        quantity: a.quantity,
      }));

    router.post(
      '/checkout',
      {
        customer_name: customerName.trim(),
        items: regularItems,
        packs: packItems,
        free_items: allFreeItems,
        addons: allAddons,
        payment_method: isQris ? 'qris' : 'cash',
        cash_tendered: isQris ? subtotal : cash,
      },
      {
        onSuccess: () => {
          setProcessing(false);
          setCashInput('');
          setCustomerName('');
          setIsQris(false);
          onSuccess();
        },
        onError: (errors) => {
          setProcessing(false);
          setError(Object.values(errors)[0] as string);
          toast.error('Checkout gagal. Silakan periksa kembali.');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Proses Transaksi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1 rounded-lg bg-muted p-4">
            {items.map((i, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>
                  {isCartItem(i) ? (
                    i.product.name
                  ) : (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {i.pack.name}
                    </span>
                  )}
                  × {i.quantity}
                  {Boolean(i.freeQuantity) && i.freeQuantity! > 0 && (
                    <span className="ml-2 flex items-center gap-1 text-xs text-green-600">
                      <Gift className="h-2.5 w-2.5" />+{i.freeQuantity} Gratis
                    </span>
                  )}
                  {i.freeItems && i.freeItems.length > 0 && (
                    <div className="ml-2 text-xs text-green-600">
                      {' '}
                      {i.freeItems
                        .map((f) => `[GRATIS] ${f.quantity}x`)
                        .join(', ')}
                    </div>
                  )}
                </span>
                <span>
                  {isCartItem(i)
                    ? formatRupiah(parseFloat(i.product.price) * i.quantity)
                    : formatRupiah(parseFloat(i.pack.price) * i.quantity)}
                </span>
              </div>
            ))}

            {/* Addon — sekali untuk seluruh transaksi */}
            {cartAddons.filter((a) => a.quantity > 0).length > 0 && (
              <div className="mt-3 space-y-1 border-t pt-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Addon
                </p>
                {cartAddons
                  .filter((a) => a.quantity > 0)
                  .map((addonSel) => (
                    <div
                      key={addonSel.addon.id}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-muted-foreground">
                        {addonSel.addon.name} x{addonSel.quantity}
                      </span>
                      <span>
                        {formatRupiah(
                          parseFloat(addonSel.addon.price) * addonSel.quantity,
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-2 space-y-1 border-t pt-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Item dibayar</span>
                <span>{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Gratis (Beli 10 Gratis 1)</span>
                <span>
                  {items.reduce((sum, i) => sum + (i.freeQuantity || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Item</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Total Bayar</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
            </div>
          </div>

          {/* Nama customer (opsional) */}
          <div>
            <Label htmlFor="customer_name">Nama Customer (wajib)</Label>
            <Input
              id="customer_name"
              type="text"
              placeholder="Masukkan nama customer"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setError(null);
              }}
              maxLength={255}
              required
              autoFocus
            />
          </div>

          {/* FIX: toggle metode pembayaran QRIS */}
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              id="qris"
              checked={isQris}
              onCheckedChange={(checked) => handleQrisToggle(checked === true)}
            />
            <Label
              htmlFor="qris"
              className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium"
            >
              <QrCode className="h-4 w-4" />
              Bayar dengan QRIS
            </Label>
          </div>

          {/* Cash input — disembunyikan/dinonaktifkan kalau bayar QRIS */}
          {!isQris && (
            <div>
              <Label htmlFor="cash">Uang Tunai</Label>
              <Input
                id="cash"
                type="number"
                step="500"
                min={Math.round(subtotal)}
                placeholder="0"
                value={cashInput}
                onChange={(e) => {
                  setCashInput(e.target.value);
                  setError(null);
                }}
              />
            </div>
          )}

          {/* Change — hanya relevan untuk pembayaran tunai */}
          {!isQris && cashInput && (
            <div className="flex justify-between text-lg font-bold">
              <span>Kembalian</span>
              <span
                className={change >= 0 ? 'text-green-600' : 'text-destructive'}
              >
                {formatRupiah(change)}
              </span>
            </div>
          )}

          {/* Info ringkas kalau QRIS dipilih */}
          {isQris && (
            <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Total via QRIS</span>
              <span className="font-bold">{formatRupiah(subtotal)}</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit}
            onClick={handleCheckout}
          >
            {processing ? 'Memproses…' : 'Selesaikan Transaksi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
