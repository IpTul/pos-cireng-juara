<?php

namespace App\Http\Controllers;

use App\Models\Addon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AddonController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    private function authorizeOwnerOnly()
    {
        if(! $this->user?->isOwner()) {
            abort(403, 'Hanya owner yang boleh melakukan aksi ini.');
        }
    }
    
    public function index(): Response
    {
        $this->authorizeOwnerOnly();
        $addons = Addon::orderBy('name')->paginate(15);

        return Inertia::render('addons/index', [
            'addons' => $addons,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'price' => 'required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        Addon::create($validated);

        return redirect()->route('addons.index')->with('success', 'Addon berhasil ditambahkan.');
    }

    public function update(Request $request, Addon $addon)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'price' => 'required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $addon->update($validated);

        return redirect()->route('addons.index')->with('success', 'Addon berhasil diperbarui.');
    }

    public function destroy(Addon $addon)
    {
        $addon->delete();

        return redirect()->route('addons.index')->with('success', 'Addon berhasil dihapus.');
    }
}