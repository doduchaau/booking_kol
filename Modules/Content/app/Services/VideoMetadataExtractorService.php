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
            'facebook' => $this->extractFacebook($url),
            'shopee' => $this->extractShopeeVideo($url),
            'instagram' => $this->extractMeta($url),
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
     * Bóc tách siêu dữ liệu Shopee Video
     */
    protected function extractShopeeVideo(string $url): array
    {
        $canonicalUrl = $this->resolveShopeeCanonicalUrl($url);
        $videoId = null;
        if (preg_match('/(?:universal-link\/video|video|feed\/video)\/([a-zA-Z0-9_-]+)/i', $canonicalUrl, $m)) {
            $videoId = $m[1];
        }

        try {
            // 1. Thử gọi Shopee Video Public Detail API
            if ($videoId) {
                $apiUrl = "https://shopee.vn/api/v4/video/get_video_detail?video_id={$videoId}";
                $res = Http::timeout(5)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Shopee',
                        'Accept' => 'application/json',
                    ])
                    ->get($apiUrl);

                if ($res->successful()) {
                    $json = $res->json();
                    $data = $json['data'] ?? [];
                    if (!empty($data)) {
                        $caption = (string) ($data['caption'] ?? ($data['description'] ?? ($data['title'] ?? '')));
                        $authorName = $data['author']['nickname'] ?? ($data['author_name'] ?? null);
                        $authorHandle = $data['author']['username'] ?? ($data['author_handle'] ?? ($videoId ? "shopee_{$videoId}" : null));
                        $thumbnailUrl = $data['cover_url'] ?? ($data['thumbnail_url'] ?? null);

                        $hashtags = $this->extractHashtags($caption);
                        $mentions = $this->extractMentions($caption);

                        return [
                            'is_available' => true,
                            'caption' => $caption,
                            'hashtags' => $hashtags,
                            'mentions' => $mentions,
                            'author_handle' => $authorHandle,
                            'author_name' => $authorName,
                            'thumbnail_url' => $thumbnailUrl,
                            'error_message' => null,
                        ];
                    }
                }
            }

            // 2. Fallback: Bóc tách OpenGraph từ HTML trang Shopee Video
            $htmlRes = Http::timeout(5)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ])
                ->get($canonicalUrl);

            if ($htmlRes->successful()) {
                $html = $htmlRes->body();
                $caption = '';
                $thumbnailUrl = null;

                if (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $caption = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                } elseif (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $caption = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }

                if (preg_match('/<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $thumbnailUrl = $m[1];
                }

                if (!empty($caption)) {
                    $hashtags = $this->extractHashtags($caption);
                    $mentions = $this->extractMentions($caption);

                    return [
                        'is_available' => true,
                        'caption' => $caption,
                        'hashtags' => $hashtags,
                        'mentions' => $mentions,
                        'author_handle' => $videoId ? "shopee_{$videoId}" : null,
                        'author_name' => null,
                        'thumbnail_url' => $thumbnailUrl,
                        'error_message' => null,
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Shopee Video extraction failed: ' . $e->getMessage(), ['url' => $url]);
        }

        // 3. Fallback an toàn (không làm đứt gãy luồng người dùng)
        return [
            'is_available' => true,
            'caption' => '',
            'hashtags' => [],
            'mentions' => [],
            'author_handle' => $videoId ? "shopee_{$videoId}" : null,
            'author_name' => null,
            'thumbnail_url' => null,
            'error_message' => null,
            'is_fallback' => true,
        ];
    }

    /**
     * Chuẩn hóa & phân giải Shortlink Shopee (vn.shp.ee)
     */
    public function resolveShopeeCanonicalUrl(string $url): string
    {
        $url = trim($url);
        if (preg_match('/vn\.shp\.ee\/(?:video\/)?([a-zA-Z0-9._-]+)/i', $url)) {
            try {
                $response = Http::timeout(4)->withoutRedirecting()->get($url);
                $location = $response->header('Location');
                if ($location) {
                    return strtok($location, '?');
                }
            } catch (\Throwable) {
                // Tiếp tục
            }
        }
        return strtok($url, '?');
    }

    /**
     * Bóc tách siêu dữ liệu Facebook (Reels & Videos)
     */
    protected function extractFacebook(string $url): array
    {
        $canonicalUrl = $this->resolveFacebookCanonicalUrl($url);
        $authorHandle = null;

        // Trích xuất handle sơ bộ nếu là link facebook.com/{page}/videos/{id}
        if (preg_match('/facebook\.com\/([a-zA-Z0-9._-]+)\/videos\/([0-9]+)/i', $canonicalUrl, $m)) {
            $authorHandle = strtolower($m[1]);
        }

        try {
            // 1. Thử Meta oEmbed nếu có cấu hình Facebook Token trong .env
            $clientToken = config('services.facebook.client_token');
            if (!empty($clientToken)) {
                $oembedUrl = 'https://graph.facebook.com/v19.0/oembed_post?url=' . urlencode($canonicalUrl) . '&access_token=' . urlencode($clientToken);
                $res = Http::timeout(5)->get($oembedUrl);
                if ($res->successful()) {
                    $data = $res->json();
                    $authorName = $data['author_name'] ?? null;
                    $authorUrl = $data['author_url'] ?? null;
                    if (!$authorHandle && $authorUrl && preg_match('/facebook\.com\/([a-zA-Z0-9._-]+)/i', $authorUrl, $am)) {
                        $authorHandle = strtolower($am[1]);
                    }

                    // oEmbed Facebook trả về html chứa caption và link
                    $htmlSnippet = $data['html'] ?? '';
                    $caption = strip_tags($htmlSnippet);
                    $hashtags = $this->extractHashtags($caption);
                    $mentions = $this->extractMentions($caption);

                    return [
                        'is_available' => true,
                        'caption' => $caption,
                        'hashtags' => $hashtags,
                        'mentions' => $mentions,
                        'author_handle' => $authorHandle,
                        'author_name' => $authorName,
                        'thumbnail_url' => null,
                        'error_message' => null,
                    ];
                }
            }

            // 2. OpenGraph Scraper với User-Agent chuẩn Facebook External Hit
            $res = Http::timeout(5)
                ->withHeaders([
                    'User-Agent' => 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept-Language' => 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                ])
                ->get($canonicalUrl);

            if ($res->successful()) {
                $html = $res->body();
                $caption = '';
                $thumbnailUrl = null;

                if (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $caption = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                } elseif (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $caption = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                } elseif (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $caption = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }

                if (preg_match('/<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $thumbnailUrl = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }

                if (!empty($caption)) {
                    $hashtags = $this->extractHashtags($caption);
                    $mentions = $this->extractMentions($caption);

                    return [
                        'is_available' => true,
                        'caption' => $caption,
                        'hashtags' => $hashtags,
                        'mentions' => $mentions,
                        'author_handle' => $authorHandle,
                        'author_name' => null,
                        'thumbnail_url' => $thumbnailUrl,
                        'error_message' => null,
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Facebook video extraction failed: ' . $e->getMessage(), ['url' => $url]);
        }

        // 3. Fallback
        return [
            'is_available' => true,
            'caption' => '',
            'hashtags' => [],
            'mentions' => [],
            'author_handle' => $authorHandle,
            'author_name' => null,
            'thumbnail_url' => null,
            'error_message' => null,
            'is_fallback' => true,
        ];
    }

    /**
     * Chuẩn hóa & phân giải Shortlink Facebook (fb.watch, share/r)
     */
    public function resolveFacebookCanonicalUrl(string $url): string
    {
        $url = trim($url);
        if (preg_match('/(?:fb\.watch|facebook\.com\/share\/r)\/([a-zA-Z0-9._-]+)/i', $url)) {
            try {
                $response = Http::timeout(4)->withoutRedirecting()->get($url);
                $location = $response->header('Location');
                if ($location) {
                    return strtok($location, '?');
                }
            } catch (\Throwable) {
                // Tiếp tục
            }
        }
        return strtok($url, '?');
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

