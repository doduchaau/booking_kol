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
            // Composite index hỗ trợ lọc nhanh Action Center và đếm ngược deadline
            $table->index(['status', 'sample_received_at'], 'idx_cc_status_sample_received');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_creators', function (Blueprint $table) {
            $table->dropIndex('idx_cc_status_sample_received');
        });
    }
};

