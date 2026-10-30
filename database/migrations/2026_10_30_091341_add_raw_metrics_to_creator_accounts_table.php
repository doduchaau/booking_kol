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
            if (!Schema::hasColumn('creator_accounts', 'raw_metrics')) {
                $table->json('raw_metrics')->nullable()->after('sync_error_message')->comment('Payload viễn trắc JSON mở rộng từ XHR Network Interception');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('creator_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('creator_accounts', 'raw_metrics')) {
                $table->dropColumn('raw_metrics');
            }
        });
    }
};
