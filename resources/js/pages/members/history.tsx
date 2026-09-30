import { Head, router } from '@inertiajs/react';
import type { PaginatedData } from '@/types';
import { Button } from '@/components/ui/button';

interface MemberHistoryItem {
  id: number;
  member_name: string;
  member_phone: string;
  created_at: string;
  user: { id: number; name: string } | null;
  cabang: { id: number; name: string } | null;
}

interface Props {
  histories: PaginatedData<MemberHistoryItem>;
}

export default function MemberHistoryIndex({ histories }: Props) {
  return (
    <>
      <Head title="Riwayat Member" />
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold">Riwayat Member</h1>

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Waktu</th>
                <th className="px-4 py-3 text-left">Member Baru</th>
                <th className="px-4 py-3 text-left">Nomor HP</th>
                <th className="px-4 py-3 text-left">Ditambahkan Oleh</th>
                <th className="px-4 py-3 text-left">Cabang</th>
              </tr>
            </thead>
            <tbody>
              {histories.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada riwayat.
                  </td>
                </tr>
              ) : (
                histories.data.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b last:border-0 hover:bg-muted/25"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(h.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 font-medium">{h.member_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {h.member_phone}
                    </td>
                    <td className="px-4 py-3">
                      {h.user?.name ?? 'User dihapus'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {h.cabang?.name ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {histories.last_page > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <span className="text-sm text-muted-foreground">
                Menampilkan {histories.from} sampai {histories.to} dari{' '}
                {histories.total} data
              </span>
              <div className="flex gap-2">
                {histories.current_page > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.get(
                        '/members/history',
                        { page: histories.current_page - 1 },
                        { preserveScroll: true },
                      )
                    }
                  >
                    Sebelumnya
                  </Button>
                )}
                {histories.current_page < histories.last_page && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.get(
                        '/members/history',
                        { page: histories.current_page + 1 },
                        { preserveScroll: true },
                      )
                    }
                  >
                    Selanjutnya
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

MemberHistoryIndex.layout = {
  breadcrumbs: [
    { title: 'Manajemen Member', href: '/members' },
    { title: 'Riwayat Member', href: '/members/history' },
  ],
};
