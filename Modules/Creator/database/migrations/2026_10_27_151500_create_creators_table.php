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
        Schema::create('creators', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->comment('Tên thật hoặc nghệ danh');
            $table->string('phone', 20)->nullable()->comment('Số điện thoại chuẩn hóa 10 số');
            $table->string('email', 150)->nullable();
            $table->string('shipping_address', 255)->nullable()->comment('Địa chỉ giao hàng');
            $table->string('city_province', 100)->nullable();
            $table->string('district', 100)->nullable();
            $table->string('ward', 100)->nullable();
            $table->string('niche', 100)->default('general')->comment('Ngành hàng: beauty, tech, food, etc.');
            $table->enum('tier', ['nano', 'micro', 'macro', 'mega'])->default('nano');
            $table->unsignedTinyInteger('trust_score')->default(100)->comment('Điểm uy tín (0-100)');
            $table->boolean('blacklist_status')->default(false)->comment('Trạng thái cấm hợp tác');
            $table->text('blacklist_reason')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('merged_into_creator_id')->nullable()->constrained('creators')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['phone', 'deleted_at'], 'uk_creators_phone_deleted');
            $table->index(['tier', 'niche'], 'idx_creators_tier_niche');
            $table->index('blacklist_status', 'idx_creators_blacklist');
            $table->index('trust_score', 'idx_creators_trust_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('creators');
    }
};
