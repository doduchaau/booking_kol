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
        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->enum('collaboration_type', ['video', 'livestream', 'both'])
                ->default('video')
                ->after('status')
                ->comment('Phân loại KOC: Lên video, Livestream hay Cả hai');

            $table->unsignedSmallInteger('total_samples_assigned')
                ->default(0)
                ->after('collaboration_type')
                ->comment('Tổng số lượng mẫu dự kiến phát');

            $table->unsignedSmallInteger('total_samples_sent')
                ->default(0)
                ->after('total_samples_assigned')
                ->comment('Tổng số lượng mẫu thực tế đã gửi');

            $table->decimal('live_target_gmv', 14, 2)
                ->default(0.00)
                ->after('total_samples_sent')
                ->comment('Mục tiêu doanh thu cam kết khi live');

            $table->index('collaboration_type');
        });

        // Cập nhật giá trị ban đầu cho các bản ghi cũ
        try {
            $records = DB::table('campaign_creators')->get();
            foreach ($records as $r) {
                $countAssigned = DB::table('campaign_creator_products')
                    ->where('campaign_creator_id', $r->id)
                    ->sum('quantity_assigned');

                $countSent = DB::table('campaign_creator_products')
                    ->where('campaign_creator_id', $r->id)
                    ->sum('quantity_sent');

                DB::table('campaign_creators')
                    ->where('id', $r->id)
                    ->update([
                        'total_samples_assigned' => $countAssigned ?: 1,
                        'total_samples_sent' => $countSent ?: (!is_null($r->sample_sent_at) ? 1 : 0),
                    ]);
            }
        } catch (\Throwable $e) {
            // Ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->dropIndex(['collaboration_type']);
            $table->dropColumn([
                'collaboration_type',
                'total_samples_assigned',
                'total_samples_sent',
                'live_target_gmv',
            ]);
        });
    }
};

