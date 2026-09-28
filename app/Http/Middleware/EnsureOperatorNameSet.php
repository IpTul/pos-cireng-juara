<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureOperatorNameSet
{
    /**
     * Rute yang boleh diakses TANPA operator name sudah di-set —
     * supaya kasir tidak kejebak infinite redirect loop.
     */
    protected array $except = [
        'operator-name.show',
        'operator-name.store',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Hanya berlaku untuk kasir yang sudah login — owner & tamu dilewati
        if (! $user || ! $user->isKasir()) {
            return $next($request);
        }

        // Jika sedang mengakses route yang terkecuali, lanjutkan tanpa redirect
        if ($request->routeIs($this->except)) {
            return $next($request);
        }

        // Cek operator name di session; jika tidak ada, redirect ke form input
        if (! session('operator_name')) {
            return redirect()->route('operator-name.show');
        }

        return $next($request);
    }
}