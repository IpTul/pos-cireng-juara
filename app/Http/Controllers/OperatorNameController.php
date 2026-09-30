<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class OperatorNameController extends Controller
{
    public function show(): Response
    {
        $user = request()->user();

        return Inertia::render('auth/operator-name', [
            'currentName' => $user->operator_name ?? session('operator_name'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'operator_name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $user->operator_name = $validated['operator_name'];
        $user->save();

        session(['operator_name' => $validated['operator_name']]);

        Log::info('Operator name updated', [
            'user_id' => $user->id,
            'operator_name' => $validated['operator_name']
        ]);

        return redirect()->route('dashboard');
    }
}