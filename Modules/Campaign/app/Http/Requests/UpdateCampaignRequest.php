<?php

namespace Modules\Campaign\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Chuẩn hóa danh sách sản phẩm và tự động gán product_name từ sản phẩm đầu tiên
        if (!empty($this->products) && is_array($this->products)) {
            $normalizedProducts = array_map(function ($p) {
                if (is_array($p)) {
                    $p['name'] = $p['name'] ?? $p['product_name'] ?? null;
                    $p['sku'] = $p['sku'] ?? $p['product_sku'] ?? null;
                }
                return $p;
            }, $this->products);

            $this->merge([
                'products' => $normalizedProducts,
            ]);

            if (empty($this->product_name) && !empty($normalizedProducts[0]['name'])) {
                $this->merge([
                    'product_name' => $normalizedProducts[0]['name'],
                    'product_sku' => $normalizedProducts[0]['sku'] ?? null,
                ]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'product_name' => ['required', 'string', 'max:200'],
            'product_sku' => ['nullable', 'string', 'max:100'],
            'products' => ['nullable', 'array'],
            'products.*.id' => ['nullable', 'integer'],
            'products.*.name' => ['required_with:products', 'string', 'max:200'],
            'products.*.sku' => ['nullable', 'string', 'max:100'],
            'products.*.product_url' => ['nullable', 'string', 'max:500'],
            'products.*.retail_price' => ['nullable', 'numeric', 'min:0'],
            'products.*.brief_content' => ['nullable', 'string'],
            'products.*.brief_file' => ['nullable', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,webp,txt,zip'],
            'products.*.remove_brief_file' => ['nullable', 'boolean'],
            'products.*.hashtags' => ['nullable', 'string', 'max:255'],
            'products.*.sample_requirement' => ['nullable', 'string'],
            'budget' => ['required', 'numeric', 'min:0'],
            'target_creators_count' => ['required', 'integer', 'min:1', 'max:1000'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'content_guidelines' => ['nullable', 'string'],
            'content_guidelines_file' => ['nullable', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,webp,txt,zip'],
            'remove_content_guidelines_file' => ['nullable', 'boolean'],
            'key_messages' => ['nullable', 'string'],
            'hashtags' => ['nullable', 'string', 'max:500'],
            'dos_and_donts' => ['nullable', 'string'],
            'discount_code' => ['nullable', 'string', 'max:100'],
            'affiliate_link' => ['nullable', 'string', 'max:500'],
            'sample_requirement' => ['nullable', 'string'],
            'sample_requirement_file' => ['nullable', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,webp,txt,zip'],
            'remove_sample_requirement_file' => ['nullable', 'boolean'],
            'video_deadline_days' => ['nullable', 'integer', 'min:1', 'max:90'],
            'commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'ads_commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'status' => ['required', 'in:draft,active,completed,paused'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Vui lòng nhập tên chiến dịch.',
            'product_name.required' => 'Vui lòng nhập tên sản phẩm chính.',
            'budget.required' => 'Vui lòng nhập tổng ngân sách dự kiến.',
            'target_creators_count.required' => 'Vui lòng nhập mục tiêu số lượng Creator.',
            'start_date.required' => 'Vui lòng chọn ngày bắt đầu chiến dịch.',
            'end_date.required' => 'Vui lòng chọn ngày kết thúc chiến dịch.',
            'end_date.after_or_equal' => 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.',
        ];
    }
}
