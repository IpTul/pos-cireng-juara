<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
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

        // Cuma berlaku buat kasir yang sudah login — owner & tamu dilewati
        if (! $user || ! $user->isKasir()) {
            return $next($request);
        }

        if ($request->routeIs($this->except)) {
            return $next($request);
        }

        if (! session()->has('operator_name')) {
            return redirect()->route('operator-name.show');
        }

        return $next($request);
    }
}