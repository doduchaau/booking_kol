<?php

namespace Modules\Creator\Tests\Unit;

use Modules\Creator\Services\SmartSchemaMapperService;
use Tests\TestCase;

class SmartSchemaMapperTest extends TestCase
{
    protected SmartSchemaMapperService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SmartSchemaMapperService();
    }

    public function test_locates_header_row_with_leading_metadata(): void
    {
        // Giả lập file Agency có logo và ngày xuất bản ở 2 dòng đầu
        $rawRows = [
            ['BÁO GIÁ KOC THÁNG 10/2026 - AGENCY XYZ', '', '', ''],
            ['Ngày xuất file: 28/10/2026', '', '', ''],
            ['Tên KOC', 'SĐT Liên Hệ', 'Kênh TikTok', 'Followers', 'Giá Booking Video'],
            ['Nguyễn Văn A', '0981234567', '@nguyenvana', '500K', '4tr5'],
            ['Trần Thị B', '0912345678', '@tranthib', '1.2M', '10 củ'],
        ];

        $headerIndex = $this->service->locateHeaderRow($rawRows);
        $this->assertEquals(2, $headerIndex);
    }

    public function test_matches_headers_with_fuzzy_and_accents_removed(): void
    {
        // Có dấu, viết hoa thường, đồng nghĩa
        $res1 = $this->service->matchHeaderWithDictionary('Họ và tên KOC');
        $this->assertNotNull($res1);
        $this->assertEquals('name', $res1['field']);
        $this->assertGreaterThanOrEqual(90, $res1['confidence']);

        $res2 = $this->service->matchHeaderWithDictionary('Số ĐT Zalo');
        $this->assertNotNull($res2);
        $this->assertEquals('phone', $res2['field']);

        $res3 = $this->service->matchHeaderWithDictionary('Báo giá clip');
        $this->assertNotNull($res3);
        $this->assertEquals('rate_price', $res3['field']);

        $res4 = $this->service->matchHeaderWithDictionary('Lượt người theo dõi');
        $this->assertNotNull($res4);
        $this->assertEquals('followers_count', $res4['field']);
    }

    public function test_sniffs_values_with_regex(): void
    {
        // Test cột không có header rõ ràng nhưng chứa URL TikTok
        $sampleUrls = [
            'https://www.tiktok.com/@charlidamelio',
            'https://tiktok.com/@khaby.lame',
            'https://www.tiktok.com/@bellapoarch',
        ];
        $sniffedUrl = $this->service->sniffValues($sampleUrls, []);
        $this->assertNotNull($sniffedUrl);
        $this->assertEquals('profile_url', $sniffedUrl['field']);
        $this->assertEquals(95, $sniffedUrl['confidence']);

        // Test cột chứa Email
        $sampleEmails = [
            'booking@agency.com',
            'linh.barbie@gmail.com',
            'koc.vietnam@outlook.com',
        ];
        $sniffedEmail = $this->service->sniffValues($sampleEmails, []);
        $this->assertNotNull($sniffedEmail);
        $this->assertEquals('email', $sniffedEmail['field']);
        $this->assertEquals(95, $sniffedEmail['confidence']);

        // Test cột chứa Số điện thoại 9 số (Excel nuốt số 0)
        $samplePhones = [
            '981234567',
            '912345678',
            '398765432',
        ];
        $sniffedPhone = $this->service->sniffValues($samplePhones, []);
        $this->assertNotNull($sniffedPhone);
        $this->assertEquals('phone', $sniffedPhone['field']);
        $this->assertEquals(90, $sniffedPhone['confidence']);
    }

    public function test_detects_complete_schema_and_extra_columns(): void
    {
        $rawRows = [
            ['BÁO GIÁ KOC'],
            ['Tên KOC', 'Link TikTok', 'SĐT', 'Followers', 'Giá Video', 'Giá Livestream'],
            ['An Nhiên', 'https://www.tiktok.com/@annhien', '0981112233', '250K', '5.000.000', '8.000.000'],
        ];

        $schema = $this->service->detectSchema($rawRows);

        $this->assertEquals(1, $schema['header_row_index']);
        $this->assertNotEmpty($schema['mappings']);

        // Kiểm tra cột chính được map
        $mappedFields = array_column($schema['mappings'], 'field');
        $this->assertContains('name', $mappedFields);
        $this->assertContains('profile_url', $mappedFields);
        $this->assertContains('phone', $mappedFields);
        $this->assertContains('followers_count', $mappedFields);
        $this->assertContains('rate_price', $mappedFields);

        // Kiểm tra cột phụ (Giá Livestream) gom vào extra_columns
        $this->assertNotEmpty($schema['extra_columns']);
        $extraKeys = array_column($schema['extra_columns'], 'attribute_key');
        $this->assertContains('extra_price_livestream', $extraKeys);
    }
}

