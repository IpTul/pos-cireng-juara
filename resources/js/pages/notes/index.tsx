import { Head, router } from '@inertiajs/react';
import { Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type NoteColor = 'default' | 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

interface Note {
  id: number;
  title: string | null;
  body: string | null;
  color: NoteColor;
  is_pinned: boolean;
  author: string;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
}

interface Props {
  notes: Note[];
}

const COLORS: { value: NoteColor; label: string; card: string; dot: string }[] =
  [
    {
      value: 'default',
      label: 'Putih',
      card: 'bg-card',
      dot: 'bg-card border',
    },
    {
      value: 'yellow',
      label: 'Kuning',
      card: 'bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800',
      dot: 'bg-yellow-300',
    },
    {
      value: 'green',
      label: 'Hijau',
      card: 'bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800',
      dot: 'bg-green-300',
    },
    {
      value: 'blue',
      label: 'Biru',
      card: 'bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
      dot: 'bg-blue-300',
    },
    {
      value: 'pink',
      label: 'Pink',
      card: 'bg-pink-100 border-pink-200 dark:bg-pink-900/30 dark:border-pink-800',
      dot: 'bg-pink-300',
    },
    {
      value: 'orange',
      label: 'Oranye',
      card: 'bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800',
      dot: 'bg-orange-300',
    },
  ];

const cardClass = (color: NoteColor) =>
  COLORS.find((c) => c.value === color)?.card ?? COLORS[0].card;

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mb-3 block w-full break-inside-avoid rounded-xl border p-4 text-left shadow-sm transition-shadow hover:shadow-md ${cardClass(note.color)}`}
    >
      <div className="flex items-start justify-between gap-2">
        {note.title ? (
          <p className="font-semibold break-words">{note.title}</p>
        ) : (
          <span />
        )}
        {note.is_pinned && (
          <Pin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </div>
      {note.body && (
        <p className="mt-1 line-clamp-8 text-sm break-words whitespace-pre-wrap">
          {note.body}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {note.author} • {formatDate(note.updated_at)}
      </p>
    </button>
  );
}

export default function NotesIndex({ notes }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const readOnly = !!editing && !editing.can_edit;
  const canSave = !readOnly && (title.trim() !== '' || body.trim() !== '');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      `${n.title ?? ''} ${n.body ?? ''} ${n.author}`.toLowerCase().includes(q),
    );
  }, [notes, search]);

  const pinnedNotes = filtered.filter((n) => n.is_pinned);
  const otherNotes = filtered.filter((n) => !n.is_pinned);

  function openNew() {
    setEditing(null);
    setTitle('');
    setBody('');
    setColor('default');
    setPinned(false);
    setOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setTitle(note.title ?? '');
    setBody(note.body ?? '');
    setColor(note.color);
    setPinned(note.is_pinned);
    setOpen(true);
  }

  function save() {
    if (!canSave) return;
    const payload = {
      title: title.trim() || null,
      body: body.trim() || null,
      color,
      is_pinned: pinned,
    };
    const options = {
      preserveScroll: true,
      onStart: () => setSaving(true),
      onFinish: () => setSaving(false),
      onSuccess: () => {
        toast.success(editing ? 'Catatan diperbarui' : 'Catatan disimpan');
        setOpen(false);
      },
      onError: (errors: Record<string, string>) =>
        toast.error(Object.values(errors)[0] ?? 'Gagal menyimpan catatan'),
    };

    if (editing) router.put(`/note/${editing.id}`, payload, options);
    else router.post('/note', payload, options);
  }

  function remove() {
    if (!editing) return;
    router.delete(`/note/${editing.id}`, {
      preserveScroll: true,
      onStart: () => setSaving(true),
      onFinish: () => setSaving(false),
      onSuccess: () => {
        toast.success('Catatan dihapus');
        setConfirmDelete(false);
        setOpen(false);
      },
      onError: (errors) =>
        toast.error(Object.values(errors)[0] ?? 'Gagal menghapus catatan'),
    });
  }

  return (
    <>
      <Head title="Note" />
      <div className="p-3 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">Note</h1>
            <p className="text-sm text-muted-foreground">
              Catatan bersama owner dan produksi.
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Catatan baru
          </Button>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari catatan..."
            className="pl-9"
          />
        </div>

        {notes.length === 0 ? (
          <div className="rounded-lg border px-4 py-12 text-center text-sm text-muted-foreground">
            Belum ada catatan. Tekan "Catatan baru" untuk mulai menulis.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border px-4 py-12 text-center text-sm text-muted-foreground">
            Tidak ada catatan yang cocok dengan "{search}".
          </div>
        ) : (
          <div className="space-y-6">
            {pinnedNotes.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Disematkan
                </h2>
                <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
                  {pinnedNotes.map((n) => (
                    <NoteCard key={n.id} note={n} onOpen={() => openEdit(n)} />
                  ))}
                </div>
              </section>
            )}
            {otherNotes.length > 0 && (
              <section>
                {pinnedNotes.length > 0 && (
                  <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Lainnya
                  </h2>
                )}
                <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
                  {otherNotes.map((n) => (
                    <NoteCard key={n.id} note={n} onOpen={() => openEdit(n)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`max-w-lg ${cardClass(color)}`}>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? readOnly
                  ? 'Catatan'
                  : 'Edit catatan'
                : 'Catatan baru'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Oleh ${editing.author} • ${formatDate(editing.created_at)}${
                    readOnly
                      ? ' • hanya pembuat atau owner yang bisa mengubah'
                      : ''
                  }`
                : 'Tulis catatan seperti di HP.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul"
              disabled={readOnly}
              className="bg-background/60 font-semibold"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tulis catatan..."
              rows={10}
              disabled={readOnly}
              className="bg-background/60"
            />

            {!readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2" role="radiogroup">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={color === c.value}
                      aria-label={c.label}
                      title={c.label}
                      onClick={() => setColor(c.value)}
                      className={`h-7 w-7 rounded-full ${c.dot} ${
                        color === c.value
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : ''
                      }`}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPinned((p) => !p)}
                >
                  {pinned ? (
                    <PinOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Pin className="mr-2 h-4 w-4" />
                  )}
                  {pinned ? 'Lepas sematan' : 'Sematkan'}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {editing && editing.can_edit ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {readOnly ? 'Tutup' : 'Batal'}
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  disabled={!canSave || saving}
                  onClick={save}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus catatan?</DialogTitle>
            <DialogDescription>
              Catatan yang dihapus tidak bisa dipulihkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={remove}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

NotesIndex.layout = {
  breadcrumbs: [{ title: 'Note', href: '/note' }],
};
