<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SOPController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->inRole(['owner', 'kasir']), 403, 'Akses ditolak.');

        return Inertia::render('sop/index');
    }
}