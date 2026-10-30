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
            'creator_ids' => ['required', 'array', 'min:1'],
            'creator_ids.*' => ['exists:creators,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'booking_fee' => ['nullable', 'numeric', 'min:0'],
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
