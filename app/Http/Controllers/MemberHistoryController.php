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

        $histories = MemberHistory::with(['user:id,name,operator_name'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('members/history', [
            'histories' => $histories,
        ]);
    }
}