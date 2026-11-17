<?php

namespace Modules\Content\Tests\Unit;

use Illuminate\Support\Facades\Http;
use Modules\Content\Services\VideoMetadataExtractorService;
use Tests\TestCase;

class VideoMetadataExtractorServiceTest extends TestCase
{
    public function test_can_extract_shopee_video_from_api_or_html(): void
    {
        Http::fake([
            'shopee.vn/api/v4/video/get_video_detail*' => Http::response([
                'data' => [
                    'caption' => 'Review son kem dưỡng #shopeevn #sonkem cực xinh @shopee_store',
                    'author' => [
                        'nickname' => 'Linh Beauty',
                        'username' => 'linh_beauty',
                    ],
                    'cover_url' => 'https://cf.shopee.vn/file/cover123',
                ],
            ], 200),
        ]);

        $service = new VideoMetadataExtractorService();
        $res = $service->extract('shopee', 'https://shopee.vn/universal-link/video/99887766');

        $this->assertTrue($res['is_available']);
        $this->assertStringContainsString('Review son kem dưỡng', $res['caption']);
        $this->assertContains('#shopeevn', $res['hashtags']);
        $this->assertContains('#sonkem', $res['hashtags']);
        $this->assertEquals('Linh Beauty', $res['author_name']);
        $this->assertEquals('linh_beauty', $res['author_handle']);
        $this->assertEquals('https://cf.shopee.vn/file/cover123', $res['thumbnail_url']);
    }

    public function test_can_extract_facebook_video_from_opengraph(): void
    {
        $mockHtml = <<<'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta property="og:title" content="Trải nghiệm du lịch Đà Lạt cùng #dalattrip #review" />
    <meta property="og:description" content="Trải nghiệm du lịch Đà Lạt cùng #dalattrip #review cực đã!" />
    <meta property="og:image" content="https://scontent.xx.fbcdn.net/v/t1/thumb.jpg" />
</head>
<body></body>
</html>
HTML;

        Http::fake([
            'facebook.com/*' => Http::response($mockHtml, 200),
        ]);

        $service = new VideoMetadataExtractorService();
        $res = $service->extract('facebook', 'https://www.facebook.com/reel/1234567890');

        $this->assertTrue($res['is_available']);
        $this->assertStringContainsString('Trải nghiệm du lịch Đà Lạt', $res['caption']);
        $this->assertContains('#dalattrip', $res['hashtags']);
        $this->assertContains('#review', $res['hashtags']);
        $this->assertEquals('https://scontent.xx.fbcdn.net/v/t1/thumb.jpg', $res['thumbnail_url']);
    }

    public function test_handles_shopee_and_facebook_fallbacks_gracefully(): void
    {
        Http::fake([
            '*' => Http::response('Server Error', 500),
        ]);

        $service = new VideoMetadataExtractorService();

        $shopeeRes = $service->extract('shopee', 'https://shopee.vn/video/987654');
        $this->assertTrue($shopeeRes['is_available']);
        $this->assertEquals('shopee_987654', $shopeeRes['author_handle']);

        $fbRes = $service->extract('facebook', 'https://www.facebook.com/reel/5544332211');
        $this->assertTrue($fbRes['is_available']);
    }
}
