<?php

namespace App\Http\Controllers;

use App\Models\MemberHistory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemberHistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_if($user->isKasir(), 403);

        $search = trim((string) $request->input('q', ''));

        $histories = MemberHistory::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('member_name', 'like', "%{$search}%")
                        ->orWhere('member_phone', 'like', "%{$search}%")
                        ->orWhere('operator_name', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('members/history', [
            'histories' => $histories,
            'search' => $search,
        ]);
    }
}