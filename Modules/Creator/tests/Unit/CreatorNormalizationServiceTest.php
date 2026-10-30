<?php

namespace Modules\Creator\Tests\Unit;

use Modules\Creator\Services\CreatorNormalizationService;
use Tests\TestCase;

class CreatorNormalizationServiceTest extends TestCase
{
    public function test_normalizes_vietnamese_phone_with_missing_leading_zero(): void
    {
        // 9 chữ số bị Excel nuốt số 0
        $this->assertEquals('0981234567', CreatorNormalizationService::normalizePhone('981234567'));
        $this->assertEquals('0398765432', CreatorNormalizationService::normalizePhone('398765432'));
        
        // Đã có số 0
        $this->assertEquals('0912345678', CreatorNormalizationService::normalizePhone('0912345678'));
        
        // Dấu chấm, khoảng cách, gạch nối
        $this->assertEquals('0981234567', CreatorNormalizationService::normalizePhone('098.123.4567'));
        $this->assertEquals('0981234567', CreatorNormalizationService::normalizePhone('+84 981 234 567'));
        $this->assertEquals('0981234567', CreatorNormalizationService::normalizePhone('84981234567'));
    }

    public function test_parses_vietnamese_shortened_metrics_and_prices(): void
    {
        // Viết tắt kẹp giữa tiếng Việt: 4tr5, 1m2, 500k
        $this->assertEquals(4_500_000, CreatorNormalizationService::parseMetricNumber('4tr5'));
        $this->assertEquals(1_200_000, CreatorNormalizationService::parseMetricNumber('1m2'));
        $this->assertEquals(500_000, CreatorNormalizationService::parseMetricNumber('500k'));
        $this->assertEquals(1_500, CreatorNormalizationService::parseMetricNumber('1k5'));

        // Đơn vị tiếng Việt: Củ, Triệu, Tỷ, Nghìn
        $this->assertEquals(3_000_000, CreatorNormalizationService::parseMetricNumber('3 củ'));
        $this->assertEquals(10_000_000, CreatorNormalizationService::parseMetricNumber('10 triệu'));
        $this->assertEquals(2_000_000_000, CreatorNormalizationService::parseMetricNumber('2 tỷ'));

        // Phân biệt dấu phân cách thập phân kèm hậu tố: 1.25M vs 1,25M
        $this->assertEquals(1_250_000, CreatorNormalizationService::parseMetricNumber('1.25M'));
        $this->assertEquals(1_250_000, CreatorNormalizationService::parseMetricNumber('1,25M'));

        // Dấu phân cách hàng nghìn kiểu VN: 1.250.000 hoặc 1,250,000
        $this->assertEquals(1_250_000, CreatorNormalizationService::parseMetricNumber('1.250.000'));
        $this->assertEquals(1_250_000, CreatorNormalizationService::parseMetricNumber('1,250,000'));

        // Text thương lượng, liên hệ
        $this->assertEquals(0, CreatorNormalizationService::parseMetricNumber('Liên hệ'));
        $this->assertEquals(0, CreatorNormalizationService::parseMetricNumber('N/A'));
        $this->assertEquals(0, CreatorNormalizationService::parseMetricNumber('-'));
    }

    public function test_parses_rate_price_with_notes(): void
    {
        $res1 = CreatorNormalizationService::parseRatePrice('4tr5');
        $this->assertEquals(4_500_000.0, $res1['price']);
        $this->assertNull($res1['note']);

        $res2 = CreatorNormalizationService::parseRatePrice('Liên hệ');
        $this->assertEquals(0.0, $res2['price']);
        $this->assertEquals('Liên hệ', $res2['note']);

        $res3 = CreatorNormalizationService::parseRatePrice('Tặng kèm');
        $this->assertEquals(0.0, $res3['price']);
        $this->assertEquals('Tặng kèm', $res3['note']);
    }

    public function test_parses_engagement_rate_properly(): void
    {
        // Dạng thập phân Excel lưu (0.045 -> 4.5%)
        $this->assertEquals(4.50, CreatorNormalizationService::parsePercentage(0.045, 'ER (%)'));
        $this->assertEquals(3.85, CreatorNormalizationService::parsePercentage(0.0385, 'Tỷ lệ tương tác'));

        // Dạng chuỗi có %
        $this->assertEquals(4.50, CreatorNormalizationService::parsePercentage('4,5%'));
        $this->assertEquals(5.20, CreatorNormalizationService::parsePercentage('5.2 %'));
    }

    public function test_infers_platform_and_handle(): void
    {
        // Có profile_url -> tự suy ra handle và platform
        $res = CreatorNormalizationService::inferPlatformAndHandle('https://www.tiktok.com/@linhbarbie');
        $this->assertEquals('linhbarbie', $res['handle']);
        $this->assertEquals('tiktok', $res['platform']);
        $this->assertEquals('https://www.tiktok.com/@linhbarbie', $res['url']);

        // Có handle và platform -> tự dựng profile_url
        $res2 = CreatorNormalizationService::inferPlatformAndHandle('', 'koc_review', 'facebook');
        $this->assertEquals('koc_review', $res2['handle']);
        $this->assertEquals('facebook', $res2['platform']);
        $this->assertEquals('https://www.facebook.com/koc_review', $res2['url']);
    }
}

