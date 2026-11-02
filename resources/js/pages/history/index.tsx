import { Head } from '@inertiajs/react';
import { SalesHistory } from '@/components/sales-history';
import type { SalesHistoryProps } from '@/components/sales-history';

export default function History(props: SalesHistoryProps) {
  return (
    <>
      <Head title="Riwayat Penjualan" />
      <div className="p-3 md:p-6 print:p-0">
        <div className="mb-4 flex items-center justify-between print:mb-4">
          <h1 className="text-2xl font-bold">Riwayat Penjualan</h1>
        </div>

        <SalesHistory {...props} basePath="/history" />
      </div>
    </>
  );
}

History.layout = {
  breadcrumbs: [{ title: 'Riwayat Penjualan', href: '/history' }],
};
