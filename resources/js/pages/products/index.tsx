import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Cabang, Product, PaginatedData } from '@/types';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import ProductForm from './product-form';
import { Label } from '@/components/ui/label';

interface Props {
  products: PaginatedData<Product>;
  cabangs: Cabang[];
  user: {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'kasir';
  };
}

export default function ProductIndex({ products, cabangs, user }: Props) {
  const [ShowForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [cabangId, setCabangId] = useState<number | null>(null);
  const [sort, setSort] = useState<'asc' | 'desc' | 'low_stock'>('asc');

  function handleEdit(product: Product) {
    setEditing(product);
    setShowForm(true);
  }

  function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    router.delete(`/products/${product.id}`, {
      onSuccess: () => toast.success('Product deleted.'),
    });
  }

  function handleClose() {
    setShowForm(false);
    setEditing(null);
    setCabangId(null);
    setSort('asc');
  }

  function applyFilters(overrides?: {
    cabangId?: number | null;
    sort?: 'asc' | 'desc' | 'low_stock';
  }) {
    const activeCabangId =
      overrides?.cabangId !== undefined ? overrides.cabangId : cabangId;
    const activeSort = overrides?.sort !== undefined ? overrides.sort : sort;

    const params: Record<string, string> = { sort: activeSort };
    if (activeCabangId !== null) {
      params.cabang_id = String(activeCabangId);
    }

    router.get('/products', params, {
      preserveState: true,
      preserveScroll: true,
    });
  }

  return (
    <>
      <Head title="Produk" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Produk</h1>
          {user.role === 'owner' && (
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )}
        </div>

        <div className="mb-4 grid w-fit grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3">
          <Label htmlFor="cabang-filter">Cabang</Label>
          <Select
            value={cabangId !== null ? cabangId.toString() : ''}
            onValueChange={(value: string) => {
              const id = value ? parseInt(value, 10) : null;
              setCabangId(id);
              applyFilters({ cabangId: id });
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua cabang</SelectItem>
              {cabangs.map((cabang) => (
                <SelectItem key={cabang.id} value={cabang.id.toString()}>
                  {cabang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label htmlFor="sort-stock">Stok</Label>
          <Select
            value={sort}
            onValueChange={(value: string) => {
              const newSort = value as 'asc' | 'desc' | 'low_stock';
              setSort(newSort);
              applyFilters({ sort: newSort });
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                {sort === 'asc'
                  ? 'Terkecil'
                  : sort === 'desc'
                    ? 'Terbesar'
                    : 'Stok di bawah 5'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Terkecil ke besar</SelectItem>
              <SelectItem value="desc">Terbesar ke kecil</SelectItem>
              <SelectItem value="low_stock">Stok di bawah 5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Cabang</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.data.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No products yet. Click "Add Product" to get started.
                  </td>
                </tr>
              )}
              {products.data.map((product) => (
                <tr
                  key={product.id}
                  className="border-b last:border-0 hover:bg-muted/25"
                >
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.cabang.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    Rp{Number(product.price).toLocaleString('id-ID')}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${product.stock <= 5 ? 'font-semibold text-orange-600' : ''}`}
                  >
                    {product.stock}
                    {product.stock === 0 && (
                      <span className="ml-1 text-xs text-destructive">
                        (Out)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={product.is_active ? 'default' : 'secondary'}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(product)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.total > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan {products.from}–{products.to} dari {products.total}{' '}
              produk
            </p>
            {products.last_page > 1 && (
              <div className="flex gap-1">
                {products.links.map((link, i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant={link.active ? 'default' : 'outline'}
                    disabled={!link.url}
                    onClick={() =>
                      link.url &&
                      router.get(
                        link.url,
                        {},
                        { preserveState: true, preserveScroll: true },
                      )
                    }
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {ShowForm && (
          <ProductForm
            cabangs={cabangs}
            product={editing}
            onClose={handleClose}
          />
        )}
      </div>
    </>
  );
}

ProductIndex.layout = {
  breadcrumbs: [{ title: 'Produk', href: '/products' }],
};
