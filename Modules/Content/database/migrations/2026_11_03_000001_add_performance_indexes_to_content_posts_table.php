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
        Schema::table('content_posts', function (Blueprint $table) {
            // Composite index hỗ trợ lọc nhanh đồng bộ số liệu bài viết định kỳ
            $table->index(['status', 'posted_at'], 'idx_content_posts_sync');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('content_posts', function (Blueprint $table) {
            $table->dropIndex('idx_content_posts_sync');
        });
    }
};

