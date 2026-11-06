<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Catatan bersama untuk owner dan produksi (seperti aplikasi note di HP).
 * Semua catatan terlihat oleh kedua role; yang boleh mengubah/menghapus
 * hanya pembuatnya atau owner.
 */
class NoteController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorizeRole($request);
        $user = $request->user();

        $notes = Note::query()
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Note $note) => [
                'id' => $note->id,
                'title' => $note->title,
                'body' => $note->body,
                'color' => $note->color,
                'is_pinned' => $note->is_pinned,
                'author' => $note->author_name ?? '-',
                'created_at' => $note->created_at,
                'updated_at' => $note->updated_at,
                'can_edit' => $this->canModify($user, $note),
            ]);

        return Inertia::render('notes/index', ['notes' => $notes]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeRole($request);

        $validated = $this->validated($request);
        $user = $request->user();

        Note::create($validated + [
            'user_id' => $user->id,
            'author_name' => $user->operator_name ?: $user->name,
        ]);

        return redirect()->route('note.index')->with('success', 'Catatan disimpan.');
    }

    public function update(Request $request, Note $note): RedirectResponse
    {
        $this->authorizeRole($request);
        abort_unless($this->canModify($request->user(), $note), 403, 'Hanya pembuat catatan atau owner yang boleh mengubahnya.');

        $note->update($this->validated($request));

        return redirect()->route('note.index')->with('success', 'Catatan diperbarui.');
    }

    public function destroy(Request $request, Note $note): RedirectResponse
    {
        $this->authorizeRole($request);
        abort_unless($this->canModify($request->user(), $note), 403, 'Hanya pembuat catatan atau owner yang boleh menghapusnya.');

        $note->delete();

        return redirect()->route('note.index')->with('success', 'Catatan dihapus.');
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:20000'],
            'color' => ['required', Rule::in(Note::COLORS)],
            'is_pinned' => ['required', 'boolean'],
        ]);

        // Catatan kosong tidak ada gunanya disimpan
        if (blank($validated['title'] ?? null) && blank($validated['body'] ?? null)) {
            throw ValidationException::withMessages(['body' => 'Isi judul atau catatan terlebih dahulu.']);
        }

        return $validated;
    }

    private function authorizeRole(Request $request): void
    {
        abort_unless($request->user()?->inRole(['owner', 'produksi']), 403, 'Akses ditolak.');
    }

    private function canModify($user, Note $note): bool
    {
        return $user->isOwner() || $note->user_id === $user->id;
    }
}