<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCabangRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isOwner() ?? false;
    }
    
    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255', 'unique:cabangs,name,' . $this->route('cabang')->id],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
