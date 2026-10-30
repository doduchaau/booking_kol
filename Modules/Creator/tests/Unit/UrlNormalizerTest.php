<?php

namespace Modules\Creator\Tests\Unit;

use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Services\UrlNormalizer;
use Tests\TestCase;

class UrlNormalizerTest extends TestCase
{
    public function test_can_parse_tiktok_url(): void
    {
        $url = 'https://www.tiktok.com/@charlidamelio?is_from_webapp=1&sender_device=pc';
        $result = UrlNormalizer::parse($url);

        $this->assertNotNull($result);
        $this->assertEquals(PlatformEnum::TIKTOK, $result['platform']);
        $this->assertEquals('charlidamelio', $result['handle']);
        $this->assertEquals('https://www.tiktok.com/@charlidamelio', $result['url']);
    }

    public function test_can_parse_youtube_url(): void
    {
        $url = 'https://www.youtube.com/@MrBeast?si=123456';
        $result = UrlNormalizer::parse($url);

        $this->assertNotNull($result);
        $this->assertEquals(PlatformEnum::YOUTUBE, $result['platform']);
        $this->assertEquals('mrbeast', $result['handle']);
        $this->assertEquals('https://www.youtube.com/@mrbeast', $result['url']);
    }

    public function test_can_parse_instagram_url(): void
    {
        $url = 'https://instagram.com/cristiano/?hl=en';
        $result = UrlNormalizer::parse($url);

        $this->assertNotNull($result);
        $this->assertEquals(PlatformEnum::INSTAGRAM, $result['platform']);
        $this->assertEquals('cristiano', $result['handle']);
    }

    public function test_can_parse_facebook_url(): void
    {
        $url = 'https://www.facebook.com/zuck?fbclid=IwAR123';
        $result = UrlNormalizer::parse($url);

        $this->assertNotNull($result);
        $this->assertEquals(PlatformEnum::FACEBOOK, $result['platform']);
        $this->assertEquals('zuck', $result['handle']);
    }

    public function test_can_parse_batch_urls(): void
    {
        $batch = "https://www.tiktok.com/@user1\nhttps://www.youtube.com/@user2\nInvalidUrlHere";
        $results = UrlNormalizer::parseBatch($batch);

        $this->assertCount(3, $results);
        $this->assertTrue($results[0]['is_valid']);
        $this->assertEquals('tiktok', $results[0]['platform']);
        $this->assertTrue($results[1]['is_valid']);
        $this->assertEquals('youtube', $results[1]['platform']);
        $this->assertFalse($results[2]['is_valid']);
    }
}
