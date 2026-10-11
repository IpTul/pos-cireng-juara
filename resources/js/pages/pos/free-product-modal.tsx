import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { X, Search, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface FreeItemSelection {
  product_id: number;
  quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (selections: FreeItemSelection[]) => void;
  products: Product[];
  maxFreeQuantity: number;
  itemName: string;
  itemId: number;
  currentSelections: FreeItemSelection[];
}

export default function FreeProductModal({
  open,
  onClose,
  onConfirm,
  products,
  maxFreeQuantity,
  itemName,
  itemId,
  currentSelections,
}: Props) {
  const [search, setSearch] = useState('');
  const [selections, setSelections] =
    useState<FreeItemSelection[]>(currentSelections);

  useEffect(() => {
    if (open) {
      setSelections(currentSelections);
    }
  }, [open, currentSelections]);

  const totalSelected = selections.reduce((sum, s) => sum + s.quantity, 0);
  const remaining = maxFreeQuantity - totalSelected;

  const filteredProducts = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.cabang?.name || '').toLowerCase().includes(search.toLowerCase()),
    )
    .filter((p) => p.is_active && p.stock > 0);

  function handleQuantityChange(productId: number, qty: number) {
    if (qty < 0) return;
    if (
      qty >
      remaining +
        (selections.find((s) => s.product_id === productId)?.quantity || 0)
    ) {
      return;
    }

    setSelections((prev) => {
      const existing = prev.find((s) => s.product_id === productId);
      if (qty === 0) {
        return prev.filter((s) => s.product_id !== productId);
      }
      if (existing) {
        return prev.map((s) =>
          s.product_id === productId ? { ...s, quantity: qty } : s,
        );
      }
      return [...prev, { product_id: productId, quantity: qty }];
    });
  }

  function handleConfirm() {
    if (totalSelected !== maxFreeQuantity) {
      return;
    }
    onConfirm(selections);
    onClose();
  }

  function formatRupiah(value: string | number) {
    return `Rp${Math.round(Number(value)).toLocaleString('id-ID')}`;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-3 overflow-hidden [@media(max-height:500px)]:max-h-[96dvh] [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:p-3">
        <DialogHeader className="flex shrink-0 flex-col items-start gap-1">
          <DialogTitle className="text-lg">Pilih Produk Gratis</DialogTitle>
          <p className="text-sm text-muted-foreground [@media(max-height:500px)]:hidden">
            {itemName} - Dapat {maxFreeQuantity} gratis (Beli 10 Gratis 1)
          </p>
        </DialogHeader>

        {/* Isi tengah: baris atas (cari + ringkasan), lalu daftar produk */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 [@media(max-height:500px)]:gap-2">
          {/* Baris atas: bertumpuk di layar normal, sejajar di layar pendek */}
          <div className="flex shrink-0 flex-col gap-3 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-center [@media(max-height:500px)]:gap-2">
            {/* Search */}
            <div className="relative [@media(max-height:500px)]:flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Selected summary */}
            <div className="flex shrink-0 items-center justify-between rounded-lg bg-muted p-3 [@media(max-height:500px)]:gap-3 [@media(max-height:500px)]:py-1">
              <span className="text-sm text-muted-foreground [@media(max-height:500px)]:hidden">
                Sudah dipilih:
              </span>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-base">
                  {totalSelected} / {maxFreeQuantity}
                </Badge>
                <Badge variant={remaining === 0 ? 'default' : 'secondary'}>
                  Sisa: {remaining}
                </Badge>
              </div>
            </div>
          </div>

          {/* Product list */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Tidak ada produk tersedia
              </p>
            ) : (
              filteredProducts.map((product) => {
                const selected = selections.find(
                  (s) => s.product_id === product.id,
                );
                const selectedQty = selected?.quantity || 0;
                const isSelected = selectedQty > 0;
                const maxForThisProduct = remaining + selectedQty;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors [@media(max-height:500px)]:p-2 ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {product.image ? (
                      <img
                        src={`/storage/${product.image}`}
                        alt={product.name}
                        className="h-12 w-12 rounded object-cover [@media(max-height:500px)]:h-9 [@media(max-height:500px)]:w-9"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-xl [@media(max-height:500px)]:h-9 [@media(max-height:500px)]:w-9">
                        {product.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground [@media(max-height:500px)]:text-xs">
                        {product.cabang?.name || ''} • Stok: {product.stock}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {formatRupiah(product.price)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleQuantityChange(product.id, selectedQty - 1)
                        }
                        disabled={selectedQty <= 0}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-base font-medium">
                        {selectedQty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleQuantityChange(product.id, selectedQty + 1)
                        }
                        disabled={
                          selectedQty >= maxForThisProduct || remaining <= 0
                        }
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {remaining > 0 && (
            <p className="shrink-0 text-center text-sm text-amber-600 [@media(max-height:500px)]:hidden">
              Pilih {remaining} produk gratis lagi
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={totalSelected !== maxFreeQuantity}
          >
            Konfirmasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
