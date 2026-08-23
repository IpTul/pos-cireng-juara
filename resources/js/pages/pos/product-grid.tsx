import { Product, Pack } from '@/types';
import { Package } from 'lucide-react';

interface Props {
  products: Product[];
  packs: Pack[];
  onAddProduct: (product: Product) => void;
  onAddPack: (pack: Pack, variants?: any[]) => void;
}

export default function ProductGrid({
  products,
  packs,
  onAddProduct,
  onAddPack,
}: Props) {
  const hasItems = products.length > 0 || packs.length > 0;

  if (!hasItems) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
        Tidak ada produk atau paket tersedia.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
      {products.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:px-2 sm:text-sm">
            Produk Tunggal
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <button
                key={`product-${product.id}`}
                onClick={() => onAddProduct(product)}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
              >
                {product.image ? (
                  <img
                    src={`/storage/${product.image}`}
                    alt={product.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted text-2xl text-muted-foreground sm:text-3xl">
                    {product.name.charAt(0)}
                  </div>
                )}
                <div className="p-1.5 sm:p-2">
                  <p className="truncate text-xs font-medium sm:text-sm">
                    {product.name}
                  </p>
                  <p className="text-xs font-bold text-primary sm:text-sm">
                    Rp{parseFloat(product.price).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    Stok: {product.stock}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {packs.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:px-2 sm:text-sm">
            Paket Makanan
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {packs.map((pack) => (
              <button
                key={`pack-${pack.id}`}
                onClick={() => onAddPack(pack)}
                className="group flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
              >
                {pack.image ? (
                  <img
                    src={`/storage/${pack.image}`}
                    alt={pack.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-primary/10 text-primary">
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
                      ?.map((item) => `${item.product.name} x${item.quantity}`)
                      .join(', ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
