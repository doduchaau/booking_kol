<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Models\Campaign;
use Tests\TestCase;

class CampaignProductMultiFileUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_upload_multiple_images_and_brief_files_when_creating_campaign(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $img1 = UploadedFile::fake()->image('sp_thumb1.jpg', 600, 600);
        $img2 = UploadedFile::fake()->image('sp_detail2.png', 800, 800);

        $doc1 = UploadedFile::fake()->create('kich_ban_chi_tiet.pdf', 300, 'application/pdf');
        $doc2 = UploadedFile::fake()->create('moodboard_mau.docx', 200, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        $payload = [
            'name' => 'Chiến dịch Test Đa File',
            'product_name' => 'Kem Dưỡng B5',
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
            'products' => [
                [
                    'name' => 'Kem Dưỡng Phục Hồi B5 50ml',
                    'sku' => 'B5-50ML',
                    'retail_price' => 450000,
                    'brief_content' => 'Góc quay cận cảnh chất kem mỏng nhẹ',
                    'images' => [$img1, $img2],
                    'brief_files' => [$doc1, $doc2],
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('campaigns.store'), $payload);
        $response->assertRedirect();

        $campaign = Campaign::where('name', 'Chiến dịch Test Đa File')->firstOrFail();
        $this->assertCount(1, $campaign->products);

        $product = $campaign->products->first();
        $this->assertEquals('Kem Dưỡng Phục Hồi B5 50ml', $product->name);

        // Kiểm tra images
        $this->assertIsArray($product->images);
        $this->assertCount(2, $product->images);
        $this->assertNotNull($product->thumbnail_url);
        Storage::disk('public')->assertExists($product->images[0]['path']);
        Storage::disk('public')->assertExists($product->images[1]['path']);

        // Kiểm tra brief_files
        $this->assertIsArray($product->brief_files);
        $this->assertCount(2, $product->brief_files);
        Storage::disk('public')->assertExists($product->brief_files[0]['path']);
        Storage::disk('public')->assertExists($product->brief_files[1]['path']);

        // Kiểm tra Accessors
        $this->assertCount(2, $product->image_urls);
        $this->assertCount(2, $product->brief_file_items);
        $this->assertStringContainsString('storage/', $product->thumbnail_url);
    }

    public function test_can_update_product_and_remove_selected_images_and_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $img1 = UploadedFile::fake()->image('img1.jpg');
        $img2 = UploadedFile::fake()->image('img2.jpg');
        $doc1 = UploadedFile::fake()->create('doc1.pdf');

        $campaign = Campaign::create([
            'name' => 'Chiến dịch Cập Nhật File',
            'product_name' => 'Son Dưỡng',
            'budget' => 15000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $user->id,
        ]);

        $pathImg1 = $img1->store('campaigns/products/images', 'public');
        $pathImg2 = $img2->store('campaigns/products/images', 'public');
        $pathDoc1 = $doc1->store('campaigns/products/briefs', 'public');

        $prod = $campaign->products()->create([
            'name' => 'Son Dưỡng Môi Dầu Dừa',
            'thumbnail_url' => $pathImg1,
            'images' => [
                ['path' => $pathImg1, 'name' => 'img1.jpg', 'size' => 100],
                ['path' => $pathImg2, 'name' => 'img2.jpg', 'size' => 120],
            ],
            'brief_files' => [
                ['path' => $pathDoc1, 'name' => 'doc1.pdf', 'size' => 200, 'type' => 'application/pdf'],
            ],
        ]);

        Storage::disk('public')->assertExists($pathImg1);
        Storage::disk('public')->assertExists($pathImg2);
        Storage::disk('public')->assertExists($pathDoc1);

        $newImg = UploadedFile::fake()->image('img3.jpg');

        $updatePayload = [
            '_method' => 'PUT',
            'name' => 'Chiến dịch Cập Nhật File (Đã sửa)',
            'product_name' => 'Son Dưỡng',
            'budget' => 15000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
            'products' => [
                [
                    'id' => $prod->id,
                    'name' => 'Son Dưỡng Môi Dầu Dừa Cao Cấp',
                    'removed_image_paths' => [$pathImg1], // Xóa img1
                    'images' => [$newImg], // Thêm img3
                    'removed_brief_file_paths' => [$pathDoc1], // Xóa doc1
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('campaigns.update', $campaign->id), $updatePayload);
        $response->assertRedirect();

        $prod->refresh();
        $this->assertEquals('Son Dưỡng Môi Dầu Dừa Cao Cấp', $prod->name);

        // img1 đã bị xóa khỏi disk
        Storage::disk('public')->assertMissing($pathImg1);
        // doc1 đã bị xóa khỏi disk
        Storage::disk('public')->assertMissing($pathDoc1);

        // prod còn img2 và có thêm img3
        $this->assertCount(2, $prod->images);
        $this->assertEquals($pathImg2, $prod->images[0]['path']);
        Storage::disk('public')->assertExists($prod->images[1]['path']);

        // brief_files trống
        $this->assertCount(0, $prod->brief_files);
    }
}
