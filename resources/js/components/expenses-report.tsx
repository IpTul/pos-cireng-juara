export interface ExpensesData {
  total: number;
  count: number;
  net_revenue: number;
  per_cabang: Array<{
    cabang: string;
    cash_sales: number;
    expenses: number;
    cash_balance: number;
  }>;
  items: Array<{
    id: number;
    date: string;
    cabang: string | null;
    description: string;
    operator: string;
    amount: number;
  }>;
}

function formatIDR(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatDateLabel(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ExpensesReport({ expenses }: { expenses: ExpensesData }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Pengeluaran Tunai</h3>
      <p className="text-sm text-muted-foreground">
        Dicatat kasir dari uang tunai (mis. beli gas), mengikuti rentang tanggal
        dan cabang.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <div className="rounded-lg border p-3 md:p-4">
          <span className="text-sm text-muted-foreground">
            Total Pengeluaran ({expenses.count})
          </span>
          <p className="mt-1 text-xl font-bold text-red-600 md:text-2xl">
            − {formatIDR(expenses.total)}
          </p>
        </div>
        <div className="rounded-lg border p-3 md:p-4">
          <span className="text-sm text-muted-foreground">
            Pendapatan Bersih
          </span>
          <p
            className={`mt-1 text-xl font-bold md:text-2xl ${expenses.net_revenue < 0 ? 'text-red-600' : ''}`}
          >
            {formatIDR(expenses.net_revenue)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 text-sm font-medium">
          Sisa Tunai per Cabang
        </div>
        <ul className="divide-y">
          {expenses.per_cabang.map((c) => (
            <li
              key={c.cabang}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span className="font-medium">{c.cabang}</span>
              <span className="text-muted-foreground">
                {formatIDR(c.cash_sales)} − {formatIDR(c.expenses)}
              </span>
              <span
                className={`font-semibold ${c.cash_balance < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {formatIDR(c.cash_balance)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 text-sm font-medium">
          Rincian Pengeluaran
        </div>
        {expenses.items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Tidak ada pengeluaran pada rentang ini.
          </p>
        ) : (
          <ul className="divide-y">
            {expenses.items.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {e.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateLabel(e.date)} · {e.cabang ?? '-'} · {e.operator}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-red-600">
                  − {formatIDR(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
