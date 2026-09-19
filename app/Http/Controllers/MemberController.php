<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Member::active();

        // Search by name or phone
        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where('phone', 'like', "%{$search}%");
        }

        $members = $query->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('members/index', [
            'members' => $members,
            'search' => $request->input('search', ''),
        ]);
    }

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20', 'unique:members,phone'],
        ]);

        Member::create($validated);

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
        $member->delete(); // Hard delete for manual deletion

        return redirect()->route('members.index')
            ->with('success', 'Member berhasil dihapus.');
    }

    public function search(Request $request): JsonResponse
    {
        $query = Member::active();
    
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