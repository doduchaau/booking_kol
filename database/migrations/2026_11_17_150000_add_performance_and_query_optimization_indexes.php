<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Bổ sung chỉ mục (Indexing) tối ưu hóa truy vấn, tăng tốc độ phản hồi request trên toàn hệ thống
     */
    public function up(): void
    {
        // 1. Tối ưu truy vấn đếm thông báo chưa đọc và polling định kỳ
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(['notifiable_type', 'notifiable_id', 'read_at', 'created_at'], 'idx_notifications_unread_lookup');
            });
        }

        // 2. Tối ưu truy vấn Campaign Creator (Workspace, Action Center, Kanban)
        if (Schema::hasTable('campaign_creators')) {
            Schema::table('campaign_creators', function (Blueprint $table) {
                $table->index('status', 'idx_cc_status');
                $table->index('updated_at', 'idx_cc_updated_at');
                $table->index(['status', 'sample_received_at'], 'idx_cc_status_sample_rcv');
                $table->index(['status', 'address_confirmed_at'], 'idx_cc_status_addr_conf');
            });
        }

        // 3. Tối ưu tìm kiếm và tra cứu tài khoản mạng xã hội của Creator
        if (Schema::hasTable('creator_accounts')) {
            Schema::table('creator_accounts', function (Blueprint $table) {
                $table->index('handle', 'idx_ca_handle');
                $table->index('url', 'idx_ca_url');
            });
        }

        // 4. Tối ưu tìm kiếm và kiểm tra trùng lặp hồ sơ Creator
        if (Schema::hasTable('creators')) {
            Schema::table('creators', function (Blueprint $table) {
                $table->index('email', 'idx_creators_email');
                $table->index('phone', 'idx_creators_phone');
            });
        }

        // 5. Tối ưu phân trang và sắp xếp tin nhắn Outreach
        if (Schema::hasTable('outreach_messages')) {
            Schema::table('outreach_messages', function (Blueprint $table) {
                $table->index('sent_at', 'idx_om_sent_at');
                $table->index('status', 'idx_om_status');
            });
        }

        // 6. Tối ưu danh sách từ chối nhận tin
        if (Schema::hasTable('opt_outs')) {
            Schema::table('opt_outs', function (Blueprint $table) {
                $table->index('requested_at', 'idx_optouts_requested_at');
            });
        }

        // 7. Tối ưu danh sách và thống kê nhóm trao đổi KOC
        if (Schema::hasTable('group_invites')) {
            Schema::table('group_invites', function (Blueprint $table) {
                $table->index('campaign_creator_id', 'idx_gi_campaign_creator_id');
                $table->index(['status', 'created_at'], 'idx_gi_status_created');
            });
        }

        // 8. Tối ưu liên kết tính chi phí mẫu trong Báo cáo tài chính & ROI
        if (Schema::hasTable('campaign_creator_products')) {
            Schema::table('campaign_creator_products', function (Blueprint $table) {
                $table->index('campaign_product_id', 'idx_ccp_campaign_product_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('campaign_creator_products')) {
            Schema::table('campaign_creator_products', function (Blueprint $table) {
                $table->dropIndex('idx_ccp_campaign_product_id');
            });
        }

        if (Schema::hasTable('group_invites')) {
            Schema::table('group_invites', function (Blueprint $table) {
                $table->dropIndex('idx_gi_campaign_creator_id');
                $table->dropIndex('idx_gi_status_created');
            });
        }

        if (Schema::hasTable('opt_outs')) {
            Schema::table('opt_outs', function (Blueprint $table) {
                $table->dropIndex('idx_optouts_requested_at');
            });
        }

        if (Schema::hasTable('outreach_messages')) {
            Schema::table('outreach_messages', function (Blueprint $table) {
                $table->dropIndex('idx_om_sent_at');
                $table->dropIndex('idx_om_status');
            });
        }

        if (Schema::hasTable('creators')) {
            Schema::table('creators', function (Blueprint $table) {
                $table->dropIndex('idx_creators_email');
                $table->dropIndex('idx_creators_phone');
            });
        }

        if (Schema::hasTable('creator_accounts')) {
            Schema::table('creator_accounts', function (Blueprint $table) {
                $table->dropIndex('idx_ca_handle');
                $table->dropIndex('idx_ca_url');
            });
        }

        if (Schema::hasTable('campaign_creators')) {
            Schema::table('campaign_creators', function (Blueprint $table) {
                $table->dropIndex('idx_cc_status');
                $table->dropIndex('idx_cc_updated_at');
                $table->dropIndex('idx_cc_status_sample_rcv');
                $table->dropIndex('idx_cc_status_addr_conf');
            });
        }

        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndex('idx_notifications_unread_lookup');
            });
        }
    }
};
