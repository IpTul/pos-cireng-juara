import { Head } from '@inertiajs/react';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { usePage } from '@inertiajs/react';
import { formatRupiah, formatDate } from '@/lib/utils';

export default function SalesHistory() {
    const { data } = usePage().props;
    const { saleItems, can } = data;

    return (
        <>
            <Head title="Riwayat Penjualan" />

            <div className="pb-8 pb-md-16">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Riwayat Penjualan
                    </h1>
                    <div className="space-x-3">
                        {can('create') && (
                            <Button
                                variant="default"
                                size="icon"
                            >
                                {/* Add button will go here */}
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="mt-4">
                    <CardHeader className="pb-4">
                        <CardTitle>Riwayat Transaksi Penjualan</CardTitle>
                    </CardHeader>

                    <div className="overflow-x-auto">
                        <Table className="text-sm">
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-gray-800">
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tanggal
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Kasir
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Total
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tunai
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Kembalian
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tindakan
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {saleItems.map((sale) => (
                                    <TableRow key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {formatDate(sale.created_at)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {sale.user?.name || '-'}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {formatRupiah(sale.total)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {formatRupiah(sale.cash_tendered)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {formatRupiah(sale.change_amount)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                              ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'}`}>
                                                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {/* Action buttons can go here */}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <CardFooter className="pt-4">
                        {/* Pagination can be added here if needed */}
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}