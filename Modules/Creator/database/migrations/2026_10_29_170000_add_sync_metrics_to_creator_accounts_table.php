<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('creator_accounts', function (Blueprint $table) {
            $table->timestamp('last_synced_at')->nullable()->after('last_metrics_updated_at')->index();
            $table->string('sync_status', 30)->default('idle')->after('last_synced_at')->comment('idle, pending, syncing, success, failed');
            $table->text('sync_error_message')->nullable()->after('sync_status');
            $table->unsignedInteger('average_likes')->default(0)->after('average_views');
            $table->unsignedInteger('average_comments')->default(0)->after('average_likes');
            $table->unsignedInteger('average_shares')->default(0)->after('average_comments');
            $table->decimal('view_engagement_rate', 5, 2)->default(0.00)->after('engagement_rate')->comment('Tỷ lệ tương tác trên lượt xem %');
            $table->unsignedTinyInteger('posts_sample_count')->default(0)->after('view_engagement_rate')->comment('Số lượng bài viết mẫu tính toán (tối đa 15)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('creator_accounts', function (Blueprint $table) {
            $table->dropColumn([
                'last_synced_at',
                'sync_status',
                'sync_error_message',
                'average_likes',
                'average_comments',
                'average_shares',
                'view_engagement_rate',
                'posts_sample_count',
            ]);
        });
    }
};
