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
  const [selections, setSelections] = useState<FreeItemSelection[]>(currentSelections);

  // Sync with currentSelections when modal opens
  useEffect(() => {
    if (open) {
      setSelections(currentSelections);
    }
  }, [open, currentSelections]);

  const totalSelected = selections.reduce((sum, s) => sum + s.quantity, 0);
  const remaining = maxFreeQuantity - totalSelected;

  const filteredProducts = products
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.name.toLowerCase().includes(search.toLowerCase()),
    )
    .filter((p) => p.is_active && p.stock > 0);

  function handleQuantityChange(productId: number, qty: number) {
    if (qty < 0) return;
    if (qty > remaining + (selections.find(s => s.product_id === productId)?.quantity || 0)) {
      return;
    }

    setSelections((prev) => {
      const existing = prev.find((s) => s.product_id === productId);
      if (qty === 0) {
        return prev.filter((s) => s.product_id !== productId);
      }
      if (existing) {
        return prev.map((s) => (s.product_id === productId ? { ...s, quantity: qty } : s));
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
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader className="flex flex-col items-start gap-1">
          <DialogTitle className="text-lg">Pilih Produk Gratis</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {itemName} - Dapat {maxFreeQuantity} gratis (Beli 10 Gratis 1)
          </p>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Selected summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Sudah dipilih:</span>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-base">
                {totalSelected} / {maxFreeQuantity}
              </Badge>
              <Badge variant={remaining === 0 ? 'default' : 'secondary'}>
                Sisa: {remaining}
              </Badge>
            </div>
          </div>

          {/* Product list */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Tidak ada produk tersedia</p>
            ) : (
              filteredProducts.map((product) => {
                const selected = selections.find((s) => s.product_id === product.id);
                const selectedQty = selected?.quantity || 0;
                const isSelected = selectedQty > 0;
                const maxForThisProduct = remaining + selectedQty;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    {product.image ? (
                      <img
                        src={`/storage/${product.image}`}
                        alt={product.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xl">
                        {product.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.category.name} • Stok: {product.stock}
                      </p>
                      <p className="text-sm font-bold text-primary">{formatRupiah(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(product.id, selectedQty - 1)}
                        disabled={selectedQty <= 0}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium text-base">
                        {selectedQty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(product.id, selectedQty + 1)}
                        disabled={selectedQty >= maxForThisProduct || remaining <= 0}
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
            <p className="text-center text-sm text-amber-600">
              Pilih {remaining} produk gratis lagi
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleConfirm} disabled={totalSelected !== maxFreeQuantity}>
            Konfirmasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}