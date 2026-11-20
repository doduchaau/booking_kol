<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('campaign_creator_sample_logs');
        Schema::create('campaign_creator_sample_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_creator_id')
                ->constrained('campaign_creators')
                ->cascadeOnDelete();
            $table->foreignId('sent_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->date('shipped_at')->comment('Ngày gửi mẫu của đợt này');
            $table->text('notes')->nullable()->comment('Ghi chú của đợt gửi mẫu');
            $table->string('shipping_address', 255)->nullable()->comment('Địa chỉ giao hàng lúc gửi');
            $table->string('phone', 30)->nullable()->comment('SĐT nhận hàng lúc gửi');
            $table->string('tracking_code', 100)->nullable()->comment('Mã vận đơn');
            $table->string('carrier_name', 100)->nullable()->comment('Đơn vị vận chuyển');
            $table->json('items')->nullable()->comment('Chi tiết danh sách sản phẩm mẫu gửi đợt này [{product_id, product_name, sku, quantity, variant}]');
            $table->unsignedSmallInteger('total_items_count')->default(0)->comment('Tổng số lượng món hàng gửi trong đợt này');
            $table->timestamps();

            $table->index(['campaign_creator_id', 'shipped_at'], 'idx_cc_sample_logs_cc_id_shipped');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_creator_sample_logs');
    }
};
