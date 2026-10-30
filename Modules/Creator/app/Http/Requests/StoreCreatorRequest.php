<?php

namespace Modules\Creator\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Creator\Services\CreatorNormalizationService;

class StoreCreatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Làm sạch và lọc các tài khoản mạng xã hội rỗng
        if ($this->has('accounts') && is_array($this->accounts)) {
            $cleaned = [];
            foreach ($this->accounts as $acc) {
                if (!is_array($acc)) {
                    continue;
                }
                $handle = trim($acc['handle'] ?? '');
                $url = trim($acc['url'] ?? '');
                
                // Nếu người dùng dán URL vào ô handle, tự phân tích trích xuất handle
                if (!empty($handle) && (str_contains($handle, 'http://') || str_contains($handle, 'https://') || str_contains($handle, '.com/'))) {
                    $parsed = \Modules\Creator\Services\UrlNormalizer::parse($handle);
                    if ($parsed && !empty($parsed['handle'])) {
                        $handle = $parsed['handle'];
                        if (empty($acc['platform']) || $acc['platform'] === 'tiktok') {
                            $platformVal = $parsed['platform'] instanceof \Modules\Creator\Enums\PlatformEnum
                                ? $parsed['platform']->value
                                : (string) $parsed['platform'];
                            $acc['platform'] = strtolower($platformVal);
                        }
                    }
                }

                // Nếu có handle hoặc url
                if (!empty($handle) || !empty($url)) {
                    $cleaned[] = [
                        'platform' => strtolower(trim($acc['platform'] ?? 'tiktok')),
                        'handle' => CreatorNormalizationService::normalizeHandle($handle),
                        'followers_count' => isset($acc['followers_count']) && is_numeric($acc['followers_count'])
                            ? max((int) $acc['followers_count'], 0)
                            : 0,
                        'url' => $url ?: null,
                    ];
                }
            }
            $this->merge(['accounts' => $cleaned]);
        } else {
            $this->merge(['accounts' => []]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'shipping_address' => ['nullable', 'string', 'max:255'],
            'city_province' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'niche' => ['required', 'string', 'max:100'],
            'tier' => ['nullable', 'in:nano,micro,macro,mega'],
            'notes' => ['nullable', 'string'],
            'accounts' => ['nullable', 'array'],
            'accounts.*.platform' => ['required', 'in:tiktok,facebook,shopee,zalo,youtube,instagram'],
            'accounts.*.handle' => ['required', 'string', 'max:150'],
            'accounts.*.followers_count' => ['nullable', 'integer', 'min:0'],
            'accounts.*.url' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Vui lòng nhập họ tên hoặc nghệ danh của Creator.',
            'niche.required' => 'Vui lòng chọn hoặc nhập ngành hàng (niche).',
            'email.email' => 'Địa chỉ email không đúng định dạng.',
            'accounts.*.platform.required' => 'Vui lòng chọn nền tảng mạng xã hội.',
            'accounts.*.handle.required' => 'Vui lòng nhập username/handle cho kênh mạng xã hội.',
        ];
    }
}
