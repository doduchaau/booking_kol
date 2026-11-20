<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Models\CampaignCreatorSampleLog;
use Modules\Campaign\Models\CampaignProduct;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class CampaignSampleShipmentHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Campaign $campaign;
    protected CampaignProduct $product1;
    protected CampaignProduct $product2;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();

        $this->campaign = Campaign::create([
            'name' => 'Chiến Dịch Test Lịch Sử Gửi Mẫu',
            'product_name' => 'Sản phẩm demo',
            'budget' => 30000000,
            'target_creators_count' => 5,
            'target_platforms' => ['tiktok'],
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
        ]);

        $this->product1 = CampaignProduct::create([
            'campaign_id' => $this->campaign->id,
            'name' => 'Áo Thun Cotton',
            'sku' => 'AT-COTTON',
            'retail_price' => 150000,
            'sort_order' => 0,
        ]);

        $this->product2 = CampaignProduct::create([
            'campaign_id' => $this->campaign->id,
            'name' => 'Quần Jean Nữ',
            'sku' => 'QJ-JEAN',
            'retail_price' => 300000,
            'sort_order' => 1,
        ]);

        $this->creator = Creator::create([
            'name' => 'KOC Linh Nga',
            'phone' => '0912345678',
            'shipping_address' => '123 Đường Nguyễn Trãi',
            'city_province' => 'Hà Nội',
            'district' => 'Thanh Xuân',
            'ward' => 'Khương Trung',
            'niche' => 'Fashion',
            'tier' => CreatorTierEnum::MICRO->value,
        ]);

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'status' => PipelineStatusEnum::ADDRESS_CONFIRMED->value,
            'total_samples_assigned' => 2,
            'total_samples_sent' => 0,
            'booking_fee' => 0,
        ]);
    }

    public function test_can_record_first_sample_shipment_batch(): void
    {
        $payload = [
            'shipped_at' => '2026-11-15',
            'notes' => 'Gửi mẫu đợt 1 áo thun',
            'tracking_code' => 'SPX111222',
            'products' => [
                [
                    'product_id' => $this->product1->id,
                    'quantity' => 1,
                    'variant' => 'Size M, Trắng',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post(
            route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]),
            $payload
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->campaignCreator->refresh();

        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $this->campaignCreator->status);
        $this->assertEquals(1, $this->campaignCreator->total_samples_sent);
        $this->assertEquals('2026-11-15', $this->campaignCreator->sample_sent_at->format('Y-m-d'));

        // Kiểm tra bản ghi log trong DB
        $log = CampaignCreatorSampleLog::where('campaign_creator_id', $this->campaignCreator->id)->first();
        $this->assertNotNull($log);
        $this->assertEquals('2026-11-15', $log->shipped_at->format('Y-m-d'));
        $this->assertEquals('Gửi mẫu đợt 1 áo thun', $log->notes);
        $this->assertEquals('SPX111222', $log->tracking_code);
        $this->assertEquals(1, $log->total_items_count);
        $this->assertCount(1, $log->items);
        $this->assertEquals('Size M, Trắng', $log->items[0]['variant']);

        // Kiểm tra accessor sample_shipment_history
        $history = $this->campaignCreator->sample_shipment_history;
        $this->assertCount(1, $history);
        $this->assertEquals('2026-11-15', $history[0]['shipped_at']);
        $this->assertEquals(1, $history[0]['total_items_count']);
    }

    public function test_can_record_multiple_shipment_batches_as_evidence_trail(): void
    {
        // Đợt 1: Ngày 15/11 gửi 1 áo
        $this->actingAs($this->user)->post(
            route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]),
            [
                'shipped_at' => '2026-11-15',
                'notes' => 'Gửi đợt 1: áo size M',
                'tracking_code' => 'SPX-DOT-1',
                'products' => [
                    [
                        'product_id' => $this->product1->id,
                        'quantity' => 1,
                        'variant' => 'Size M',
                    ],
                ],
            ]
        );

        // Đợt 2: Ngày 20/11 gửi bù 1 áo size L và 1 quần Jean
        $this->actingAs($this->user)->post(
            route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]),
            [
                'shipped_at' => '2026-11-20',
                'notes' => 'Gửi đợt 2: đổi size L và bổ sung quần Jean',
                'tracking_code' => 'SPX-DOT-2',
                'products' => [
                    [
                        'product_id' => $this->product1->id,
                        'quantity' => 1,
                        'variant' => 'Size L',
                    ],
                    [
                        'product_id' => $this->product2->id,
                        'quantity' => 1,
                        'variant' => 'Size 28',
                    ],
                ],
            ]
        );

        $this->campaignCreator->refresh();

        // Tổng số lượng gửi phải là 1 + 2 = 3 món
        $this->assertEquals(3, $this->campaignCreator->total_samples_sent);
        $this->assertEquals('2026-11-20', $this->campaignCreator->sample_sent_at->format('Y-m-d'));

        // Kiểm tra có đúng 2 bản ghi log evidence
        $logs = CampaignCreatorSampleLog::where('campaign_creator_id', $this->campaignCreator->id)
            ->orderBy('shipped_at', 'desc')
            ->get();
        $this->assertCount(2, $logs);

        // Đợt mới nhất (Đợt 2) ở đầu
        $this->assertEquals('2026-11-20', $logs[0]->shipped_at->format('Y-m-d'));
        $this->assertEquals(2, $logs[0]->total_items_count);
        $this->assertEquals('SPX-DOT-2', $logs[0]->tracking_code);

        // Đợt cũ (Đợt 1) ở sau
        $this->assertEquals('2026-11-15', $logs[1]->shipped_at->format('Y-m-d'));
        $this->assertEquals(1, $logs[1]->total_items_count);

        // Kiểm tra accessor history
        $history = $this->campaignCreator->sample_shipment_history;
        $this->assertCount(2, $history);
        $this->assertEquals('2026-11-20', $history[0]['shipped_at']);
        $this->assertEquals('2026-11-15', $history[1]['shipped_at']);
    }

    public function test_legacy_sample_sent_without_logs_falls_back_gracefully(): void
    {
        // Giả lập KOC cũ đã gửi mẫu trước khi có bảng log
        $legacyCc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'status' => PipelineStatusEnum::SAMPLE_SENT->value,
            'sample_sent_at' => '2026-10-10 14:00:00',
            'notes' => 'Ghi chú gửi mẫu cũ từ trước',
            'total_samples_assigned' => 1,
            'total_samples_sent' => 1,
            'booking_fee' => 0,
        ]);

        $history = $legacyCc->sample_shipment_history;
        $this->assertNotEmpty($history);
        $this->assertEquals('2026-10-10', $history[0]['shipped_at']);
        $this->assertEquals('Ghi chú gửi mẫu cũ từ trước', $history[0]['notes']);
    }

    public function test_can_update_existing_shipment_log(): void
    {
        // Tạo trước 1 đợt gửi
        $this->actingAs($this->user)->post(
            route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]),
            [
                'shipped_at' => '2026-11-15',
                'notes' => 'Ghi chú ban đầu',
                'tracking_code' => 'SPX-OLD',
                'products' => [
                    [
                        'product_id' => $this->product1->id,
                        'quantity' => 1,
                        'variant' => 'Size M',
                    ],
                ],
            ]
        );

        $log = CampaignCreatorSampleLog::where('campaign_creator_id', $this->campaignCreator->id)->first();
        $this->assertNotNull($log);

        // Chỉnh sửa đợt gửi này
        $updateResponse = $this->actingAs($this->user)->put(
            route('campaigns.creators.shipments.update', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
                'logId' => $log->id,
            ]),
            [
                'shipped_at' => '2026-11-16',
                'notes' => 'Ghi chú sau khi sửa',
                'tracking_code' => 'SPX-NEW-CODE',
                'products' => [
                    [
                        'product_id' => $this->product1->id,
                        'quantity' => 2,
                        'variant' => 'Size L',
                    ],
                ],
            ]
        );

        $updateResponse->assertRedirect();
        $updateResponse->assertSessionHas('success');

        $log->refresh();
        $this->assertEquals('2026-11-16', $log->shipped_at->format('Y-m-d'));
        $this->assertEquals('Ghi chú sau khi sửa', $log->notes);
        $this->assertEquals('SPX-NEW-CODE', $log->tracking_code);
        $this->assertEquals(2, $log->total_items_count);

        $this->campaignCreator->refresh();
        $this->assertEquals(2, $this->campaignCreator->total_samples_sent);
        $this->assertEquals('2026-11-16', $this->campaignCreator->sample_sent_at->format('Y-m-d'));
    }

    public function test_can_delete_shipment_log_and_recalculate_totals(): void
    {
        // Tạo 2 đợt gửi
        $this->actingAs($this->user)->post(
            route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]),
            [
                'shipped_at' => '2026-11-15',
                'notes' => 'Đợt 1',
                'products' => [
                    ['product_id' => $this->product1->id, 'quantity' => 1],
                ],
            ]
        );

        $this->actingAs($this->user)->post(
            route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]),
            [
                'shipped_at' => '2026-11-20',
                'notes' => 'Đợt 2',
                'products' => [
                    ['product_id' => $this->product2->id, 'quantity' => 2],
                ],
            ]
        );

        $this->campaignCreator->refresh();
        $this->assertEquals(3, $this->campaignCreator->total_samples_sent);

        $log2 = CampaignCreatorSampleLog::where('campaign_creator_id', $this->campaignCreator->id)
            ->where('notes', 'Đợt 2')
            ->first();

        // Xóa đợt 2
        $deleteResponse = $this->actingAs($this->user)->delete(
            route('campaigns.creators.shipments.destroy', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
                'logId' => $log2->id,
            ])
        );

        $deleteResponse->assertRedirect();
        $deleteResponse->assertSessionHas('success');

        // Kiểm tra sau khi xóa đợt 2, còn lại 1 đợt, tổng số món giảm về 1, ngày về ngày 15/11
        $this->campaignCreator->refresh();
        $this->assertEquals(1, $this->campaignCreator->total_samples_sent);
        $this->assertEquals('2026-11-15', $this->campaignCreator->sample_sent_at->format('Y-m-d'));

        $remainingCount = CampaignCreatorSampleLog::where('campaign_creator_id', $this->campaignCreator->id)->count();
        $this->assertEquals(1, $remainingCount);
    }
}
