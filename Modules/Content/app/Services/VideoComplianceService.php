<?php

namespace Modules\Content\Services;

use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Models\Creator;

class VideoComplianceService
{
    public function __construct(
        protected VideoMetadataExtractorService $metadataExtractor
    ) {}

    /**
     * Kiểm tra và chấm điểm tuân thủ cho một ContentPost cụ thể
     */
    public function evaluatePost(ContentPost $post): array
    {
        $campaignCreator = $post->campaignCreator;
        if ($campaignCreator) {
            $campaignCreator->loadMissing(['campaign', 'creator.accounts', 'creatorProducts.campaignProduct']);
        }
        $campaign = $campaignCreator?->campaign;
        $creator = $campaignCreator?->creator;

        $metadata = $this->metadataExtractor->extract($post->platform, $post->post_url);

        // Nếu caption từ oEmbed trống nhưng post đã có video_title do KOC/Staff nhập, dùng video_title
        if (empty($metadata['caption']) && !empty($post->video_title)) {
            $metadata['caption'] = $post->video_title;
            if (empty($metadata['hashtags'])) {
                $metadata['hashtags'] = $this->metadataExtractor->extractHashtags($post->video_title);
            }
        }

        $result = $this->evaluate(
            platform: $post->platform,
            url: $post->post_url,
            metadata: $metadata,
            campaign: $campaign,
            creator: $creator,
            campaignCreator: $campaignCreator
        );

        // Lưu kết quả vào DB
        $post->update([
            'compliance_status' => $result['status'],
            'compliance_score' => $result['score'],
            'compliance_checklist' => $result['checklist'],
            'raw_caption' => $metadata['caption'] ?: $post->raw_caption,
            'extracted_hashtags' => $metadata['hashtags'],
            'compliance_checked_at' => now(),
            'video_title' => !empty($metadata['caption']) ? mb_substr($metadata['caption'], 0, 250) : $post->video_title,
        ]);

        return array_merge($result, [
            'post' => $post->fresh(),
        ]);
    }

