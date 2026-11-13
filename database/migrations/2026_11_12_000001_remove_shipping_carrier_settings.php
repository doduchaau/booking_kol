<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Settings\Models\Setting;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Xóa sạch các cấu hình vận chuyển/vận đơn thừa khỏi bảng settings theo quy chuẩn Không Vận Đơn
     */
    public function up(): void
    {
        if (Schema::hasTable('settings')) {
            // Xóa các cài đặt hãng vận chuyển thừa
            DB::table('settings')
                ->whereIn('key', ['ghn_token', 'ghn_shop_id', 'ghtk_token'])
                ->orWhere('group', 'carrier')
                ->delete();

            // Khởi tạo ghi chú xuất mẫu mặc định nếu chưa có
            if (!Setting::where('key', 'default_sample_shipping_note')->exists()) {
                Setting::set(
                    'default_sample_shipping_note',
                    'Hàng mẫu tặng KOC quay video review - Không thu tiền COD',
                    'general'
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Tuân thủ triệt để Quy tắc Không Vận Đơn: Tuyệt đối không khôi phục cấu hình hãng vận chuyển
    }
};

