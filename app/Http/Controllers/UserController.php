<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Hash;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->user = auth()->user();
    }

    private function authorizeOwnerOnly()
    {
        if (! $this->user?->isOwner()) {
            abort(403, 'Hanya owner yang boleh melakukan aksi ini.');
        }
    }

    public function index()
    {
        $users = User::with('cabang')->orderBy('name')->get();

        return Inertia::render('users/index', [
            'users' => $users,
            'user' => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
                'role'  => $this->user->role,
            ],
        ]);
    }

    public function store(StoreUserRequest $request)
    {
        $this->authorizeOwnerOnly();
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);
        User::create($data);
        return redirect()->route('users.index')->with('success', 'User berhasil dibuat.');
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $this->authorizeOwnerOnly();
        $data = $request->validated();
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password'], $data['password_confirmation']);
        }
        $user->update($data);
        return redirect()->route('users.index')->with('success', 'User berhasil diperbarui.');
    }

    public function destroy(User $user)
    {
        $this->authorizeOwnerOnly();

        if ($user->id === $this->user->id) {
            return back()->with('error', 'Tidak bisa menghapus akun sendiri.');
        }

        $user->delete();
        return redirect()->route('users.index')->with('success', 'User berhasil dihapus.');
    }
}