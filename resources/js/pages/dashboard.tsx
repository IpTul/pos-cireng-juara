import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { dashboard } from '@/routes';
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

interface Props {
  stats: Stats;
  top_products: TopProduct[];
  recent_sales: Sale[];
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
      <Head title="Dashboard" />
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">
          Dashboard{' '}
          <p className="mb-4 text-sm text-muted-foreground">
            Anda login sebagai{' '}
            <strong>{user.role === 'owner' ? 'Owner' : 'Kasir'}</strong>
          </p>
        </h1>
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value={`Rp ${stats.today_revenue.toLocaleString('id-ID')}`}
          />
          <StatCard
            title="Transactions Today"
            value={stats.today_transactions.toString()}
          />
          <StatCard
            title="Active Products"
            value={stats.total_products.toString()}
          />
          <StatCard
            title="Low Stock"
            value={stats.low_stock_count.toString()}
            highlight={stats.low_stock_count > 0}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top products */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Top Products Today</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Units</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top_products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No sales today yet.
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
          {/* Recent sales */}
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Recent Sales</h2>
            </div>
            <div className="divide-y">
              {recent_sales.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No sales recorded yet.
                </p>
              ) : (
                recent_sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">Sale #{sale.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.items
                          .map((i) => `${i.product_name} ×${i.quantity}`)
                          .join(', ')}
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
          </div>
        </div>
      </div>
    </>
  );
}

Dashboard.layout = {
  breadcrumbs: [
    {
      title: 'Dashboard',
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
