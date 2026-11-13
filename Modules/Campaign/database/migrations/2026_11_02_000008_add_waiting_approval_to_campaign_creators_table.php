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
        // 1. Cập nhật ENUM status trên MySQL nếu đang dùng MySQL
        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE `campaign_creators` 
                MODIFY COLUMN `status` ENUM(
                    'new',
                    'contacted',
                    'waiting_approval',
                    'agreed',
                    'address_confirmed',
                    'sample_sent',
                    'sample_received',
                    'posted',
                    'completed',
                    'declined',
                    'no_show'
                ) NOT NULL DEFAULT 'new'
            ");
        }

        // 2. Bổ sung các cột lưu vết phê duyệt chi phí cast
        Schema::table('campaign_creators', function (Blueprint $table) {
            if (!Schema::hasColumn('campaign_creators', 'waiting_approval_at')) {
                $table->timestamp('waiting_approval_at')->nullable()->after('contacted_at')->comment('Thời điểm chuyển sang chờ duyệt chi phí');
            }
            if (!Schema::hasColumn('campaign_creators', 'approved_cost_at')) {
                $table->timestamp('approved_cost_at')->nullable()->after('waiting_approval_at')->comment('Thời điểm xác nhận đã được duyệt chi phí');
            }
            if (!Schema::hasColumn('campaign_creators', 'approver_name')) {
                $table->string('approver_name', 150)->nullable()->after('approved_cost_at')->comment('Tên người duyệt');
            }
            if (!Schema::hasColumn('campaign_creators', 'approval_notes')) {
                $table->text('approval_notes')->nullable()->after('approver_name')->comment('Ghi chú khi duyệt chi phí');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_creators', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['waiting_approval_at', 'approved_cost_at', 'approver_name', 'approval_notes'] as $col) {
                if (Schema::hasColumn('campaign_creators', $col)) {
                    $columnsToDrop[] = $col;
                }
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE `campaign_creators` 
                MODIFY COLUMN `status` ENUM(
                    'new',
                    'contacted',
                    'agreed',
                    'address_confirmed',
                    'sample_sent',
                    'sample_received',
                    'posted',
                    'completed',
                    'declined',
                    'no_show'
                ) NOT NULL DEFAULT 'new'
            ");
        }
    }
};

