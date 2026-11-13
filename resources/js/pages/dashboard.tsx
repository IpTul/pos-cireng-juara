import { Head } from '@inertiajs/react';
import { SalesHistory } from '@/components/sales-history';
import type { SalesHistoryProps } from '@/components/sales-history';
import { StockSummarySection } from '@/components/stock-summary';
import type {
  StockSummaryFilters,
  StockSummaryRow,
} from '@/components/stock-summary';
import type { ExpensesData } from '@/components/expenses-report';
import { FinancialReportSection } from '@/components/financial-report-section';
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

interface FinancialData {
  expenses: ExpensesData;
  summary: {
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
  };
  payments: Array<{
    method: string;
    label: string;
    revenue: number;
    transactions: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
    by_method: Record<string, number>;
  }>;
  topItems: Array<{
    name: string;
    type: 'produk' | 'paket';
    total_qty: number;
    total_revenue: number;
  }>;
  cabangName: string;
  filters: {
    start_date: string;
    end_date: string;
  };
}

interface Props extends SalesHistoryProps {
  stats: Stats;
  top_products: TopProduct[];
  stockSummary: StockSummaryRow[];
  stockFilters: StockSummaryFilters;
  financialData: FinancialData | null;
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
  financialData,
  user,
}: Props) {
  // Tiga bagian (keuangan, stok, riwayat penjualan) punya filter sendiri di
  // URL yang sama; masing-masing membawa filter dua bagian lainnya supaya
  // mengganti salah satunya tidak mereset yang lain.
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

  const financeParams: Record<string, string> = {};
  if (financialData?.filters?.start_date) {
    financeParams.fin_start_date = financialData.filters.start_date;
  }
  if (financialData?.filters?.end_date) {
    financeParams.fin_end_date = financialData.filters.end_date;
  }

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

        {/* Stat cards hanya untuk kasir (owner pakai FinancialReportSection) */}
        {user.role === 'kasir' && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                title="Pendapatan Hari Ini"
                value={`Rp ${stats.today_revenue.toLocaleString('id-ID')}`}
              />
              <StatCard
                title="Transaksi Hari Ini"
                value={stats.today_transactions.toString()}
              />
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
          </>
        )}

        {/* Financial Report Section untuk owner */}
        {user.role === 'owner' && financialData && (
          <FinancialReportSection
            expenses={financialData.expenses}
            summary={financialData.summary}
            payments={financialData.payments}
            dailyRevenue={financialData.dailyRevenue}
            // topItems={financialData.topItems}
            cabangName={financialData.cabangName}
            filters={financialData.filters}
            basePath={dashboard().url}
            extraParams={{ ...stockParams, ...historyParams }}
          />
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Ringkasan Stok</h2>
          <StockSummarySection
            stockSummary={stockSummary}
            filters={stockFilters}
            basePath={dashboard().url}
            extraParams={{ ...historyParams, ...financeParams }}
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
            extraParams={{ ...stockParams, ...financeParams }}
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
