import { Head, router } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { dashboard } from '@/routes';
import { SimplePagination } from '@/components/ui/pagination';
import type { Sale } from '@/types';

interface Stats {
  today_revenue: number;
  today_transactions: number;
  total_products: number;
  low_stock_count: number;
}

interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

interface PaginatedData<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface SaleWithItems extends Sale {
  items: Array<{
    id: number;
    product_name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    is_free?: boolean;
    category_name?: string;
  }>;
}

interface Props {
  stats: Stats;
  top_products: TopProduct[];
  recent_sales: PaginatedData<SaleWithItems>;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'kasir';
  };
}

export default function Dashboard({
  stats,
  top_products,
  recent_sales,
  user,
}: Props) {
  return (
    <>
      <Head title="Halaman Utama" />
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">
          Halaman Utama
          <p className="mb-4 text-sm text-muted-foreground">
            Anda login sebagai{' '}
            <strong>{user.role === 'owner' ? 'Owner' : 'Kasir'}</strong>
          </p>
        </h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Pendapatan Hari Ini"
            value={`Rp ${stats.today_revenue.toLocaleString('id-ID')}`}
          />
          <StatCard
            title="Transaksi Hari Ini"
            value={stats.today_transactions.toString()}
          />
          <StatCard
            title="Produk Aktif"
            value={stats.total_products.toString()}
          />
          <StatCard
            title="Stok Rendah"
            value={stats.low_stock_count.toString()}
            highlight={stats.low_stock_count > 0}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Produk Terlaris</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Produk</th>
                  <th className="px-4 py-2 text-right">Unit</th>
                  <th className="px-4 py-2 text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {top_products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      Tidak ada penjualan hari ini.
                    </td>
                  </tr>
                ) : (
                  top_products.map((p) => (
                    <tr key={p.product_name} className="border-t">
                      <td className="px-4 py-2">{p.product_name}</td>
                      <td className="px-4 py-2 text-right">{p.total_qty}</td>
                      <td className="px-4 py-2 text-right">
                        Rp {p.total_revenue.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Penjualan Terbaru</h2>
            </div>
            <div className="divide-y">
              {recent_sales.data.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada penjualan yang direkam.
                </p>
              ) : (
                recent_sales.data.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Penjualan #{sale.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(
                          sale.items.reduce(
                            (acc, i) => {
                              const cat = i.category_name || 'Lainnya';
                              if (!acc[cat]) acc[cat] = [];
                              acc[cat].push(`${i.product_name} ×${i.quantity}`);
                              return acc;
                            },
                            {} as Record<string, string[]>,
                          ),
                        )
                          .map(([cat, items]) => `${items.join(', ')} - ${cat}`)
                          .join('; ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        Rp {sale.total.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {recent_sales.last_page > 1 && (
              <div className="border-t p-4">
                <SimplePagination
                  currentPage={recent_sales.current_page}
                  totalPages={recent_sales.last_page}
                  baseUrl={dashboard()}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

Dashboard.layout = {
  breadcrumbs: [
    {
      title: 'Halaman Utama',
      href: dashboard(),
    },
  ],
};

function StatCard({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20' : 'bg-card'}`}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p
        className={`mt-1 text-2xl font-bold ${highlight ? 'text-orange-600' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
