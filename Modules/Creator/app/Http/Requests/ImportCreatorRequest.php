<?php

namespace Modules\Creator\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportCreatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:20480'],
            'format' => ['nullable', 'string', 'in:auto,standard,kalodata,fastmoss,smart_import'],
            'custom_mapping' => ['nullable', 'array'],
            'auto_enrich' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Vui lòng chọn file dữ liệu để import.',
            'file.mimes' => 'Hệ thống chỉ chấp nhận file định dạng .csv hoặc .xlsx, .xls.',
            'file.max' => 'Dung lượng file tối đa là 20MB.',
        ];
    }
}
