<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Services\CreatorDeduplicationService;
use Modules\Creator\Services\CreatorImportService;
use Modules\Creator\Services\CreatorNormalizationService;
use Tests\TestCase;

class CreatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_normalizes_vietnamese_phone_numbers_correctly(): void
    {
        $this->assertEquals('0912345678', CreatorNormalizationService::normalizePhone('0912.345.678'));
        $this->assertEquals('0912345678', CreatorNormalizationService::normalizePhone('+84912345678'));
        $this->assertEquals('0912345678', CreatorNormalizationService::normalizePhone('84912345678'));
        $this->assertEquals('0912345678', CreatorNormalizationService::normalizePhone('0912-345-678'));
        $this->assertEquals('0912345678', CreatorNormalizationService::normalizePhone('0912 345 678'));
    }

    public function test_normalizes_social_handle(): void
    {
        $this->assertEquals('antechreview', CreatorNormalizationService::normalizeHandle('@AnTechReview'));
        $this->assertEquals('antechreview', CreatorNormalizationService::normalizeHandle('  @antechreview  '));
    }

    public function test_determines_creator_tier_from_follower_count(): void
    {
        $this->assertEquals(CreatorTierEnum::NANO, CreatorNormalizationService::determineTier(5000));
        $this->assertEquals(CreatorTierEnum::MICRO, CreatorNormalizationService::determineTier(45000));
        $this->assertEquals(CreatorTierEnum::MACRO, CreatorNormalizationService::determineTier(250000));
        $this->assertEquals(CreatorTierEnum::MEGA, CreatorNormalizationService::determineTier(1500000));
    }

    public function test_detects_duplicate_creator_by_phone(): void
    {
        $existing = Creator::create([
            'name' => 'Nguyễn Văn A',
            'phone' => '0912345678',
            'niche' => 'tech',
        ]);

        $dedup = app(CreatorDeduplicationService::class);
        $found = $dedup->findExistingMatch(phone: '+84912345678');

        $this->assertNotNull($found);
        $this->assertEquals($existing->id, $found->id);
    }

    public function test_merges_duplicate_creator_into_master_profile(): void
    {
        $admin = User::factory()->create();

        $master = Creator::create([
            'name' => 'Master Creator',
            'phone' => '0901111111',
            'niche' => 'tech',
        ]);

        $duplicate = Creator::create([
            'name' => 'Duplicate Creator',
            'phone' => '0902222222',
            'email' => 'duplicate@example.com',
            'shipping_address' => 'Số 10 Đường ABC',
            'niche' => 'tech',
        ]);

        CreatorAccount::create([
            'creator_id' => $duplicate->id,
            'platform' => PlatformEnum::TIKTOK,
            'handle' => 'duplicate_tiktok',
            'url' => 'https://tiktok.com/@duplicate_tiktok',
            'followers_count' => 10000,
        ]);

        $dedup = app(CreatorDeduplicationService::class);
        $dedup->mergeProfiles($master, $duplicate, $admin);

        // Kiểm tra duplicate đã bị soft delete và gắn link tới master
        $duplicate->refresh();
        $this->assertTrue($duplicate->trashed());
        $this->assertEquals($master->id, $duplicate->merged_into_creator_id);

        // Kiểm tra master được cập nhật địa chỉ và email từ duplicate
        $master->refresh();
        $this->assertEquals('duplicate@example.com', $master->email);
        $this->assertEquals('Số 10 Đường ABC', $master->shipping_address);

        // Kiểm tra tài khoản tiktok được chuyển sang cho master
        $this->assertDatabaseHas('creator_accounts', [
            'creator_id' => $master->id,
            'handle' => 'duplicate_tiktok',
        ]);
    }

    public function test_imports_creator_from_csv(): void
    {
        $admin = User::factory()->create();

        $csvContent = "name,phone,email,niche,tier,shipping_address,city_province,district,platform,handle,followers_count,rate_price,notes\n"
                    . "Phạm Thu Hằng,0934567890,hang.pham@gmail.com,beauty,nano,Số 5 Hàng Bông,Hà Nội,Hoàn Kiếm,tiktok,hangphambeauty,8500,600000,KOC uy tín";

        $file = UploadedFile::fake()->createWithContent('creators.csv', $csvContent);

        $importService = app(CreatorImportService::class);
        $result = $importService->importFile($file, $admin);

        $this->assertEquals(1, $result['imported']);
        $this->assertEquals(0, $result['skipped']);
        $this->assertDatabaseHas('creators', [
            'name' => 'Phạm Thu Hằng',
            'phone' => '0934567890',
            'niche' => 'beauty',
        ]);
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'hangphambeauty',
            'platform' => 'tiktok',
        ]);
    }
}
