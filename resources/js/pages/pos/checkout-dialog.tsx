import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { CartItem, PackCartItem } from '@/types';
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
import { Package, Gift } from 'lucide-react';

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
      })
  )[];
  subtotal: number;
  totalItems: number;
  onSuccess: () => void;
  onClose: () => void;
}

function isCartItem(
  item: Props['items'][0],
): item is CartItem & {
  freeQuantity?: number;
  totalQuantity?: number;
  freeItems?: FreeItemSelection[];
} {
  return 'product' in item;
}

function isPackCartItem(
  item: Props['items'][0],
): item is PackCartItem & {
  freeQuantity?: number;
  totalQuantity?: number;
  freeItems?: FreeItemSelection[];
} {
  return 'pack' in item;
}

function formatRupiah(value: number) {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

export default function CheckoutDialog({
  open,
  items,
  subtotal,
  totalItems,
  onSuccess,
  onClose,
}: Props) {
  const [cashInput, setCashInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cash = parseFloat(cashInput) || 0;
  const change = cash - subtotal;

  function handleCheckout() {
    if (cash < subtotal) {
      setError('Jumlah tunai kurang dari total.');
      return;
    }
    setError(null);
    setProcessing(true);

    // Collect all free items from all items (they're stored on the first item)
    const allFreeItems = items.flatMap((i) => i.freeItems || []).map(f => ({ product_id: f.product_id, quantity: f.quantity })) as { product_id: number; quantity: number }[];

    const regularItems = items.filter(isCartItem).map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
    }));

    const packItems = items.filter(isPackCartItem).map((i) => ({
      pack_id: i.pack.id,
      quantity: i.quantity,
    }));

    router.post(
      '/checkout',
      {
        items: regularItems,
        packs: packItems,
        free_items: allFreeItems,
        cash_tendered: cash,
      },
      {
        onSuccess: () => {
          setProcessing(false);
          setCashInput('');
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
                  {i.freeQuantity && i.freeQuantity > 0 && (
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
          {/* Cash input */}
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
              autoFocus
            />
          </div>
          {/* Change */}
          {cashInput && (
            <div className="flex justify-between text-lg font-bold">
              <span>Kembalian</span>
              <span
                className={change >= 0 ? 'text-green-600' : 'text-destructive'}
              >
                {formatRupiah(change)}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            size="lg"
            disabled={processing || !cashInput || cash < subtotal}
            onClick={handleCheckout}
          >
            {processing ? 'Memproses…' : 'Selesaikan Transaksi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