    /**
     * Chấm điểm tuân thủ trực tiếp (dùng cho cả Pre-check trên Portal và Evaluate Post)
     */
    public function evaluate(
        string $platform,
        string $url,
        array $metadata,
        ?Campaign $campaign,
        ?Creator $creator = null,
        ?CampaignCreator $campaignCreator = null
    ): array {
        $checklist = [];
        $score = 0;
        $issues = [];
        $caption = (string) ($metadata['caption'] ?? '');
        $hashtagsFound = (array) ($metadata['hashtags'] ?? []);
        $authorFound = $metadata['author_handle'] ?? null;
        $isAvailable = (bool) ($metadata['is_available'] ?? true);
        $errorMessage = $metadata['error_message'] ?? null;

        // -------------------------------------------------------------
        // Tiêu chí 1: Trạng thái công khai của Video (Trọng số: 20 điểm)
        // -------------------------------------------------------------
        if ($isAvailable) {
            $score += 20;
            $checklist[] = [
                'key' => 'availability',
                'label' => 'Tính Công Khai & Khả Dụng',
                'status' => 'passed',
                'score' => 20,
                'max_score' => 20,
                'message' => 'Video tồn tại và đang hiển thị công khai bình thường.',
            ];
        } else {
            $issues[] = 'Video không khả dụng hoặc bị ẩn: ' . ($errorMessage ?: 'Không truy cập được');
            $checklist[] = [
                'key' => 'availability',
                'label' => 'Tính Công Khai & Khả Dụng',
                'status' => 'failed',
                'score' => 0,
                'max_score' => 20,
                'message' => 'Video không thể truy cập hoặc ở chế độ riêng tư: ' . ($errorMessage ?: 'Lỗi 404/Private'),
            ];
        }

        // -------------------------------------------------------------
        // Tiêu chí 2: Khớp Hashtag Chiến Dịch & Sản Phẩm (Trọng số: 35 điểm)
        // -------------------------------------------------------------
        $allHashtagStrings = [$campaign?->hashtags ?? ''];
        if ($campaignCreator && $campaignCreator->relationLoaded('creatorProducts')) {
            foreach ($campaignCreator->creatorProducts as $cp) {
                if (!empty($cp->campaignProduct?->hashtags)) {
                    $allHashtagStrings[] = $cp->campaignProduct->hashtags;
                }
            }
        }
        $campaignHashtags = $this->parseHashtags(implode(' ', $allHashtagStrings));

        if (empty($campaignHashtags)) {
            // Không yêu cầu hashtag cụ thể -> Tự động đạt điểm tối đa
            $score += 35;
            $checklist[] = [
                'key' => 'hashtags',
                'label' => 'Hashtag Chiến Dịch & Sản Phẩm',
                'status' => 'passed',
                'score' => 35,
                'max_score' => 35,
                'expected' => [],
                'found' => $hashtagsFound,
                'message' => 'Chiến dịch không yêu cầu hashtag bắt buộc.',
            ];
        } else {
            $missingTags = [];
            $matchedTags = [];

            // Chuẩn hóa danh sách hashtag tìm thấy
            $normalizedFound = array_map(function ($t) {
                return mb_strtolower(trim($t), 'UTF-8');
            }, $hashtagsFound);

            // Cũng kiểm tra tìm chuỗi hashtag trong toàn bộ caption
            $normalizedCaption = mb_strtolower($caption, 'UTF-8');

            foreach ($campaignHashtags as $tag) {
                $cleanTag = mb_strtolower(trim($tag), 'UTF-8');
                if (in_array($cleanTag, $normalizedFound) || str_contains($normalizedCaption, $cleanTag)) {
                    $matchedTags[] = $cleanTag;
                } else {
                    $missingTags[] = $cleanTag;
                }
            }

            $tagRatio = count($matchedTags) / count($campaignHashtags);
            $tagScore = (int) round($tagRatio * 35);
            $score += $tagScore;

            if (empty($missingTags)) {
                $checklist[] = [
                    'key' => 'hashtags',
                    'label' => 'Hashtag Chiến Dịch & Sản Phẩm',
                    'status' => 'passed',
                    'score' => 35,
                    'max_score' => 35,
                    'expected' => $campaignHashtags,
                    'found' => $matchedTags,
                    'message' => 'Đã gắn đầy đủ ' . count($matchedTags) . '/' . count($campaignHashtags) . ' hashtag yêu cầu.',
                ];
            } else {
                $issues[] = 'Thiếu hashtag: ' . implode(', ', $missingTags);
                $checklist[] = [
                    'key' => 'hashtags',
                    'label' => 'Hashtag Chiến Dịch & Sản Phẩm',
                    'status' => count($matchedTags) > 0 ? 'warning' : 'failed',
                    'score' => $tagScore,
                    'max_score' => 35,
                    'expected' => $campaignHashtags,
                    'found' => $matchedTags,
                    'missing' => $missingTags,
                    'message' => 'Thiếu hashtag bắt buộc: ' . implode(', ', $missingTags),
                ];
            }
        }

        // -------------------------------------------------------------
        // Tiêu chí 3: Tag / Nhắc Tài Khoản Thương Hiệu (Trọng số: 15 điểm)
        // -------------------------------------------------------------
        $brandTag = trim((string) ($campaign?->brand_tag ?? ''));
        if (empty($brandTag)) {
            // Không yêu cầu tag thương hiệu -> Tự động đạt điểm tối đa
            $score += 15;
            $checklist[] = [
                'key' => 'brand_tag',
                'label' => 'Tag Tài Khoản Thương Hiệu',
                'status' => 'passed',
                'score' => 15,
                'max_score' => 15,
                'expected' => null,
                'message' => 'Chiến dịch không yêu cầu tag tài khoản thương hiệu cụ thể.',
            ];
        } else {
            $normalizedBrand = strtolower(trim(ltrim($brandTag, '@')));
            $mentionsFound = array_map(fn($m) => strtolower(trim(ltrim($m, '@'))), (array) ($metadata['mentions'] ?? []));
            $captionLower = mb_strtolower($caption, 'UTF-8');

            $hasMention = in_array($normalizedBrand, $mentionsFound)
                || str_contains($captionLower, '@' . $normalizedBrand)
                || str_contains($captionLower, $normalizedBrand);

            if ($hasMention) {
                $score += 15;
                $checklist[] = [
                    'key' => 'brand_tag',
                    'label' => 'Tag Tài Khoản Thương Hiệu',
                    'status' => 'passed',
                    'score' => 15,
                    'max_score' => 15,
                    'expected' => '@' . $normalizedBrand,
                    'found' => '@' . $normalizedBrand,
                    'message' => "Đã tag tài khoản thương hiệu @{$normalizedBrand} trong caption.",
                ];
            } else {
                $issues[] = "Chưa tag tài khoản thương hiệu: @{$normalizedBrand}";
                $checklist[] = [
                    'key' => 'brand_tag',
                    'label' => 'Tag Tài Khoản Thương Hiệu',
                    'status' => 'warning',
                    'score' => 0,
                    'max_score' => 15,
                    'expected' => '@' . $normalizedBrand,
                    'missing' => ['@' . $normalizedBrand],
                    'message' => "Caption chưa tag tài khoản thương hiệu @{$normalizedBrand}.",
                ];
            }
        }

        // -------------------------------------------------------------
        // Tiêu chí 4: Mã Giảm Giá / Voucher Độc Quyền (Trọng số: 15 điểm)
        // -------------------------------------------------------------
        $discountCode = trim((string) ($campaign?->discount_code ?? ''));
        if (empty($discountCode)) {
            // Không yêu cầu mã giảm giá -> Tự động đạt điểm tối đa
            $score += 15;
            $checklist[] = [
                'key' => 'discount_code',
                'label' => 'Mã Giảm Giá Độc Quyền',
                'status' => 'passed',
                'score' => 15,
                'max_score' => 15,
                'expected' => null,
                'message' => 'Chiến dịch không có mã giảm giá bắt buộc.',
            ];
        } else {
            $hasCode = !empty($caption) && stripos($caption, $discountCode) !== false;
            if ($hasCode) {
                $score += 15;
                $checklist[] = [
                    'key' => 'discount_code',
                    'label' => 'Mã Giảm Giá Độc Quyền',
                    'status' => 'passed',
                    'score' => 15,
                    'max_score' => 15,
                    'expected' => $discountCode,
                    'message' => "Đã có mã giảm giá '{$discountCode}' trong caption.",
                ];
            } else {
                $issues[] = "Chưa gắn mã giảm giá: '{$discountCode}'";
                $checklist[] = [
                    'key' => 'discount_code',
                    'label' => 'Mã Giảm Giá Độc Quyền',
                    'status' => 'warning',
                    'score' => 0,
                    'max_score' => 15,
                    'expected' => $discountCode,
                    'message' => "Caption chưa đề cập mã giảm giá '{$discountCode}'.",
                ];
            }
        }

        // -------------------------------------------------------------
        // Tiêu chí 5: Kênh Xuất Bản Chính Chủ (Trọng số: 15 điểm)
        // -------------------------------------------------------------
        $registeredHandles = [];
        if ($creator && $creator->relationLoaded('accounts')) {
            $registeredHandles = $creator->accounts
                ->where('platform', $platform)
                ->pluck('handle')
                ->map(fn($h) => strtolower(trim(ltrim($h, '@'))))
                ->filter()
                ->toArray();
        }

        if (empty($registeredHandles) || empty($authorFound)) {
            // Không đủ dữ liệu đối soát handle -> Chấm mặc định đạt yêu cầu
            $score += 15;
            $checklist[] = [
                'key' => 'author_match',
                'label' => 'Tài Khoản Đăng Bài',
                'status' => 'passed',
                'score' => 15,
                'max_score' => 15,
                'message' => $authorFound ? "Kênh đăng: @{$authorFound}" : 'Không phát hiện bất thường tài khoản.',
            ];
        } else {
            $normalizedAuthor = strtolower(trim(ltrim($authorFound, '@')));
            $isMatch = in_array($normalizedAuthor, $registeredHandles);

            if ($isMatch) {
                $score += 15;
                $checklist[] = [
                    'key' => 'author_match',
                    'label' => 'Tài Khoản Đăng Bài',
                    'status' => 'passed',
                    'score' => 15,
                    'max_score' => 15,
                    'expected' => implode(', ', $registeredHandles),
                    'found' => $authorFound,
                    'message' => "Đúng kênh chính chủ (@{$authorFound}) đã đăng ký.",
                ];
            } else {
                $issues[] = "Kênh đăng (@{$authorFound}) khác với hồ sơ đăng ký (@" . implode(', @', $registeredHandles) . ")";
                $checklist[] = [
                    'key' => 'author_match',
                    'label' => 'Tài Khoản Đăng Bài',
                    'status' => 'warning',
                    'score' => 5,
                    'max_score' => 15,
                    'expected' => implode(', ', $registeredHandles),
                    'found' => $authorFound,
                    'message' => "Kênh đăng (@{$authorFound}) có vẻ khác với handle đã đăng ký.",
                ];
            }
        }

        // Quyết định trạng thái tổng kết
        $status = 'passed';
        if (!$isAvailable) {
            $status = 'failed';
        } elseif ($score < 100 || !empty($missingTags) || !empty($issues)) {
            $status = 'warning';
        }

        // Tạo mẫu tin nhắn Zalo gợi ý nếu có lỗi
        $revisionMessage = null;
        if (!empty($issues)) {
            $creatorName = $creator?->name ?? 'bạn';
            $campaignName = $campaign?->name ?? 'chiến dịch';
            $issueList = implode(', ', $issues);

            $revisionMessage = "Chào {$creatorName} ơi, bên mình đã nhận được video bài đăng của bạn trong {$campaignName}. "
                . "Video lên rất đẹp, tuy nhiên hệ thống kiểm tra thấy đang có lưu ý: [{$issueList}]. "
                . "Bạn vui lòng cập nhật lại caption giúp bên mình để hoàn tất nghiệm thu và đối soát gửi phí hợp tác sớm nhất nhé! Cảm ơn bạn rất nhiều ạ ❤️";
        }

        return [
            'status' => $status,
            'score' => min(100, max(0, $score)),
            'checklist' => $checklist,
            'issues' => $issues,
            'revision_message' => $revisionMessage,
            'metadata' => $metadata,
        ];
    }

    /**
     * Bóc tách chuỗi cấu hình hashtag thành mảng
     *
     * @return array<string>
     */
    protected function parseHashtags(string $hashtagsString): array
    {
        if (empty(trim($hashtagsString))) {
            return [];
        }

        // Hỗ trợ phân cách bằng dấu phẩy, khoảng trắng, xuống dòng
        $tags = preg_split('/[\s,;\n\r]+/u', trim($hashtagsString), -1, PREG_SPLIT_NO_EMPTY);
        $result = [];

        foreach ($tags as $tag) {
            $tag = trim($tag);
            if (empty($tag)) {
                continue;
            }
            if (!str_starts_with($tag, '#')) {
                $tag = '#' . $tag;
            }
            $result[] = mb_strtolower($tag, 'UTF-8');
        }

        return array_values(array_unique($result));
    }
}

