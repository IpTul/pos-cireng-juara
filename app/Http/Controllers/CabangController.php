<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCabangRequest;
use App\Http\Requests\UpdateCabangRequest;
use App\Models\Cabang;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class CabangController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    public function authorizeOwnerOnly()
    {
        if(! $this->user?->isOwner()) {
            abort(403, 'Hanya owner yang boleh melakukan aksi ini.');
        }
    }

    public function index()
    {
        $cabangs = Cabang::withCount('products')->orderby('name')->get();

        return Inertia::render('cabangs/index', [
            'cabangs' => $cabangs,
            'user' => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
                'role'  => $this->user->role,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCabangRequest $request)
    {
        $this->authorizeOwnerOnly();
        Cabang::create($request->validated());
        return redirect()->route('cabangs.index')->with('success', 'Cabang berhasil dibuat.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Cabang $cabang)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Cabang $cabang)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCabangRequest $request, Cabang $cabang)
    {
        $this->authorizeOwnerOnly();
        $cabang->update($request->validated());
        return redirect()->route('cabangs.index')->with('success', 'Cabang berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Cabang $cabang)
    {
        $this->authorizeOwnerOnly();
        $cabang->delete();
        return redirect()->route('cabangs.index')->with('success', 'Cabang berhasil dihapus.');
    }
}
