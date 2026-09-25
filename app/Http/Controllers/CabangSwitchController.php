<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CabangSwitchController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // null / tidak dikirim = "Semua Cabang"
            'cabang_id' => ['nullable', 'exists:cabangs,id'],
        ]);

        session(['active_cabang_id' => $validated['cabang_id'] ?? null]);

        return back();
    }
}