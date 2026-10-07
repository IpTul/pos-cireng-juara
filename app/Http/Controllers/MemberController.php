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

    public function index(Request $request): Response
    {
        $query = Member::query();

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
            'search' => $request->input('q', ''),
            'sort' => $sort ?? '',
        ]);
    }

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20', 'unique:members,phone'],
        ]);

        $member = Member::create($validated);

        $user = $request->user();

        if ($user->isKasir()) {
            MemberHistory::create([
                'member_id' => $member->id,
                'member_name' => $member->name,
                'member_phone' => $member->phone,
                'user_id' => $user->id,
                'operator_name' => $user->operator_name ?: $user->name,
                'cabang_id' => $user->cabang_id,
                'cabang_name' => $user->cabang?->name,
                'action' => 'created',
            ]);
        }

        return redirect()->route('members.index')
            ->with('success', 'Member berhasil dibuat.');
    }

    public function update(Request $request, Member $member): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20', 'unique:members,phone,' . $member->id],
        ]);

        $member->update($validated);

        return redirect()->route('members.index')
            ->with('success', 'Member berhasil diperbarui.');
    }

    public function destroy(Member $member): \Illuminate\Http\RedirectResponse
    {
        $member->delete();

        return redirect()->route('members.index')
            ->with('success', 'Member berhasil dihapus.');
    }

    public function search(Request $request): JsonResponse
    {
        $query = Member::query();
        
        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where('phone', 'like', "%{$search}%");
        }

        $members = $query->select('id', 'name', 'phone', 'points', 'last_purchase_at')
            ->limit(10)
            ->get();

        return response()->json($members);
    }
}