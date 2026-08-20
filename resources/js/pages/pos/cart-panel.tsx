import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Package, Gift, Plus, Minus } from 'lucide-react';
import {
  CartItem,
  PackCartItem,
  Product,
  Addon,
  AddonSelection,
} from '@/types';
import FreeProductModal from './free-product-modal';
import { FreeItemSelection } from './use-cart';
import { Badge } from '@/components/ui/badge';

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
  availableAddons: Addon[]; // katalog addon yang bisa dipilih
  cartAddons: AddonSelection[]; // addon yang sudah dipilih untuk transaksi ini
  onSetFreeItems: (freeItems: FreeItemSelection[]) => void;
  onAddAddon: (addon: Addon) => void;
  onRemoveAddon: (addonId: number) => void;
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
} {
  return 'pack' in item;
}

function formatRupiah(value: string | number) {
  return `Rp${Math.round(Number(value)).toLocaleString('id-ID')}`;
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
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedMaxFree, setSelectedMaxFree] = useState(0);
  const [selectedCurrentFree, setSelectedCurrentFree] = useState<
    FreeItemSelection[]
  >([]);

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

  return (
    <>
      <div className="flex w-80 flex-col border-l bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
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
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada item.
            </p>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-medium">
                        {isCartItem(item)
                          ? item.product.name
                          : `[Paket] ${item.pack.name}`}
                      </p>
                      {isPackCartItem(item) && (
                        <Package className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    {isCartItem(item) ? (
                      <p className="text-xs text-muted-foreground">
                        {formatRupiah(item.product.price)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {item.pack.pack_items
                          ?.map((pi) => `${pi.product.name} x${pi.quantity}`)
                          .join(', ')}
                      </p>
                    )}
                    {(item.freeQuantity ?? 0) > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="flex items-center gap-1 text-xs text-green-600">
                          <Gift className="h-3 w-3" />
                          Gratis {item.freeQuantity}
                        </p>
                        {(!item.freeItems ||
                          item.freeItems.length === 0 ||
                          item.freeItems.reduce((s, f) => s + f.quantity, 0) <
                            item.freeQuantity!) && (
                          <Button
                            variant="outline"
                            size="sm"
                            style={{
                              padding: '0 8px',
                              height: '24px',
                              fontSize: '11px',
                            }}
                            onClick={() => openFreeModal(item)}
                          >
                            Pilih Gratis
                          </Button>
                        )}
                        {item.freeItems &&
                          item.freeItems.reduce((s, f) => s + f.quantity, 0) >=
                            item.freeQuantity! && (
                            <Badge variant="default" className="text-xs">
                              Selesai
                            </Badge>
                          )}
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={isCartItem(item) ? item.product.stock : 999}
                    value={item.quantity}
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 0;
                      if (isCartItem(item)) {
                        onSetProductQuantity(item.product.id, qty);
                      } else {
                        onSetPackQuantity(item.pack.id, qty);
                      }
                    }}
                    className="w-16 text-center"
                  />
                  <span className="w-16 text-center text-xs text-muted-foreground">
                    Total: {item.totalQuantity ?? item.quantity}
                  </span>
                  <button
                    onClick={() => {
                      if (isCartItem(item)) {
                        onRemoveProduct(item.product.id);
                      } else {
                        onRemovePack(item.pack.id);
                      }
                    }}
                    className="text-destructive hover:opacity-70"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Addon — level cart, sekali untuk seluruh transaksi. Di LUAR items.map. */}
          {items.length > 0 && availableAddons.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Addon (untuk transaksi ini):
              </p>
              <div className="flex flex-wrap gap-1">
                {availableAddons.map((addon) => {
                  const selected = cartAddons.find(
                    (a) => a.addon.id === addon.id,
                  );
                  const qty = selected?.quantity || 0;
                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center gap-1 rounded border px-2 py-1 text-xs ${
                        qty > 0
                          ? 'border-primary bg-primary/10'
                          : 'border-muted'
                      }`}
                    >
                      <span>{addon.name}</span>
                      <span className="text-muted-foreground">
                        ({formatRupiah(addon.price)})
                      </span>
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => onRemoveAddon(addon.id)}
                            className="hover:text-destructive"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span>{qty}</span>
                          <button
                            onClick={() => onAddAddon(addon)}
                            className="hover:text-primary"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onAddAddon(addon)}
                          className="hover:text-primary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3 border-t p-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Item dibayar</span>
            <span>{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600">
            <span>Gratis (Beli 10 Gratis 1)</span>
            <span>
              {items.reduce((sum, i) => sum + (i.freeQuantity || 0), 0)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total Item</span>
            <span>{totalItems}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total Bayar</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={items.length === 0}
            onClick={onCheckout}
          >
            Bayar
          </Button>
        </div>
      </div>

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
    </>
  );
}
