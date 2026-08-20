import { Input } from '@/components/ui/input';
import { Product, Pack, Addon } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { LayoutGrid, Search } from 'lucide-react';
import { useState } from 'react';
import ProductGrid from './product-grid';
import CartPanel from './cart-panel';
import { useCart } from './use-cart';
import CheckoutDialog from './checkout-dialog';

interface Props {
  products: Product[];
  packs: Pack[];
  addons: Addon[]; // Addons data passed from controller
  user: {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'kasir';
  };
}

export default function PosIndex({ products, packs, addons }: Props) {
  const [search, setSearch] = useState('');
  const {
    items,
    addons: cartAddons,
    subtotal,
    totalItems,
    addProduct,
    addPack,
    removeProduct,
    removePack,
    setProductQuantity,
    setPackQuantity,
    setFreeItems,
    addAddon,
    removeAddon,
    clear,
  } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <Head title="Jual" />
      <div className="flex h-screen flex-col bg-background">
        {/* Top Bar */}
        <div className="flex items-center gap-4 border-b px-4 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <LayoutGrid className="h-5 w-5" />
          </Link>
          <span className="font-semibold">Jual</span>
          <div className="relative ml-4 max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari produk atau paket…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          <ProductGrid
            products={filteredProducts}
            packs={packs}
            onAddProduct={addProduct}
            onAddPack={addPack}
          />
          <CartPanel
            items={items}
            subtotal={subtotal}
            totalItems={totalItems}
            onRemoveProduct={removeProduct}
            onRemovePack={removePack}
            onSetProductQuantity={setProductQuantity}
            onSetPackQuantity={setPackQuantity}
            onClear={clear}
            onCheckout={() => setShowCheckout(true)}
            products={products}
            availableAddons={addons}
            cartAddons={cartAddons}
            onSetFreeItems={setFreeItems}
            onAddAddon={addAddon}
            onRemoveAddon={removeAddon}
          />
        </div>
      </div>
      <CheckoutDialog
        open={showCheckout}
        items={items}
        cartAddons={cartAddons}
        subtotal={subtotal}
        totalItems={totalItems}
        onSuccess={clear}
        onClose={() => setShowCheckout(false)}
      />
    </>
  );
}
