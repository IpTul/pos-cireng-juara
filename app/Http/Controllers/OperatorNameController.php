<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OperatorNameController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('auth/operator-name', [
            'currentName' => session('operator_name'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'operator_name' => ['required', 'string', 'max:255'],
        ]);

        session(['operator_name' => $validated['operator_name']]);

        return redirect()->route('dashboard');
    }
}