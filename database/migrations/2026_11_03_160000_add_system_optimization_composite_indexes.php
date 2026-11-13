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
            $table->index(['portal_token', 'portal_token_expires_at'], 'idx_cc_portal_token_lookup');
            $table->index(['assigned_to', 'status'], 'idx_cc_assigned_status');
        });

        Schema::table('creators', function (Blueprint $table) {
            $table->index('merged_into_creator_id', 'idx_creators_merged_id');
            $table->index('name', 'idx_creators_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->dropIndex('idx_cc_portal_token_lookup');
            $table->dropIndex('idx_cc_assigned_status');
        });

        Schema::table('creators', function (Blueprint $table) {
            $table->dropIndex('idx_creators_merged_id');
            $table->dropIndex('idx_creators_name');
        });
    }
};

