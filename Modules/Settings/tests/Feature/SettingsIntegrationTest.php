<?php

namespace Modules\Settings\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Modules\Content\Services\ContentMetricsSyncService;
use Modules\Content\Services\VideoMetadataExtractorService;
use Modules\Settings\Models\Setting;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SettingsIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Leader', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);

        $this->adminUser = User::factory()->create([
            'email' => 'admin_test@kolcrm.vn',
        ]);
        $this->adminUser->assignRole('Admin');
    }

    public function test_can_save_social_provider_and_youtube_keys(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.integrations.update'), [
            'social_data_provider_driver' => 'rapidapi',
            'social_data_provider_api_key' => 'test_rapidapi_key_12345',
            'social_data_provider_api_host' => 'custom-tiktok.p.rapidapi.com',
            'youtube_api_key' => 'test_youtube_key_67890',
            'facebook_client_token' => 'test_fb_token_abc',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Kiểm tra dữ liệu được lưu trong database và được giải mã chính xác
        $this->assertEquals('rapidapi', Setting::get('social_data_provider_driver'));
        $this->assertEquals('test_rapidapi_key_12345', Setting::get('social_data_provider_api_key'));
        $this->assertEquals('custom-tiktok.p.rapidapi.com', Setting::get('social_data_provider_api_host'));
        $this->assertEquals('test_youtube_key_67890', Setting::get('youtube_api_key'));
        $this->assertEquals('test_fb_token_abc', Setting::get('facebook_client_token'));

        // Kiểm tra xem trường nhạy cảm có được mã hóa trong bảng settings hay không
        $rawSetting = Setting::where('key', 'social_data_provider_api_key')->first();
        $this->assertTrue($rawSetting->is_encrypted);
        $this->assertNotEquals('test_rapidapi_key_12345', $rawSetting->value);
    }

    public function test_test_connection_endpoint_rapidapi_validation(): void
    {
        // 1. Trường hợp không có key
        $response = $this->actingAs($this->adminUser)->postJson(route('settings.integrations.test'), [
            'target' => 'rapidapi',
            'api_key' => '',
        ]);
        $response->assertStatus(422);

        // 2. Mock RapidAPI probe thành công
        Http::fake([
            'https://tiktok-api23.p.rapidapi.com/*' => Http::response([
                'code' => 0,
                'data' => [],
            ], 200),
        ]);

        $successResponse = $this->actingAs($this->adminUser)->postJson(route('settings.integrations.test'), [
            'target' => 'rapidapi',
            'api_key' => 'valid_rapidapi_key',
            'api_host' => 'tiktok-api23.p.rapidapi.com',
        ]);

        $successResponse->assertOk();
        $this->assertTrue($successResponse->json('success'));
        $this->assertStringContainsString('thành công', $successResponse->json('message'));
    }

    public function test_test_connection_endpoint_youtube(): void
    {
        Http::fake([
            'https://www.googleapis.com/youtube/v3/videos*' => Http::response([
                'items' => [
                    ['snippet' => ['title' => 'Sample Video']],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($this->adminUser)->postJson(route('settings.integrations.test'), [
            'target' => 'youtube',
            'api_key' => 'valid_youtube_key',
        ]);

        $response->assertOk();
        $this->assertTrue($response->json('success'));
        $this->assertStringContainsString('thành công', $response->json('message'));
    }

    public function test_content_metrics_sync_uses_setting_from_database(): void
    {
        Setting::set('youtube_api_key', 'database_youtube_key', 'social_provider', true);

        Http::fake([
            'https://www.googleapis.com/youtube/v3/videos?*key=database_youtube_key*' => Http::response([
                'items' => [
                    [
                        'snippet' => ['title' => 'DB Key YouTube Video', 'channelTitle' => 'Test Channel'],
                        'statistics' => ['viewCount' => '99999', 'likeCount' => '888', 'commentCount' => '77'],
                    ],
                ],
            ], 200),
        ]);

        $extractor = new VideoMetadataExtractorService();
        $syncService = new ContentMetricsSyncService($extractor);

        $metrics = $syncService->fetchRealMetrics('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        $this->assertEquals('youtube_official_api', $metrics['source']);
        $this->assertEquals(99999, $metrics['views_count']);
        $this->assertEquals('DB Key YouTube Video', $metrics['title']);
    }
}
