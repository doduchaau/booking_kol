<?php

namespace Modules\Creator\Tests\Unit;

use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Services\KolDataAdapter;
use Tests\TestCase;

class KolDataAdapterTest extends TestCase
{
    protected KolDataAdapter $adapter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adapter = new KolDataAdapter();
    }

    public function test_can_filter_pinned_posts_and_calculate_metrics(): void
    {
        $posts = [
            // Pinned / Top post 1 - Phải bị lọc bỏ
            ['is_pinned' => true, 'views' => 10_000_000, 'likes' => 1_000_000, 'comments' => 50_000, 'shares' => 20_000],
            // Pinned / Top post 2 - Phải bị lọc bỏ
            ['is_top' => 1, 'views' => 5_000_000, 'likes' => 500_000, 'comments' => 25_000, 'shares' => 10_000],
            // 2 bài bình thường
            ['views' => 100_000, 'likes' => 5_000, 'comments' => 200, 'shares' => 100],
            ['views' => 200_000, 'likes' => 9_000, 'comments' => 400, 'shares' => 300],
        ];

        $followers = 500_000;

        $rawPayload = [
            'handle' => 'creator_test',
            'name' => 'Creator Test',
            'followers_count' => $followers,
            'bio' => 'Booking Zalo: 0912 345 678 | Mail: booking.koc@gmail.com',
            'recent_posts' => $posts,
        ];

        $transformed = $this->adapter->transform($rawPayload, PlatformEnum::TIKTOK);

        // Kiểm tra lọc bài ghim: Chỉ còn 2 bài
        $this->assertEquals(2, $transformed['posts_sample_count']);

        // Kiểm tra SĐT trích xuất từ bio
        $this->assertEquals('0912345678', $transformed['phone']);

        // Kiểm tra Email trích xuất từ bio
        $this->assertEquals('booking.koc@gmail.com', $transformed['email']);

        // Kiểm tra chỉ số trung bình (2 bài: views: (100k + 200k)/2 = 150k)
        $metrics = $transformed['metrics'];
        $this->assertEquals(150_000, $metrics['avg_views']);
        // Likes: (5000 + 9000)/2 = 7000
        $this->assertEquals(7_000, $metrics['avg_likes']);
        // Comments: (200 + 400)/2 = 300
        $this->assertEquals(300, $metrics['avg_comments']);
        // Shares: (100 + 300)/2 = 200
        $this->assertEquals(200, $metrics['avg_shares']);

        // Interactions = 7000 + 300 + 200 = 7500
        // ER on followers = (7500 / 500000) * 100 = 1.5%
        $this->assertEquals(1.5, $metrics['engagement_rate']);

        // ER on views = (7500 / 150000) * 100 = 5.0%
        $this->assertEquals(5.0, $metrics['view_engagement_rate']);
    }

    public function test_can_extract_vietnamese_phone_formats(): void
    {
        $this->assertEquals('0987654321', $this->adapter->extractPhone('Liên hệ job: +84 987 654 321'));
        $this->assertEquals('0901234567', $this->adapter->extractPhone('Zalo: 0901.234.567'));
        $this->assertEquals('0398765432', $this->adapter->extractPhone('Work: 84398765432'));
        $this->assertNull($this->adapter->extractPhone('No phone here'));
    }

    public function test_can_extract_email(): void
    {
        $this->assertEquals('contact@agency.vn', $this->adapter->extractEmail('Vui lòng gửi mail về Contact@Agency.vn nhé'));
        $this->assertNull($this->adapter->extractEmail('Chỉ nhận tin nhắn Zalo'));
    }
}
