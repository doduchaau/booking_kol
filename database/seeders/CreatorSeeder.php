<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorRateCard;

class CreatorSeeder extends Seeder
{
    public function run(): void
    {
        // Tạo tài khoản admin mẫu
        $admin = User::firstOrCreate(
            ['email' => 'admin@bookingkol.vn'],
            [
                'name' => 'Nguyễn Quản Trị (Admin)',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $sampleCreators = [
            [
                'name' => 'Nguyễn Minh Anh (Anh Thích Đồ Công Nghệ)',
                'phone' => '0912345678',
                'email' => 'minhanh.tech@gmail.com',
                'shipping_address' => 'Số 15 Ngõ 120 Hoàng Quốc Việt',
                'city_province' => 'Hà Nội',
                'district' => 'Cầu Giấy',
                'niche' => 'tech',
                'tier' => CreatorTierEnum::MICRO,
                'trust_score' => 95,
                'notes' => 'Review đồ gia dụng thông minh và phụ kiện rất kỹ, video chỉnh chu, trả bài đúng hẹn.',
                'accounts' => [
                    [
                        'platform' => PlatformEnum::TIKTOK,
                        'handle' => 'minhanhtechreview',
                        'url' => 'https://tiktok.com/@minhanhtechreview',
                        'followers_count' => 68500,
                        'engagement_rate' => 4.25,
                    ],
                    [
                        'platform' => PlatformEnum::YOUTUBE,
                        'handle' => 'MinhAnhTechStudio',
                        'url' => 'https://youtube.com/@MinhAnhTechStudio',
                        'followers_count' => 22000,
                        'engagement_rate' => 3.10,
                    ],
                ],
                'rates' => [
                    ['content_type' => 'tiktok_video', 'price' => 3500000, 'notes' => '1 video TikTok 60s + link bio 7 ngày'],
                    ['content_type' => 'youtube_video', 'price' => 5000000, 'notes' => '1 video review chi tiết tích hợp 90s'],
                ],
            ],
            [
                'name' => 'Trần Thị Bích Ngọc (Ngọc Skincare Diary)',
                'phone' => '0987654321',
                'email' => 'bichngoc.beauty@gmail.com',
                'shipping_address' => 'Chung cư Masteri Thảo Điền, Tháp T2',
                'city_province' => 'TP. Hồ Chí Minh',
                'district' => 'Thủ Đức',
                'niche' => 'beauty',
                'tier' => CreatorTierEnum::NANO,
                'trust_score' => 90,
                'notes' => 'KOC da nhạy cảm, chuyên test serum và kem chống nắng. Tương tác cao trong comment.',
                'accounts' => [
                    [
                        'platform' => PlatformEnum::TIKTOK,
                        'handle' => 'ngocskincarediary',
                        'url' => 'https://tiktok.com/@ngocskincarediary',
                        'followers_count' => 9200,
                        'engagement_rate' => 6.80,
                    ],
                ],
                'rates' => [
                    ['content_type' => 'tiktok_video', 'price' => 800000, 'notes' => 'Tặng sản phẩm + phí booking mềm'],
                ],
            ],
            [
                'name' => 'Lê Hoàng Long (Long Béo Đi Ăn)',
                'phone' => '0903112233',
                'email' => 'hoanglong.food@gmail.com',
                'shipping_address' => 'Số 88 Lê Duẩn Phường Bến Nghé',
                'city_province' => 'TP. Hồ Chí Minh',
                'district' => 'Quận 1',
                'niche' => 'food',
                'tier' => CreatorTierEnum::MACRO,
                'trust_score' => 85,
                'notes' => 'Review ẩm thực quán ăn và đồ ăn vặt đóng gói. Lượng tương tác khủng nhưng lịch quay bận.',
                'accounts' => [
                    [
                        'platform' => PlatformEnum::TIKTOK,
                        'handle' => 'longbeodian',
                        'url' => 'https://tiktok.com/@longbeodian',
                        'followers_count' => 450000,
                        'engagement_rate' => 5.40,
                    ],
                    [
                        'platform' => PlatformEnum::FACEBOOK,
                        'handle' => 'LongBeoFoodReview',
                        'url' => 'https://facebook.com/LongBeoFoodReview',
                        'followers_count' => 280000,
                        'engagement_rate' => 3.80,
                    ],
                ],
                'rates' => [
                    ['content_type' => 'tiktok_video', 'price' => 12000000, 'notes' => 'Video review tại quán hoặc studio'],
                    ['content_type' => 'facebook_post', 'price' => 6000000, 'notes' => 'Bài viết kèm 5 ảnh chất lượng cao'],
                ],
            ],
        ];

        foreach ($sampleCreators as $item) {
            $creator = Creator::updateOrCreate(
                ['phone' => $item['phone']],
                [
                    'name' => $item['name'],
                    'email' => $item['email'],
                    'shipping_address' => $item['shipping_address'],
                    'city_province' => $item['city_province'],
                    'district' => $item['district'],
                    'niche' => $item['niche'],
                    'tier' => $item['tier'],
                    'trust_score' => $item['trust_score'],
                    'notes' => $item['notes'],
                    'created_by' => $admin->id,
                ]
            );

            foreach ($item['accounts'] as $acc) {
                CreatorAccount::updateOrCreate(
                    [
                        'creator_id' => $creator->id,
                        'platform' => $acc['platform'],
                        'handle' => $acc['handle'],
                    ],
                    [
                        'url' => $acc['url'],
                        'followers_count' => $acc['followers_count'],
                        'engagement_rate' => $acc['engagement_rate'],
                        'data_source' => 'manual',
                    ]
                );
            }

            foreach ($item['rates'] as $rate) {
                CreatorRateCard::updateOrCreate(
                    [
                        'creator_id' => $creator->id,
                        'content_type' => $rate['content_type'],
                    ],
                    [
                        'price' => $rate['price'],
                        'notes' => $rate['notes'],
                    ]
                );
            }
        }
    }
}
