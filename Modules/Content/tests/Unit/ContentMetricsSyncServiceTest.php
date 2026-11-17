<?php

namespace Modules\Content\Tests\Unit;

use Illuminate\Support\Facades\Http;
use Modules\Content\Services\ContentMetricsSyncService;
use Modules\Content\Services\VideoMetadataExtractorService;
use Tests\TestCase;

class ContentMetricsSyncServiceTest extends TestCase
{
    public function test_can_fetch_shopee_metrics(): void
    {
        Http::fake([
            'shopee.vn/api/v4/video/get_video_detail*' => Http::response([
                'data' => [
                    'play_count' => 54200,
                    'like_count' => 3120,
                    'comment_count' => 145,
                    'share_count' => 88,
                    'caption' => 'Video review Shopee',
                    'author' => ['nickname' => 'Shop Test'],
                ],
            ], 200),
        ]);

        $extractor = new VideoMetadataExtractorService();
        $service = new ContentMetricsSyncService($extractor);

        $metrics = $service->fetchRealMetrics('shopee', 'https://shopee.vn/universal-link/video/12345678');

        $this->assertEquals('shopee_public_api', $metrics['source']);
        $this->assertEquals(54200, $metrics['views_count']);
        $this->assertEquals(3120, $metrics['likes_count']);
        $this->assertEquals(145, $metrics['comments_count']);
        $this->assertEquals(88, $metrics['shares_count']);
        $this->assertEquals('Shop Test', $metrics['author_name']);
    }

    public function test_can_fetch_facebook_metrics_from_opengraph(): void
    {
        $mockHtml = <<<'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta property="og:description" content="Review sản phẩm cực đỉnh" />
</head>
<body>
    <div>125K lượt xem · 3.5K lượt thích · 450 bình luận</div>
</body>
</html>
HTML;

        Http::fake([
            'facebook.com/*' => Http::response($mockHtml, 200),
        ]);

        $extractor = new VideoMetadataExtractorService();
        $service = new ContentMetricsSyncService($extractor);

        $metrics = $service->fetchRealMetrics('facebook', 'https://www.facebook.com/reel/1234567890');

        $this->assertEquals('facebook_opengraph', $metrics['source']);
        $this->assertEquals(125000, $metrics['views_count']);
        $this->assertEquals(3500, $metrics['likes_count']);
        $this->assertEquals(450, $metrics['comments_count']);
    }

    public function test_parse_count_string_helper(): void
    {
        $extractor = new VideoMetadataExtractorService();
        $service = new ContentMetricsSyncService($extractor);

        $this->assertEquals(1200000, $service->parseCountString('1.2M'));
        $this->assertEquals(2500000, $service->parseCountString('2,5Tr'));
        $this->assertEquals(45000, $service->parseCountString('45K'));
        $this->assertEquals(1234, $service->parseCountString('1234'));
        $this->assertEquals(0, $service->parseCountString(''));
    }
}
