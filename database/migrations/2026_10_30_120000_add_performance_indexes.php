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
        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->index(['campaign_id', 'assigned_to', 'status'], 'idx_cc_camp_assign_status');
            $table->index(['created_at', 'campaign_id'], 'idx_cc_created_camp');
        });

        Schema::table('content_posts', function (Blueprint $table) {
            $table->index(['campaign_creator_id', 'status', 'posted_at'], 'idx_posts_cc_status_posted');
            $table->index(['posted_at', 'status'], 'idx_posts_posted_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->dropIndex('idx_cc_camp_assign_status');
            $table->dropIndex('idx_cc_created_camp');
        });

        Schema::table('content_posts', function (Blueprint $table) {
            $table->dropIndex('idx_posts_cc_status_posted');
            $table->dropIndex('idx_posts_posted_status');
        });
    }
};

