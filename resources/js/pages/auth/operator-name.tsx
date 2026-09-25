import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';

interface Props {
  currentName: string | null;
}

export default function OperatorName({ currentName }: Props) {
  const [name, setName] = useState(currentName ?? '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    router.post(
      '/operator-name',
      { operator_name: name },
      {
        onError: (errors) => {
          setError(Object.values(errors)[0] as string);
          setProcessing(false);
        },
        onFinish: () => setProcessing(false),
      },
    );
  }

  return (
    <>
      <Head title="Siapa yang bertugas?" />

      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Siapa yang bertugas hari ini?
            </h1>
            <p className="text-sm text-muted-foreground">
              Nama ini dipakai buat mencatat siapa yang menangani tiap
              transaksi, walau akun ini dipakai bergantian.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="operator_name">Nama kamu</Label>
            <Input
              id="operator_name"
              type="text"
              placeholder="Contoh: Iptul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              autoFocus
              required
            />
            <InputError message={error ?? undefined} />
          </div>

          <Button className="w-full" disabled={processing || !name.trim()}>
            {processing ? 'Menyimpan…' : 'Mulai Kerja'}
          </Button>
        </form>
      </div>
    </>
  );
}

OperatorName.layout = {
  title: 'Siapa yang bertugas?',
  description: 'Isi nama kamu untuk melanjutkan',
};
