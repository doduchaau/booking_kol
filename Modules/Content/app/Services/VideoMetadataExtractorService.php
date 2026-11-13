<?php

namespace Modules\Content\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VideoMetadataExtractorService
{
    /**
     * Bóc tách siêu dữ liệu công khai từ URL bài đăng/video
     */
    public function extract(string $platform, string $url): array
    {
        $url = trim($url);
        if (empty($url)) {
            return [
                'is_available' => false,
                'caption' => '',
                'hashtags' => [],
                'mentions' => [],
                'author_handle' => null,
                'author_name' => null,
                'thumbnail_url' => null,
                'error_message' => 'Đường link video không hợp lệ.',
            ];
        }

        return match ($platform) {
            'tiktok' => $this->extractTikTok($url),
            'youtube' => $this->extractYouTube($url),
            'facebook', 'instagram' => $this->extractMeta($url),
            default => $this->extractGeneric($url),
        };
    }

    /**
     * Bóc tách siêu dữ liệu TikTok qua oEmbed chính thức
     */
    protected function extractTikTok(string $url): array
    {
        try {
            $oembedUrl = 'https://www.tiktok.com/oembed?url=' . urlencode($url);
            $response = Http::timeout(5)->get($oembedUrl);

            if ($response->successful()) {
                $data = $response->json();
                $title = (string) ($data['title'] ?? '');
                $authorName = $data['author_name'] ?? null;
                $authorHandle = $data['author_unique_id'] ?? null;
                $thumbnailUrl = $data['thumbnail_url'] ?? null;

                // Nếu không có author_unique_id trong JSON, thử parse từ URL gốc
                if (empty($authorHandle) && preg_match('/tiktok\.com\/@([a-zA-Z0-9._]+)/i', $url, $matches)) {
                    $authorHandle = strtolower($matches[1]);
                }

                $hashtags = $this->extractHashtags($title);
                $mentions = $this->extractMentions($title);

                return [
                    'is_available' => true,
                    'caption' => $title,
                    'hashtags' => $hashtags,
                    'mentions' => $mentions,
                    'author_handle' => $authorHandle,
                    'author_name' => $authorName,
                    'thumbnail_url' => $thumbnailUrl,
                    'error_message' => null,
                ];
            }

            // Nếu phản hồi mã lỗi 404 hoặc status_msg báo private
            $body = $response->json();
            $statusMsg = $body['status_msg'] ?? 'Video không tồn tại hoặc đã bị ẩn.';

            return [
                'is_available' => false,
                'caption' => '',
                'hashtags' => [],
                'mentions' => [],
                'author_handle' => null,
                'author_name' => null,
                'thumbnail_url' => null,
                'error_message' => $statusMsg,
            ];
        } catch (\Throwable $e) {
            Log::warning('TikTok oEmbed call failed: ' . $e->getMessage(), ['url' => $url]);

            // Trích xuất fallback từ cấu trúc URL
            preg_match('/tiktok\.com\/@([a-zA-Z0-9._]+)/i', $url, $m);
            return [
                'is_available' => true,
                'caption' => '',
                'hashtags' => [],
                'mentions' => [],
                'author_handle' => $m[1] ?? null,
                'author_name' => null,
                'thumbnail_url' => null,
                'error_message' => null,
                'is_fallback' => true,
            ];
        }
    }

    /**
     * Bóc tách siêu dữ liệu YouTube qua oEmbed chính thức
     */
    protected function extractYouTube(string $url): array
    {
        try {
            $oembedUrl = 'https://www.youtube.com/oembed?url=' . urlencode($url) . '&format=json';
            $response = Http::timeout(5)->get($oembedUrl);

            if ($response->successful()) {
                $data = $response->json();
                $title = (string) ($data['title'] ?? '');
                $authorName = $data['author_name'] ?? null;
                $thumbnailUrl = $data['thumbnail_url'] ?? null;

                $hashtags = $this->extractHashtags($title);
                $mentions = $this->extractMentions($title);

                return [
                    'is_available' => true,
                    'caption' => $title,
                    'hashtags' => $hashtags,
                    'mentions' => $mentions,
                    'author_handle' => null,
                    'author_name' => $authorName,
                    'thumbnail_url' => $thumbnailUrl,
                    'error_message' => null,
                ];
            }

            return [
                'is_available' => false,
                'caption' => '',
                'hashtags' => [],
                'mentions' => [],
                'author_handle' => null,
                'author_name' => null,
                'thumbnail_url' => null,
                'error_message' => 'Video YouTube không tìm thấy hoặc đã bị xóa.',
            ];
        } catch (\Throwable $e) {
            return [
                'is_available' => true,
                'caption' => '',
                'hashtags' => [],
                'mentions' => [],
                'author_handle' => null,
                'author_name' => null,
                'thumbnail_url' => null,
                'error_message' => null,
                'is_fallback' => true,
            ];
        }
    }

    /**
     * Bóc tách siêu dữ liệu Meta (Facebook / Instagram)
     */
    protected function extractMeta(string $url): array
    {
        // Phân tích handle sơ bộ từ URL
        $authorHandle = null;
        if (preg_match('/instagram\.com\/([a-zA-Z0-9._]+)/i', $url, $m)) {
            $authorHandle = strtolower($m[1]);
        }

        return [
            'is_available' => true,
            'caption' => '',
            'hashtags' => [],
            'mentions' => [],
            'author_handle' => $authorHandle,
            'author_name' => null,
            'thumbnail_url' => null,
            'error_message' => null,
        ];
    }

    /**
     * Bóc tách chung cho các nền tảng khác
     */
    protected function extractGeneric(string $url): array
    {
        return [
            'is_available' => true,
            'caption' => '',
            'hashtags' => [],
            'mentions' => [],
            'author_handle' => null,
            'author_name' => null,
            'thumbnail_url' => null,
            'error_message' => null,
        ];
    }

    /**
     * Trích xuất toàn bộ Hashtags từ văn bản (hỗ trợ Unicode tiếng Việt)
     *
     * @return array<string> Danh sách hashtag dạng chữ thường kèm dấu # (ví dụ ['#kemchongnang', '#summer'])
     */
    public function extractHashtags(string $text): array
    {
        if (empty(trim($text))) {
            return [];
        }

        // Regex tìm các từ bắt đầu bằng dấu #, hỗ trợ ký tự chữ tiếng Việt
        if (preg_match_all('/#([a-zA-Z0-9_\p{L}]+)/u', $text, $matches)) {
            $tags = array_map(function ($tag) {
                return mb_strtolower('#' . trim($tag), 'UTF-8');
            }, $matches[1]);

            return array_values(array_unique($tags));
        }

        return [];
    }

    /**
     * Trích xuất các lượt nhắc @mention
     *
     * @return array<string>
     */
    public function extractMentions(string $text): array
    {
        if (empty(trim($text))) {
            return [];
        }

        if (preg_match_all('/@([a-zA-Z0-9._]+)/i', $text, $matches)) {
            $mentions = array_map(function ($m) {
                return strtolower(trim($m));
            }, $matches[1]);

            return array_values(array_unique($mentions));
        }

        return [];
    }
}

