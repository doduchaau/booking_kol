<?php

namespace Modules\Outreach\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Outreach\Models\OutreachTemplate;

class OutreachDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Mời hợp tác KOC trải nghiệm sản phẩm (Zalo cá nhân)',
                'channel' => 'zalo_personal',
                'subject' => 'Lời mời hợp tác chiến dịch',
                'content_template' => "Chào bạn {creator_name}, mình phụ trách booking nhãn hàng. Mình thấy phong cách kênh của bạn rất phù hợp với sản phẩm {product_name} bên mình.\n\nBên mình đang triển khai chiến dịch {campaign_name} với mức phí dự kiến {rate} và gửi sản phẩm trải nghiệm miễn phí.\n\nNếu bạn quan tâm hợp tác, bạn bấm vào link này để xác nhận thông tin nhận hàng và xem guideline chi tiết nhé:\n{portal_link}\n\nRất mong được làm việc cùng bạn!",
                'is_active' => true,
            ],
            [
                'name' => 'Nhắc lịch lên video & nộp link nghiệm thu (Zalo cá nhân)',
                'channel' => 'zalo_personal',
                'subject' => 'Nhắc lịch lên video',
                'content_template' => "Chào bạn {creator_name}, bên mình thấy bạn đã nhận được sản phẩm {product_name} của chiến dịch {campaign_name} rồi nè.\n\nBạn sắp xếp thời gian quay và lên video đúng deadline giúp team nha. Sau khi đăng video xong, bạn chỉ cần gửi link vào cổng này để team nghiệm thu nhé:\n{portal_link}\n\nCần hỗ trợ bất kỳ điều gì bạn cứ nhắn mình nha!",
                'is_active' => true,
            ],
            [
                'name' => 'Thông báo chính thức qua Zalo OA (ZNS)',
                'channel' => 'zalo_oa',
                'subject' => 'Thông báo hợp tác chiến dịch KOL/KOC',
                'content_template' => "Kính gửi {creator_name}, nhãn hàng trân trọng mời bạn tham gia chiến dịch {campaign_name} cho sản phẩm {product_name}. Vui lòng truy cập {portal_link} để hoàn tất xác nhận tham gia.",
                'is_active' => true,
            ],
        ];

        foreach ($templates as $tmpl) {
            OutreachTemplate::updateOrCreate(
                ['name' => $tmpl['name']],
                $tmpl
            );
        }
    }
}
