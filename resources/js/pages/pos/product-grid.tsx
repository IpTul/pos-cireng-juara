import { Product, Pack } from '@/types';
import { Package } from 'lucide-react';

interface Props {
  products: Product[];
  packs: Pack[];
  onAddProduct: (product: Product) => void;
  onAddPack: (pack: Pack, variants?: any[]) => void;
}

const SIDE_PRODUCT_NAMES = ['kuah creamy', 'chili oil', 'mentai'];
const isSideProduct = (p: Product) =>
  SIDE_PRODUCT_NAMES.includes(p.name.trim().toLowerCase());

export default function ProductGrid({
  products,
  packs,
  onAddProduct,
  onAddPack,
}: Props) {
  const hasItems = products.length > 0 || packs.length > 0;

  const mainProducts = products.filter((p) => !isSideProduct(p));
  const sideProducts = products.filter(isSideProduct);

  const renderProduct = (product: Product) => (
    <button
      key={`product-${product.id}`}
      onClick={() => product.stock > 0 && onAddProduct(product)}
      disabled={product.stock <= 0}
      className={
        product.stock > 0
          ? 'group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]'
          : 'group flex cursor-not-allowed flex-col overflow-hidden rounded-xl border bg-card text-left opacity-50 transition-all'
      }
    >
      {product.image ? (
        <img
          src={`/storage/${product.image}`}
          alt={product.name}
          className="aspect-square w-full object-cover [@media(max-height:500px)]:aspect-[3/2]"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted text-2xl text-muted-foreground sm:text-3xl [@media(max-height:500px)]:aspect-[3/2]">
          {product.name.charAt(0)}
        </div>
      )}
      <div className="p-1.5 sm:p-2">
        <p className="truncate text-xl font-medium sm:text-sm">
          {product.name}
        </p>
        <p className="text-xs font-bold text-primary sm:text-sm">
          Rp{parseFloat(product.price).toLocaleString('id-ID')}
        </p>
        <p className="text-[10px] text-muted-foreground sm:text-xs">
          Stok: {product.stock}
        </p>
        {product.stock <= 0 && (
          <span className="block text-xs font-medium text-destructive">
            Stok habis
          </span>
        )}
      </div>
    </button>
  );

  if (!hasItems) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
        Tidak ada produk atau paket tersedia.
      </div>
    );
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4">
      {mainProducts.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:px-2 sm:text-sm">
            Produk Tunggal
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {mainProducts.map(renderProduct)}
          </div>
        </div>
      )}

      {sideProducts.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:px-2 sm:text-sm">
            Kuah &amp; Saus
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {sideProducts.map(renderProduct)}
          </div>
        </div>
      )}

      {packs.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:px-2 sm:text-sm">
            Paket Makanan
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {packs.map((pack) => {
              const isAvailable = pack.is_available !== false;

              return (
                <button
                  key={`pack-${pack.id}`}
                  onClick={() => isAvailable && onAddPack(pack)}
                  disabled={!isAvailable}
                  className={
                    isAvailable
                      ? 'group flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]'
                      : 'group flex cursor-not-allowed flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 text-left opacity-50 transition-all'
                  }
                >
                  {pack.image ? (
                    <img
                      src={`/storage/${pack.image}`}
                      alt={pack.name}
                      className="aspect-square w-full object-cover [@media(max-height:500px)]:aspect-[3/2]"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-primary/10 text-primary [@media(max-height:500px)]:aspect-[3/2]">
                      <Package className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                  )}
                  <div className="p-1.5 sm:p-2">
                    <p className="truncate text-xs font-medium sm:text-sm">
                      {pack.name}
                    </p>
                    <p className="text-xs font-bold text-primary sm:text-sm">
                      Rp{parseFloat(pack.price).toLocaleString('id-ID')}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                      {pack.pack_items
                        ?.map(
                          (item) => `${item.product.name} x${item.quantity}`,
                        )
                        .join(', ')}
                    </p>
                    {!isAvailable && (
                      <span className="block text-xs font-medium text-destructive">
                        Semua produk habis
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
