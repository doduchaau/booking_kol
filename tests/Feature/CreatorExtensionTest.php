<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Creator\Connectors\ChromeExtensionConnector;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Tests\TestCase;
use ZipArchive;

class CreatorExtensionTest extends TestCase
{
    use RefreshDatabase;

    public function test_chrome_extension_connector_parses_and_saves_new_creator(): void
    {
        $connector = app(ChromeExtensionConnector::class);

        $payload = [
            'name' => 'Linh Đan Beauty',
            'platform' => 'tiktok',
            'handle' => '@linhdan.beauty',
            'url' => 'https://www.tiktok.com/@linhdan.beauty',
            'followers_count' => 125000,
            'bio' => 'Chuyên skincare & làm đẹp. Booking: 0987654321 / linhdan@gmail.com',
            'phone' => '0987654321',
            'email' => 'linhdan@gmail.com',
            'niche' => 'beauty',
            'rate_price' => 3500000,
        ];

        $parsed = $connector->parse($payload);

        $this->assertEquals('Linh Đan Beauty', $parsed['name']);
        $this->assertEquals('linhdan.beauty', $parsed['handle']);
        $this->assertEquals('0987654321', $parsed['phone']);
        $this->assertEquals('linhdan@gmail.com', $parsed['email']);
        $this->assertEquals(CreatorTierEnum::MACRO, $parsed['tier']);
        $this->assertEquals(PlatformEnum::TIKTOK, $parsed['platform']);

        $user = User::factory()->create();
        $result = $connector->save($parsed, $user);

        $this->assertEquals('created', $result['action']);
        $this->assertDatabaseHas('creators', [
            'id' => $result['creator']->id,
            'name' => 'Linh Đan Beauty',
            'phone' => '0987654321',
            'niche' => 'beauty',
            'tier' => 'macro',
        ]);

        $this->assertDatabaseHas('creator_accounts', [
            'creator_id' => $result['creator']->id,
            'platform' => 'tiktok',
            'handle' => 'linhdan.beauty',
            'followers_count' => 125000,
            'data_source' => 'extension',
        ]);

        $this->assertDatabaseHas('creator_rate_cards', [
            'creator_id' => $result['creator']->id,
            'price' => 3500000,
        ]);
    }

    public function test_chrome_extension_connector_updates_existing_creator(): void
    {
        $existing = Creator::create([
            'name' => 'Vũ Review Cũ',
            'phone' => '0901234567',
            'niche' => 'general',
            'tier' => 'micro',
        ]);

        CreatorAccount::create([
            'creator_id' => $existing->id,
            'platform' => 'tiktok',
            'handle' => 'vureview',
            'url' => 'https://www.tiktok.com/@vureview',
            'followers_count' => 50000,
            'data_source' => 'manual',
        ]);

        $connector = app(ChromeExtensionConnector::class);
        $payload = [
            'name' => 'Vũ Review Mới',
            'platform' => 'tiktok',
            'handle' => '@vureview',
            'followers_count' => 80000,
            'niche' => 'tech',
            'notes' => 'Cập nhật từ Chrome extension',
        ];

        $parsed = $connector->parse($payload);
        $result = $connector->save($parsed);

        $this->assertEquals('updated', $result['action']);
        $this->assertEquals($existing->id, $result['creator']->id);

        $this->assertDatabaseHas('creator_accounts', [
            'creator_id' => $existing->id,
            'handle' => 'vureview',
            'followers_count' => 80000,
            'data_source' => 'extension',
        ]);
    }

    public function test_api_extension_ping_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/extension/ping');
        $response->assertStatus(401);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $authResponse = $this->getJson('/api/v1/extension/ping');
        $authResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'connected' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                ],
            ]);
    }

    public function test_api_extension_check_detects_existing_handle(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $creator = Creator::create([
            'name' => 'Phương Ly Vlog',
            'phone' => '0933445566',
            'niche' => 'lifestyle',
        ]);

        CreatorAccount::create([
            'creator_id' => $creator->id,
            'platform' => 'tiktok',
            'handle' => 'phuongly.vlog',
            'url' => 'https://www.tiktok.com/@phuongly.vlog',
        ]);

        // Kiểm tra đúng handle
        $resp = $this->getJson('/api/v1/extension/check?platform=tiktok&handle=phuongly.vlog');
        $resp->assertStatus(200)
            ->assertJson([
                'exists' => true,
                'creator' => [
                    'id' => $creator->id,
                    'name' => 'Phương Ly Vlog',
                ],
            ]);

        // Kiểm tra handle chưa có
        $respNotFound = $this->getJson('/api/v1/extension/check?platform=tiktok&handle=chua_tung_co');
        $respNotFound->assertStatus(200)
            ->assertJson([
                'exists' => false,
                'creator' => null,
            ]);
    }

    public function test_api_extension_collect_creates_creator(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            'name' => 'Thầy Giáo Ba',
            'platform' => 'facebook',
            'handle' => 'thaygiaoba',
            'url' => 'https://www.facebook.com/thaygiaoba',
            'followers_count' => 850000,
            'bio' => 'Lớp học thầy Ba. Liên hệ quảng cáo: ba@gmail.com',
            'email' => 'ba@gmail.com',
            'niche' => 'entertainment',
        ];

        $response = $this->postJson('/api/v1/extension/collect', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'action' => 'created',
            ]);

        $this->assertDatabaseHas('creators', [
            'name' => 'Thầy Giáo Ba',
            'email' => 'ba@gmail.com',
        ]);

        $this->assertDatabaseHas('creator_accounts', [
            'platform' => 'facebook',
            'handle' => 'thaygiaoba',
            'data_source' => 'extension',
        ]);
    }

    public function test_web_extension_routes_and_download_zip(): void
    {
        $user = User::factory()->create();

        // 1. Xem trang cài đặt
        $response = $this->actingAs($user)->get('/creators/extension');
        $response->assertStatus(200);

        // 2. Tạo token
        $tokenResponse = $this->actingAs($user)->post('/creators/extension/token');
        $tokenResponse->assertRedirect('/creators/extension');
        $tokenResponse->assertSessionHas('new_extension_token');

        // 3. Tải file ZIP extension
        $downloadResponse = $this->actingAs($user)->get('/creators/extension/download');
        $downloadResponse->assertStatus(200);
        $downloadResponse->assertHeader('content-type', 'application/zip');
    }
}
