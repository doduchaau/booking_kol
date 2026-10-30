<?php

namespace Modules\Creator\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CollectCreatorFromExtensionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:150'],
            'handle' => ['required', 'string', 'max:150'],
            'platform' => ['required', 'string', 'in:tiktok,facebook,instagram,youtube,shopee,zalo'],
            'url' => ['nullable', 'string', 'max:255'],
            'avatar_url' => ['nullable', 'string', 'max:500'],
            'followers_count' => ['nullable', 'integer', 'min:0'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'niche' => ['nullable', 'string', 'max:100'],
            'city_province' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'shipping_address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'rate_price' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'handle.required' => 'Username hoặc @handle trang cá nhân không được để trống.',
            'platform.required' => 'Nền tảng mạng xã hội không được để trống.',
            'platform.in' => 'Nền tảng mạng xã hội không hợp lệ.',
            'email.email' => 'Địa chỉ email không đúng định dạng.',
            'rate_price.numeric' => 'Đơn giá rate card phải là số.',
        ];
    }
}
