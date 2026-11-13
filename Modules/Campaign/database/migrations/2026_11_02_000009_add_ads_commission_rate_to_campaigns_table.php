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
        Schema::table('campaigns', function (Blueprint $table) {
            if (!Schema::hasColumn('campaigns', 'ads_commission_rate')) {
                $table->decimal('ads_commission_rate', 5, 2)
                    ->default(0.00)
                    ->after('commission_rate')
                    ->comment('% hoa hồng khi nhãn hàng chạy quảng cáo ads');
            }
        });

        Schema::table('campaign_creators', function (Blueprint $table) {
            if (!Schema::hasColumn('campaign_creators', 'ads_commission_rate')) {
                $table->decimal('ads_commission_rate', 5, 2)
                    ->nullable()
                    ->after('commission_rate')
                    ->comment('% hoa hồng ads thỏa thuận riêng cho KOC');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            if (Schema::hasColumn('campaigns', 'ads_commission_rate')) {
                $table->dropColumn('ads_commission_rate');
            }
        });

        Schema::table('campaign_creators', function (Blueprint $table) {
            if (Schema::hasColumn('campaign_creators', 'ads_commission_rate')) {
                $table->dropColumn('ads_commission_rate');
            }
        });
    }
};

