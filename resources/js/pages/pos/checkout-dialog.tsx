import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import type { CartItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  items: CartItem[];
  subtotal: number;
  onSuccess: () => void;
  onClose: () => void;
}

function formatRupiah(value: number) {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

export default function CheckoutDialog({
  open,
  items,
  subtotal,
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

    router.post(
      '/checkout',
      {
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
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
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1 rounded-lg bg-muted p-4">
            {items.map((i) => (
              <div key={i.product.id} className="flex justify-between text-sm">
                <span>
                  {i.product.name} × {i.quantity}
                </span>
                <span>
                  {formatRupiah(parseFloat(i.product.price) * i.quantity)}
                </span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t pt-2 font-bold">
              <span>Total</span>
              <span>{formatRupiah(subtotal)}</span>
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
