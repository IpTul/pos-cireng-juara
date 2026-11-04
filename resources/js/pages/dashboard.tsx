import { Head } from '@inertiajs/react';
import { SalesHistory } from '@/components/sales-history';
import type { SalesHistoryProps } from '@/components/sales-history';
import { StockSummarySection } from '@/components/stock-summary';
import type {
  StockSummaryFilters,
  StockSummaryRow,
} from '@/components/stock-summary';
import { dashboard } from '@/routes';

interface Stats {
  today_revenue: number;
  today_transactions: number;
  total_products: number;
  low_stock_count: number;
  payment_breakdown: Record<
    'cash' | 'qris' | 'grab' | 'gofood',
    { total: number; count: number }
  >;
}

interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

interface Props extends SalesHistoryProps {
  stats: Stats;
  top_products: TopProduct[];
  stockSummary: StockSummaryRow[];
  stockFilters: StockSummaryFilters;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'kasir';
    operator_name?: string | null;
  };
}

export default function Dashboard({
  stats,
  top_products,
  sales,
  sideCounts,
  itemsSold,
  filters,
  stockSummary,
  stockFilters,
  user,
}: Props) {
  // Dua bagian punya filter sendiri di URL yang sama; saling membawa filter
  // satu sama lain supaya mengganti salah satunya tidak mereset yang lain.
  const stockParams: Record<string, string> = {
    stok_period: stockFilters?.period ?? 'today',
  };
  if (stockFilters?.period === 'custom') {
    if (stockFilters.start_date) {
      stockParams.stok_start = stockFilters.start_date;
    }
    if (stockFilters.end_date) {
      stockParams.stok_end = stockFilters.end_date;
    }
  }

  const historyParams: Record<string, string> = {};
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string' && value !== '') historyParams[key] = value;
  });

  return (
    <>
      <Head title="Halaman Utama" />
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">
          Halaman Utama
          <p className="mb-4 text-sm text-muted-foreground">
            Anda login sebagai{' '}
            {user.operator_name && user.operator_name.trim() !== ''
              ? user.operator_name
              : user.name}
            {/* <strong>{user.role === 'owner' ? 'Owner' : 'Kasir'}</strong> */}
          </p>
        </h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Pendapatan Hari Ini"
            value={
              user.role === 'owner'
                ? `Rp ${stats.today_revenue.toLocaleString('id-ID')}`
                : '*****'
            }
          />
          <StatCard
            title="Transaksi Hari Ini"
            value={stats.today_transactions.toString()}
          />
          {/* <StatCard
            title="Produk Aktif"
            value={stats.total_products.toString()}
          />
          <StatCard
            title="Stok Rendah"
            value={stats.low_stock_count.toString()}
            highlight={stats.low_stock_count > 0}
          /> */}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              ['cash', 'Tunai'],
              ['qris', 'QRIS'],
              ['grab', 'Grab'],
              ['gofood', 'GoFood'],
            ] as const
          ).map(([key, label]) => (
            <StatCard
              key={key}
              title={`${label} Hari Ini`}
              value={`Rp ${(stats.payment_breakdown?.[key]?.total ?? 0).toLocaleString('id-ID')}`}
              subtitle={`${stats.payment_breakdown?.[key]?.count ?? 0} transaksi`}
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* <div className="overflow-x-auto rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Produk Terlaris</h2>
            </div>
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Produk</th>
                  <th className="px-4 py-2 text-right">Unit</th>
                  <th className="px-4 py-2 text-right">
                    {user.role === 'owner' ? 'Pendapatan' : '-'}
                  </th>
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
                        {user.role === 'owner'
                          ? `Rp ${p.total_revenue.toLocaleString('id-ID')}`
                          : '*****'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div> */}
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Ringkasan Stok</h2>
          <StockSummarySection
            stockSummary={stockSummary}
            filters={stockFilters}
            basePath={dashboard().url}
            extraParams={historyParams}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Riwayat Penjualan</h2>
          <SalesHistory
            sales={sales}
            sideCounts={sideCounts}
            itemsSold={itemsSold}
            filters={filters}
            basePath={dashboard().url}
            extraParams={stockParams}
          />
        </section>
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
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
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
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
