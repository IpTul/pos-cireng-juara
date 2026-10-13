import { Head } from '@inertiajs/react';

type SopItem = {
  title: string;
  description: string;
  points: string[];
};

const sopItems: SopItem[] = [
  {
    title: 'Cara Menyambut Customer',
    description: 'Tata cara menyambut customer dengan ramah dan profesional.',
    points: [
      'Iya kak silahkan, mau digoreng atau mentahan.',
      'Mau varian apa aja kak.',
      'Kakaknya ada membernya ?.',
      'atas nama siapa.',
      'totalnya sekian kak.',
      'pembayarannya mau cash atau qris.',
      'ditunggu ya kaka silahkan duduk dulu kak.',
    ],
  },
  {
    title: 'Setelah selesai digoreng',
    description:
      'Tata cara menyajikan cireng yang sudah digoreng agar tetap hangat dan enak.',
    points: [
      'Permisi kak mau pake sambel atau engga ?',
      'Permisi kak atas (nama customer) ini pesanannya kak.',
      'Terimakasih kak datan kembali.',
    ],
  },
];

export default function SopPage() {
  return (
    <>
      <Head title="SOP Operasional" />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600 uppercase dark:text-indigo-400">
            Standard Operating Procedure
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            SOP Operasional Cireng Juara
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Dokumen ini berisi tata cara kerja yang harus dipatuhi agar produksi
            cireng berjalan konsisten, higienis, dan efisien.
          </p>
        </header>

        <div className="space-y-6">
          {sopItems.map((item, index) => (
            <section
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {index + 1}
                </span>
                <h2 className="text-xl font-semibold text-card-foreground">
                  {item.title}
                </h2>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-card-foreground">
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-muted p-6 text-foreground">
          <h3 className="text-lg font-semibold">Catatan Penting</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Semua karyawan wajib mengikuti SOP ini, menjaga kebersihan, dan
            melaporkan setiap masalah yang terjadi agar kualitas produk tetap
            terjaga.
          </p>
        </div>
      </div>
    </>
  );
}
