<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->json('target_platforms')
                ->nullable()
                ->after('product_sku')
                ->comment('Danh sách các nền tảng mục tiêu của chiến dịch (tiktok, facebook, shopee, youtube, instagram)');
        });

        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->json('booking_platforms')
                ->nullable()
                ->after('collaboration_type')
                ->comment('Danh sách các nền tảng KOC cam kết/được book thực hiện trong chiến dịch');
        });

        // Cập nhật dữ liệu mặc định cho các bản ghi đã có
        try {
            DB::table('campaigns')
                ->whereNull('target_platforms')
                ->update(['target_platforms' => json_encode(['tiktok'])]);

            DB::table('campaign_creators')
                ->whereNull('booking_platforms')
                ->update(['booking_platforms' => json_encode(['tiktok'])]);
        } catch (\Throwable $e) {
            // Bỏ qua nếu môi trường test không có DB
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('target_platforms');
        });

        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->dropColumn('booking_platforms');
        });
    }
};
