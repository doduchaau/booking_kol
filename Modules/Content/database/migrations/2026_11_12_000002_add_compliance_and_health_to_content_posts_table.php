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
        if (Schema::hasTable('content_posts')) {
            Schema::table('content_posts', function (Blueprint $table) {
                if (!Schema::hasColumn('content_posts', 'compliance_status')) {
                    $table->enum('compliance_status', ['passed', 'warning', 'failed', 'not_checked'])
                        ->default('not_checked')
                        ->after('status')
                        ->comment('Trạng thái tuân thủ kịch bản');
                }

                if (!Schema::hasColumn('content_posts', 'compliance_score')) {
                    $table->unsignedTinyInteger('compliance_score')
                        ->default(0)
                        ->after('compliance_status')
                        ->comment('Điểm tuân thủ từ 0 đến 100');
                }

                if (!Schema::hasColumn('content_posts', 'compliance_checklist')) {
                    $table->json('compliance_checklist')
                        ->nullable()
                        ->after('compliance_score')
                        ->comment('Chi tiết kết quả kiểm tra từng tiêu chí');
                }

                if (!Schema::hasColumn('content_posts', 'raw_caption')) {
                    $table->text('raw_caption')
                        ->nullable()
                        ->after('compliance_checklist')
                        ->comment('Caption gốc của video');
                }

                if (!Schema::hasColumn('content_posts', 'extracted_hashtags')) {
                    $table->json('extracted_hashtags')
                        ->nullable()
                        ->after('raw_caption')
                        ->comment('Danh sách hashtag trích xuất từ video');
                }

                if (!Schema::hasColumn('content_posts', 'compliance_checked_at')) {
                    $table->timestamp('compliance_checked_at')
                        ->nullable()
                        ->after('extracted_hashtags');
                }

                if (!Schema::hasColumn('content_posts', 'health_status')) {
                    $table->enum('health_status', ['healthy', 'warning', 'unavailable', 'unknown'])
                        ->default('healthy')
                        ->after('compliance_checked_at')
                        ->comment('Tình trạng hoạt động của video');
                }

                if (!Schema::hasColumn('content_posts', 'health_error_message')) {
                    $table->string('health_error_message', 255)
                        ->nullable()
                        ->after('health_status')
                        ->comment('Mô tả nguyên nhân nếu video bị lỗi');
                }

                if (!Schema::hasColumn('content_posts', 'health_last_checked_at')) {
                    $table->timestamp('health_last_checked_at')
                        ->nullable()
                        ->after('health_error_message');
                }

                $table->index(['compliance_status', 'health_status'], 'idx_content_compliance_health');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('content_posts')) {
            Schema::table('content_posts', function (Blueprint $table) {
                $table->dropIndex('idx_content_compliance_health');
                $table->dropColumn([
                    'compliance_status',
                    'compliance_score',
                    'compliance_checklist',
                    'raw_caption',
                    'extracted_hashtags',
                    'compliance_checked_at',
                    'health_status',
                    'health_error_message',
                    'health_last_checked_at',
                ]);
            });
        }
    }
};

