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
        Schema::table('outreach_templates', function (Blueprint $table) {
            $table->string('type', 50)->nullable()->default('custom')->after('name')->comment('Phân loại mẫu tin: remind_deadline, remind_receipt, brief_outreach, shipping_notice, custom');
            $table->index('type', 'idx_outreach_templates_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outreach_templates', function (Blueprint $table) {
            $table->dropIndex('idx_outreach_templates_type');
            $table->dropColumn('type');
        });
    }
};

