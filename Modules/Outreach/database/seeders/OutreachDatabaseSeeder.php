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
                'type' => 'custom',
                'channel' => 'zalo_personal',
                'subject' => 'Lời mời hợp tác chiến dịch',
                'content_template' => "Chào bạn {creator_name}, mình phụ trách booking nhãn hàng. Mình thấy phong cách kênh của bạn rất phù hợp với sản phẩm {product_name} bên mình.\n\nBên mình đang triển khai chiến dịch {campaign_name} với mức phí dự kiến {rate} và gửi sản phẩm trải nghiệm miễn phí.\n\nNếu bạn quan tâm hợp tác, bạn bấm vào link này để xác nhận thông tin nhận hàng và xem guideline chi tiết nhé:\n{portal_link}\n\nRất mong được làm việc cùng bạn!",
                'is_active' => true,
            ],
            [
                'name' => 'Nhắc lịch lên video & nộp link nghiệm thu (Zalo cá nhân)',
                'type' => 'custom',
                'channel' => 'zalo_personal',
                'subject' => 'Nhắc lịch lên video',
                'content_template' => "Chào bạn {creator_name}, bên mình thấy bạn đã nhận được sản phẩm {product_name} của chiến dịch {campaign_name} rồi nè.\n\nBạn sắp xếp thời gian quay và lên video đúng deadline giúp team nha. Sau khi đăng video xong, bạn chỉ cần gửi link vào cổng này để team nghiệm thu nhé:\n{portal_link}\n\nCần hỗ trợ bất kỳ điều gì bạn cứ nhắn mình nha!",
                'is_active' => true,
            ],
            [
                'name' => 'Thông báo chính thức qua Zalo OA (ZNS)',
                'type' => 'custom',
                'channel' => 'zalo_oa',
                'subject' => 'Thông báo hợp tác chiến dịch KOL/KOC',
                'content_template' => "Kính gửi {creator_name}, nhãn hàng trân trọng mời bạn tham gia chiến dịch {campaign_name} cho sản phẩm {product_name}. Vui lòng truy cập {portal_link} để hoàn tất xác nhận tham gia.",
                'is_active' => true,
            ],
            [
                'name' => 'Nhắc Zalo 1-Chạm: Đôn đốc Hạn nộp Video',
                'type' => 'remind_deadline',
                'channel' => 'zalo_personal',
                'subject' => 'Đôn đốc Hạn nộp Video',
                'content_template' => "Em chào chị {creator_name}, em là {staff_name} bên nhãn hàng {campaign_name} ạ.\n\nVideo trải nghiệm sản phẩm [{product_name}] của chị hiện {deadline_text}. Không biết kịch bản hoặc quá trình trải nghiệm sản phẩm có cần bên em hỗ trợ gì thêm không ạ?\n\nChị tranh thủ lên video sớm giúp nhãn hàng nhé ạ. Sau khi đăng, chị dán link video vào cổng này để bên em đối soát và nghiệm thu nha:\n{portal_link}\n\nCảm ơn chị nhiều ạ!",
                'is_active' => true,
            ],
            [
                'name' => 'Nhắc Zalo 1-Chạm: Nhắc Xác Nhận Đã Nhận Mẫu',
                'type' => 'remind_receipt',
                'channel' => 'zalo_personal',
                'subject' => 'Nhắc Xác Nhận Đã Nhận Mẫu',
                'content_template' => "Em chào chị {creator_name}, gói hàng trải nghiệm [{product_name}] bên em gửi cho chị {sent_date_text} chắc đã đến nơi rồi ạ.\n\nChị kiểm tra xem đã nhận được kiện hàng chưa nhé. Nếu nhận được rồi, chị mở đường link bên dưới bấm 1 chạm 'Đã nhận được hàng' giúp em để hệ thống ghi nhận và đếm ngược ngày lên video nha:\n{portal_link}\n\nChúc chị một ngày làm việc tràn đầy năng lượng ạ!",
                'is_active' => true,
            ],
            [
                'name' => 'Nhắc Zalo 1-Chạm: Gửi Brief Kịch Bản & Chào Mời',
                'type' => 'brief_outreach',
                'channel' => 'zalo_personal',
                'subject' => 'Gửi Brief Kịch Bản & Chào Mời',
                'content_template' => "Em chào chị {creator_name}, em là {staff_name} từ nhãn hàng {campaign_name} ạ.\n\nBên em đang có chiến dịch trải nghiệm sản phẩm [{product_name}] rất hợp với phong cách kênh của chị. Nhãn hàng xin gửi tặng chị 01 phần quà mẫu trải nghiệm kèm hoa hồng hấp dẫn.\n\nChị xem qua kịch bản & xác nhận địa chỉ nhận hàng tại đường link riêng này nhé:\n{portal_link}\n\nHashtag chiến dịch: {hashtags}\n{discount_code}\n\nRất hy vọng có cơ hội hợp tác cùng chị!",
                'is_active' => true,
            ],
            [
                'name' => 'Nhắc Zalo 1-Chạm: Thông Báo Đã Chuyển Đơn Gửi Mẫu',
                'type' => 'shipping_notice',
                'channel' => 'zalo_personal',
                'subject' => 'Thông Báo Đã Chuyển Đơn Gửi Mẫu',
                'content_template' => "Em chào chị {creator_name}, bên em đã nhận được địa chỉ nhận hàng của chị rồi ạ. Bộ phận kho đang chuẩn bị gói hàng trải nghiệm [{product_name}] và chuyển đi cho chị sớm nhất.\n\nKhi nào nhận được kiện hàng, chị mở lại link này bấm xác nhận giúp em nhé:\n{portal_link}\n\nEm cảm ơn chị nhiều ạ!",
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
