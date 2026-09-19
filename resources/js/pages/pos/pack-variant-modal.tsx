import { useState, useEffect } from 'react';
import { Product, Pack, PackVariant } from '@/types';
import { X, Search, Minus, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (variants: PackVariant[]) => void;
  pack: Pack | null; // FIX: sekarang boleh null, karena bisa di-mount sebelum user pilih pack
  products: Product[];
  currentVariants?: PackVariant[];
}

export default function PackVariantModal({
  open,
  onClose,
  onConfirm,
  pack,
  products,
  currentVariants = [],
}: Props) {
  const [search, setSearch] = useState('');
  const [variants, setVariants] = useState<PackVariant[]>(currentVariants);

  // Sync with currentVariants when modal opens
  useEffect(() => {
    if (open) {
      setVariants(currentVariants);
    }
  }, [open, currentVariants]);

  // FIX: guard ini HARUS setelah semua hooks (useState/useEffect) dan SEBELUM
  // kode apapun yang mengakses pack.xxx, supaya jumlah hook tetap konsisten
  // di setiap render (Rules of Hooks) sekaligus mencegah crash saat pack null.
  if (!pack) return null;

  const totalSelected = variants.reduce((sum, v) => sum + v.quantity, 0);
  const remaining = pack.max_items - totalSelected;

  // Filter products that are in the pack and active with stock
  const packProductIds = pack.pack_items?.map((pi) => pi.product_id) || [];
  const filteredProducts = products
    .filter((p) => packProductIds.includes(p.id))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.cabang?.name || "").toLowerCase().includes(search.toLowerCase()),
    )
    .filter((p) => p.is_active && p.stock > 0);

  function handleQuantityChange(productId: number, qty: number) {
    if (qty < 0) return;

    const existingVariant = variants.find((v) => v.product_id === productId);
    const currentQty = existingVariant?.quantity || 0;

    // Check if we can add more (respecting max items and stock)
    if (qty > currentQty) {
      if (remaining <= 0) return;
      const product = products.find((p) => p.id === productId);
      if (product && qty > product.stock) return;
    }

    setVariants((prev) => {
      if (qty === 0) {
        return prev.filter((v) => v.product_id !== productId);
      }
      if (existingVariant) {
        return prev.map((v) =>
          v.product_id === productId ? { ...v, quantity: qty } : v,
        );
      }
      const product = products.find((p) => p.id === productId);
      if (!product) return prev;
      return [...prev, { product_id: productId, product, quantity: qty }];
    });
  }

  function handleConfirm() {
    if (totalSelected === 0) return;
    if (totalSelected > pack.max_items) return;
    onConfirm(variants);
    onClose();
  }

  function formatRupiah(value: string | number) {
    return `Rp${Math.round(Number(value)).toLocaleString('id-ID')}`;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader className="flex flex-col items-start gap-1">
          <DialogTitle className="text-lg">
            Pilih Varian Paket: {pack.name}
          </DialogTitle>
          <DialogDescription>
            Pilih maksimal {pack.max_items} item dari produk yang tersedia
          </DialogDescription>
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
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm text-muted-foreground">
              Sudah dipilih:
            </span>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-base">
                {totalSelected} / {pack.max_items}
              </Badge>
              <Badge variant={remaining === 0 ? 'default' : 'secondary'}>
                Sisa: {remaining}
              </Badge>
            </div>
          </div>

          {/* Selected variants list */}
          {variants.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-background p-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Varian Terpilih:
              </p>
              {variants.map((variant) => (
                <div
                  key={variant.product_id}
                  className="flex items-center justify-between gap-2 rounded bg-muted/50 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {variant.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stok: {variant.product.stock} •{' '}
                      {formatRupiah(variant.product.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleQuantityChange(
                          variant.product_id,
                          variant.quantity - 1,
                        )
                      }
                      disabled={variant.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-base font-medium">
                      {variant.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleQuantityChange(
                          variant.product_id,
                          variant.quantity + 1,
                        )
                      }
                      disabled={
                        remaining <= 0 ||
                        variant.quantity >= variant.product.stock
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        handleQuantityChange(variant.product_id, 0)
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Product list */}
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {search
                  ? 'Tidak ada produk cocok'
                  : 'Tidak ada produk tersedia untuk paket ini'}
              </p>
            ) : (
              filteredProducts.map((product) => {
                const selected = variants.find(
                  (v) => v.product_id === product.id,
                );
                const selectedQty = selected?.quantity || 0;
                const isSelected = selectedQty > 0;
                const maxForThisProduct = remaining + selectedQty;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(product.cabang?.name || "")} • Stok: {product.stock}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {formatRupiah(product.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleQuantityChange(product.id, selectedQty - 1)
                        }
                        disabled={selectedQty <= 0}
                      >
                        <Minus className="h-4 w-4" />
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
                          selectedQty >= maxForThisProduct ||
                          remaining <= 0 ||
                          selectedQty >= product.stock
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {remaining > 0 && (
            <p className="text-center text-sm text-amber-600">
              Pilih {remaining} item lagi (maksimal {pack.max_items} item)
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={totalSelected === 0 || totalSelected > pack.max_items}
          >
            Konfirmasi ({totalSelected}/{pack.max_items})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
