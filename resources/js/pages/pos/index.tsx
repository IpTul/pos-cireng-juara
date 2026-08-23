import { Input } from '@/components/ui/input';
import { Product, Pack, Addon, PackVariant } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { LayoutGrid, Search, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import ProductGrid from './product-grid';
import CartPanel from './cart-panel';
import { useCart } from './use-cart';
import CheckoutDialog from './checkout-dialog';
import PackVariantModal from './pack-variant-modal';

interface Props {
  products: Product[];
  packs: Pack[];
  addons: Addon[];
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
    setPackVariants,
  } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [packVariantModal, setPackVariantModal] = useState<{
    open: boolean;
    pack: Pack | null;
  }>({
    open: false,
    pack: null,
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.name.toLowerCase().includes(search.toLowerCase()),
  );

  const [mobileTab, setMobileTab] = useState<'produk' | 'keranjang'>('produk');

  function handleAddPack(pack: Pack) {
    // Open variant selection modal
    setPackVariantModal({ open: true, pack });
  }

  function handlePackVariantConfirm(variants: PackVariant[]) {
    if (packVariantModal.pack) {
      addPack(packVariantModal.pack, variants);
    }
    setPackVariantModal({ open: false, pack: null });
  }

  function handlePackVariantCancel() {
    setPackVariantModal({ open: false, pack: null });
  }

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

        <div className="flex border-b md:hidden">
          <button
            onClick={() => setMobileTab('produk')}
            className={`flex-1 border-b-2 py-2 text-sm font-medium ${
              mobileTab === 'produk'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Produk
          </button>
          <button
            onClick={() => setMobileTab('keranjang')}
            className={`relative flex flex-1 items-center justify-center gap-1 border-b-2 py-2 text-sm font-medium ${
              mobileTab === 'keranjang'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Keranjang
            {totalItems > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Main area - Mobile: tampilkan satu panel sesuai tab aktif */}
        <div className="flex flex-1 overflow-hidden md:hidden">
          {mobileTab === 'produk' ? (
            <ProductGrid
              products={filteredProducts}
              packs={packs}
              onAddProduct={addProduct}
              onAddPack={handleAddPack}
            />
          ) : (
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
              onSetPackVariants={setPackVariants}
            />
          )}
        </div>

        {/* Main area - Desktop: ProductGrid dan CartPanel berdampingan */}
        <div className="hidden flex-1 overflow-hidden md:flex">
          <ProductGrid
            products={filteredProducts}
            packs={packs}
            onAddProduct={addProduct}
            onAddPack={handleAddPack}
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
            onSetPackVariants={setPackVariants}
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
      {/* FIX: hanya render modal kalau pack sudah terisi (bukan null) */}
      {packVariantModal.pack && (
        <PackVariantModal
          open={packVariantModal.open}
          onClose={handlePackVariantCancel}
          onConfirm={handlePackVariantConfirm}
          pack={packVariantModal.pack}
          products={products}
        />
      )}
    </>
  );
}
