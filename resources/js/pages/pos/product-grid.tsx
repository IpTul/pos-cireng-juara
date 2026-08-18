import { Product, Pack } from '@/types';
import { Package } from 'lucide-react';

interface Props {
  products: Product[];
  packs: Pack[];
  onAddProduct: (product: Product) => void;
  onAddPack: (pack: Pack) => void;
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
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Tidak ada produk atau paket tersedia.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {packs.length > 0 && (
        <div className="mb-4">
          <h3 className="flex items-center gap-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            <h3 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Paket Makanan
            </h3>
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {packs.map((pack) => (
              <button
                key={`pack-${pack.id}`}
                onClick={() => onAddPack(pack)}
                className="group flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {pack.image ? (
                  <img
                    src={`/storage/${pack.image}`}
                    alt={pack.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-primary/10 text-3xl text-primary">
                    <Package className="h-10 w-10" />
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-sm font-medium">{pack.name}</p>
                  <p className="text-sm font-bold text-primary">
                    Rp{parseFloat(pack.price).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-muted-foreground">
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

      {products.length > 0 && (
        <div>
          <h3 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Produk Tunggal
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <button
                key={`product-${product.id}`}
                onClick={() => onAddProduct(product)}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {product.image ? (
                  <img
                    src={`/storage/${product.image}`}
                    alt={product.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted text-3xl text-muted-foreground">
                    {product.name.charAt(0)}
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-sm font-bold text-primary">
                    Rp{parseFloat(product.price).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stok: {product.stock}
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
