<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in(['owner', 'kasir'])],
            'cabang_id' => ['nullable', 'required_if:role, kasir', 'exists:cabangs,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'role.in' => 'Role harus owner atau kasir.',
            'cabang_id.required_if' => 'Cabang wajib dipilih untuk akun kasir.',
        ];
    }
}