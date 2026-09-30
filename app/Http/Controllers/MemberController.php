<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\MemberHistory;

class MemberController extends Controller   
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    private function authorizeSameCabang(Member $member): void
    {
        if ($this->user->isKasir() && $member->cabang_id !== $this->user->cabang_id) {
            abort(403, 'Member ini bukan milik cabang kamu.');
        }
    }

    public function index(Request $request): Response
    {
        $activeCabangId = $this->user->activeCabangId();

        $query = Member::active()
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId));

        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where('phone', 'like', "%{$search}%");
        }

        $sort = in_array($request->input('sort'), ['points_desc', 'points_asc'], true)
        ? $request->input('sort')
        : null;

        if ($sort === 'points_desc') {
            $query->orderBy('points', 'desc')->orderBy('id');
        } elseif ($sort === 'points_asc') {
            $query->orderBy('points', 'asc')->orderBy('id');
        } else {
            $query->latest();
        }

        $members = $query->paginate(15)->withQueryString();

        return Inertia::render('members/index', [
            'members' => $members,
            'search' => $request->input('search', ''),
            'sort' => $sort ?? '',
        ]);
    }

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20', 'unique:members,phone'],
            'cabang_id' => ['nullable', 'exists:cabangs,id'],
        ]);

        $validated['cabang_id'] = $this->user->isKasir()
            ? $this->user->cabang_id
            : $validated['cabang_id'];

        if (! $validated['cabang_id']) {
            return back()->withErrors(['cabang_id' => 'Cabang wajib dipilih.']);
        }

        $member = Member::create($validated);

        if ($this->user->isKasir()) {
            MemberHistory::create([
                'member_id' => $member->id,
                'member_name' => $member->name,
                'member_phone' => $member->phone,
                'cabang_id' => $member->cabang_id,
                'user_id' => $this->user->id,
                'action' => 'created',
            ]);
        }

        return redirect()->route('members.index')
            ->with('success', 'Member berhasil dibuat.');
    }

    public function update(Request $request, Member $member): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeSameCabang($member);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20', 'unique:members,phone,' . $member->id],
            'cabang_id' => ['nullable', 'exists:cabangs,id'],
        ]);

        $validated['cabang_id'] = $this->user->isKasir()
            ? $member->cabang_id
            : ($validated['cabang_id'] ?? $member->cabang_id);

        $member->update($validated);

        return redirect()->route('members.index')
            ->with('success', 'Member berhasil diperbarui.');
    }

    public function destroy(Member $member): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeSameCabang($member);

        $member->delete();

        return redirect()->route('members.index')
            ->with('success', 'Member berhasil dihapus.');
    }

    public function search(Request $request): JsonResponse
    {
        $activeCabangId = $this->user->activeCabangId();

        $query = Member::active()
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId));

        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where('phone', 'like', "%{$search}%");
        }

        $members = $query->select('id', 'name', 'phone', 'points', 'last_purchase_at', 'cabang_id')
            ->limit(10)
            ->get();

        return response()->json($members);
    }
}