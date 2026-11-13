<?php

namespace Modules\Creator\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Creator\Services\CreatorNormalizationService;
use Modules\Creator\Services\UrlNormalizer;

class UpdateCreatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // 1. Làm sạch và trích xuất tài khoản mạng xã hội
        if ($this->has('accounts') && is_array($this->accounts)) {
            $cleanedAccounts = [];
            foreach ($this->accounts as $acc) {
                if (!is_array($acc)) {
                    continue;
                }
                $handle = trim($acc['handle'] ?? '');
                $url = trim($acc['url'] ?? '');

                // Tự động phân giải nếu người dùng dán URL vào ô handle
                if (!empty($handle) && (str_contains($handle, 'http://') || str_contains($handle, 'https://') || str_contains($handle, '.com/'))) {
                    $parsed = UrlNormalizer::parse($handle);
                    if ($parsed && !empty($parsed['handle'])) {
                        $handle = $parsed['handle'];
                        if (empty($acc['platform']) || $acc['platform'] === 'tiktok') {
                            $platformVal = $parsed['platform'] instanceof \Modules\Creator\Enums\PlatformEnum
                                ? $parsed['platform']->value
                                : (string) $parsed['platform'];
                            $acc['platform'] = strtolower($platformVal);
                        }
                        if (empty($url)) {
                            $url = $parsed['url'];
                        }
                    }
                }

                if (!empty($handle) || !empty($url)) {
                    $cleanedAccounts[] = [
                        'id' => !empty($acc['id']) ? (int) $acc['id'] : null,
                        'platform' => strtolower(trim($acc['platform'] ?? 'tiktok')),
                        'handle' => CreatorNormalizationService::normalizeHandle($handle),
                        'followers_count' => isset($acc['followers_count']) && is_numeric($acc['followers_count'])
                            ? max((int) $acc['followers_count'], 0)
                            : 0,
                        'url' => $url ?: null,
                    ];
                }
            }
            $this->merge(['accounts' => $cleanedAccounts]);
        } else {
            $this->merge(['accounts' => []]);
        }

        // 2. Làm sạch rate cards
        if ($this->has('rate_cards') && is_array($this->rate_cards)) {
            $cleanedRateCards = [];
            foreach ($this->rate_cards as $rc) {
                if (!is_array($rc)) {
                    continue;
                }
                $contentType = trim($rc['content_type'] ?? '');
                $rawPrice = $rc['price'] ?? 0;
                $price = is_numeric($rawPrice) ? (float) $rawPrice : (float) CreatorNormalizationService::parseMetricNumber($rawPrice);

                if (!empty($contentType) || $price > 0) {
                    $cleanedRateCards[] = [
                        'id' => !empty($rc['id']) ? (int) $rc['id'] : null,
                        'content_type' => $contentType ?: 'Video Review',
                        'price' => max(0, $price),
                        'currency' => 'VND',
                        'notes' => trim($rc['notes'] ?? ''),
                    ];
                }
            }
            $this->merge(['rate_cards' => $cleanedRateCards]);
        } else {
            $this->merge(['rate_cards' => []]);
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
            'ward' => ['nullable', 'string', 'max:100'],
            'niche' => ['required', 'string', 'max:100'],
            'tier' => ['nullable', 'in:nano,micro,macro,mega'],
            'trust_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'blacklist_status' => ['nullable', 'boolean'],
            'blacklist_reason' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
            'accounts' => ['nullable', 'array'],
            'accounts.*.id' => ['nullable', 'integer'],
            'accounts.*.platform' => ['required_with:accounts', 'in:tiktok,facebook,shopee,zalo,youtube,instagram'],
            'accounts.*.handle' => ['required_with:accounts', 'string', 'max:150'],
            'accounts.*.followers_count' => ['nullable', 'integer', 'min:0'],
            'accounts.*.url' => ['nullable', 'string', 'max:255'],
            'rate_cards' => ['nullable', 'array'],
            'rate_cards.*.id' => ['nullable', 'integer'],
            'rate_cards.*.content_type' => ['required_with:rate_cards', 'string', 'max:100'],
            'rate_cards.*.price' => ['required_with:rate_cards', 'numeric', 'min:0'],
            'rate_cards.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Vui lòng nhập họ tên hoặc nghệ danh của Creator.',
            'niche.required' => 'Vui lòng chọn hoặc nhập ngành hàng (niche).',
            'email.email' => 'Địa chỉ email không đúng định dạng.',
            'trust_score.min' => 'Điểm uy tín tối thiểu là 0.',
            'trust_score.max' => 'Điểm uy tín tối đa là 100.',
            'accounts.*.platform.required' => 'Vui lòng chọn nền tảng mạng xã hội.',
            'accounts.*.handle.required' => 'Vui lòng nhập username/handle cho kênh mạng xã hội.',
            'rate_cards.*.content_type.required' => 'Vui lòng nhập định dạng nội dung cho bảng giá.',
            'rate_cards.*.price.numeric' => 'Giá booking phải là số hợp lệ.',
        ];
    }
}

