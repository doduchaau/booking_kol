<?php

namespace Modules\Content\Console;

use Illuminate\Console\Command;
use Modules\Content\Models\ContentPost;
use Modules\Content\Services\ContentMetricsSyncService;

class SyncPostMetricsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'content:sync-metrics {--post= : ID của video cụ thể cần đồng bộ}';

    /**
     * The console command description.
     */
    protected $description = 'Đồng bộ chỉ số (Views, Likes, Comments, GMV) cho các video bài đăng đã nghiệm thu';

    /**
     * Execute the console command.
     */
    public function handle(ContentMetricsSyncService $syncService): int
    {
        $postId = $this->option('post');

        if ($postId) {
            $post = ContentPost::find($postId);
            if (!$post) {
                $this->error("Không tìm thấy ContentPost #{$postId}.");
                return 1;
            }

            $this->info("Đang đồng bộ chỉ số cho ContentPost #{$post->id} ({$post->platform})...");
            $result = $syncService->syncPost($post);
            $this->info("Thành công! Views: {$result['post']->views_count}, Likes: {$result['post']->likes_count}, GMV: " . number_format($result['post']->gmv_amount, 0, ',', '.') . " đ");
            return 0;
        }

        $this->info("Bắt đầu quét đồng bộ toàn bộ video đang hoạt động...");
        $count = $syncService->syncAllActivePosts();
        $this->info("Đã hoàn tất đồng bộ chỉ số cho {$count} video.");

        return 0;
    }
}
