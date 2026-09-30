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

        $activeCabangId = $user->activeCabangId();

        $histories = MemberHistory::with(['user:id,name', 'cabang:id,name'])
            ->when($activeCabangId, fn ($q) => $q->where('cabang_id', $activeCabangId))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('members/history', [
            'histories' => $histories,
        ]);
    }
}