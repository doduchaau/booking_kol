<?php

namespace Modules\Campaign\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddCreatorsToCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'select_all_in_db' => ['nullable', 'boolean'],
            'creator_ids' => [
                'nullable',
                'array',
                function ($attribute, $value, $fail) {
                    if (!$this->boolean('select_all_in_db') && (empty($value) || !is_array($value) || count($value) === 0)) {
                        $fail('Vui lòng chọn ít nhất 1 Creator hoặc chọn gán toàn bộ KOC trong kho dữ liệu.');
                    }
                },
            ],
            'creator_ids.*' => ['exists:creators,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'booking_fee' => ['nullable', 'numeric', 'min:0'],
            'collaboration_type' => ['nullable', 'in:video,livestream,both'],
            'booking_platforms' => ['nullable', 'array'],
            'booking_platforms.*' => ['string', 'in:tiktok,facebook,shopee,youtube,instagram,zalo'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['exists:campaign_products,id'],
            'product_quantities' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'creator_ids.required' => 'Vui lòng chọn ít nhất 1 Creator để gán vào chiến dịch.',
            'creator_ids.min' => 'Vui lòng chọn ít nhất 1 Creator để gán vào chiến dịch.',
            'creator_ids.*.exists' => 'Creator được chọn không tồn tại trong hệ thống.',
            'assigned_to.exists' => 'Nhân viên phụ trách được chọn không hợp lệ.',
            'booking_fee.numeric' => 'Chi phí booking phải là định dạng số.',
        ];
    }
}
