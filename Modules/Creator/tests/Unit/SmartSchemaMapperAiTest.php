<?php

namespace Modules\Creator\Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Modules\Creator\Services\SmartSchemaMapperService;
use Modules\Settings\Models\Setting;
use Tests\TestCase;

class SmartSchemaMapperAiTest extends TestCase
{
    use RefreshDatabase;
    public function test_ai_fallback_mapper_resolves_obscure_columns(): void
    {
        // Giả lập lưu API key trong Settings
        Setting::set('groq_api_key', 'gsk_test_mock_key', 'ai_integration', true);

        // Giả lập Http Mock cho Groq API
        Http::fake([
            'https://api.groq.com/openai/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => json_encode([
                                'mappings' => [
                                    [
                                        'column_index' => 2,
                                        'field' => 'rate_price',
                                        'confidence' => 88,
                                    ],
                                ],
                            ]),
                        ],
                    ],
                ],
            ], 200),
        ]);

        $mapper = app(SmartSchemaMapperService::class);

        // Bảng dữ liệu mẫu có cột số 2 có tên lạ "Thù Lao Net"
        $rawRows = [
            ['Tên KOC', 'Số điện thoại', 'Thù Lao Net'],
            ['Trang Lou', '0912345678', '15.000.000 đ'],
            ['Tùng Sơn', '0987654321', '8.000.000 đ'],
        ];

        $schema = $mapper->detectSchema($rawRows);

        $this->assertArrayHasKey(2, $schema['mappings']);
        $this->assertEquals('rate_price', $schema['mappings'][2]['field']);
        $this->assertEquals('ai_fallback', $schema['mappings'][2]['source']);
        $this->assertEquals(88, $schema['mappings'][2]['confidence']);
    }
}
