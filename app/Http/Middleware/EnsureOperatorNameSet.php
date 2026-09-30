<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureOperatorNameSet
{
    protected array $except = [
        'operator-name.show',
        'operator-name.store',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isKasir()) {
            return $next($request);
        }

        if ($request->routeIs($this->except)) {
            return $next($request);
        }

        if (! session('operator_name')) {
            return redirect()->route('operator-name.show');
        }

        return $next($request);
    }
}