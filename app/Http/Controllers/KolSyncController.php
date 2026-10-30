<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Jobs\SyncKolProfileJob;
use App\Services\Kol\PlaywrightNetworkConnector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Modules\Creator\Models\CreatorAccount;

class KolSyncController extends Controller
{
    public function __construct(
        protected PlaywrightNetworkConnector $connector
    ) {}

    /**
     * API tiếp nhận hàng loạt URL để đồng bộ tự động qua Playwright Network Interception
     *
     * Route: POST /api/kols/batch-sync
     * Payload:
     * {
     *    "urls": ["https://www.tiktok.com/@creator1", "https://vt.tiktok.com/xxxx/"],
     *    "platform": "tiktok", // hoặc shopee, kalodata
     *    "force": false // true: bỏ qua cache 24h và ép buộc quét lại
     * }
     */
    public function batchSync(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'urls' => ['required_without:file'],
            'platform' => ['nullable', 'string', 'in:tiktok,shopee,kalodata'],
            'force' => ['nullable', 'boolean'],
            'file' => ['nullable', 'file', 'mimes:csv,txt,xlsx,xls'],
        ], [
            'urls.required_without' => 'Vui lòng cung cấp danh sách URLs hoặc tải lên file.',
            'platform.in' => 'Nền tảng hỗ trợ: tiktok, shopee, kalodata.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu đầu vào không hợp lệ.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $platform = strtolower((string) $request->input('platform', 'tiktok'));
        $force = (bool) $request->boolean('force', false);

        // 1. Thu thập danh sách URLs từ request hoặc file tải lên
        $rawUrls = $this->extractUrlsFromRequest($request);
        if (empty($rawUrls)) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy URL hợp lệ nào để đồng bộ.',
            ], 422);
        }

        $dispatched = [];
        $skippedCached = [];
        $invalidUrls = [];

        // 2. Duyệt qua từng URL và áp dụng cơ chế Cache 24h
        $dispatchIndex = 0;
        foreach ($rawUrls as $rawUrl) {
            $rawUrl = trim($rawUrl);
            if (empty($rawUrl) || !filter_var($rawUrl, FILTER_VALIDATE_URL)) {
                $invalidUrls[] = $rawUrl;
                continue;
            }

            // Chuẩn hóa và làm sạch URL
            $normalizedUrl = $this->connector->resolveFinalUrl($rawUrl);

            // Kiểm tra cache 24h:
            // Điều kiện: Chưa tới 24h kể từ lần đồng bộ cuối cùng VÀ không có cờ force
            $isCached = false;
            $existingAccount = null;

            if (!$force) {
                // Kiểm tra bảng creator_accounts
                $existingAccount = CreatorAccount::where('url', $normalizedUrl)
                    ->orWhere('url', $rawUrl)
                    ->first();

                if ($existingAccount && $existingAccount->last_synced_at) {
                    $hoursSinceLastSync = now()->diffInHours($existingAccount->last_synced_at);
                    if ($hoursSinceLastSync < 24) {
                        $isCached = true;
                    }
                }

                // Kiểm tra thêm Redis Cache key
                $cacheKey = "kol_sync_lock:{$platform}:" . md5($normalizedUrl);
                if (Cache::has($cacheKey)) {
                    $isCached = true;
                }
            }

            if ($isCached && !$force) {
                $skippedCached[] = [
                    'url' => $rawUrl,
                    'normalized_url' => $normalizedUrl,
                    'last_synced_at' => $existingAccount?->last_synced_at?->toIso8601String(),
                    'reason' => 'Đã được đồng bộ trong vòng 24 giờ qua. Sử dụng force=true để ép quét lại.',
                ];
                continue;
            }

            // 3. Rải đều thời gian chạy Job (Staggered Delay: mỗi job cách nhau 4 giây)
            // Giúp chạy mượt mà trên 1 VPS/Local Worker mà không bị chặn Rate Limit
            $delaySeconds = $dispatchIndex * 4;
            $dispatchTime = now()->addSeconds($delaySeconds);

            // Đẩy vào Queue kol-network-sync
            SyncKolProfileJob::dispatch(
                $normalizedUrl,
                $platform,
                $existingAccount?->creator_id,
                $force
            )->delay($dispatchTime);

            // Lưu lock cache tạm trong 24h nếu job được dispatch
            Cache::put("kol_sync_lock:{$platform}:" . md5($normalizedUrl), true, now()->addHours(24));

            $dispatched[] = [
                'url' => $rawUrl,
                'normalized_url' => $normalizedUrl,
                'delay_seconds' => $delaySeconds,
                'estimated_run_at' => $dispatchTime->toIso8601String(),
            ];

            $dispatchIndex++;
        }

        return response()->json([
            'success' => true,
            'message' => "Đã tiếp nhận {$dispatchIndex} tài khoản vào hàng đợi đồng bộ tự động.",
            'data' => [
                'total_received' => count($rawUrls),
                'dispatched_count' => count($dispatched),
                'skipped_cached_count' => count($skippedCached),
                'invalid_count' => count($invalidUrls),
                'stagger_interval_seconds' => 4,
                'dispatched' => $dispatched,
                'skipped_cached' => $skippedCached,
                'invalid_urls' => $invalidUrls,
            ],
        ], 200);
    }

    /**
     * Trích xuất danh sách URLs từ request JSON, textarea hoặc file CSV
     *
     * @return array<int, string>
     */
    protected function extractUrlsFromRequest(Request $request): array
    {
        $urls = [];

        // Trường hợp 1: Nhận mảng JSON từ input 'urls'
        $inputUrls = $request->input('urls');
        if (is_array($inputUrls)) {
            $urls = array_merge($urls, $inputUrls);
        } elseif (is_string($inputUrls)) {
            // Trường hợp 2: Dán chuỗi nhiều dòng từ textarea
            $lines = preg_split('/[\r\n,]+/', $inputUrls);
            if ($lines !== false) {
                $urls = array_merge($urls, array_map('trim', $lines));
            }
        }

        // Trường hợp 3: Tải file đính kèm
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            if ($file && $file->isValid()) {
                $content = file_get_contents($file->getRealPath());
                if ($content !== false) {
                    $lines = preg_split('/[\r\n]+/', $content);
                    if ($lines !== false) {
                        foreach ($lines as $line) {
                            $line = trim($line);
                            // Tìm URL trong dòng CSV
                            if (preg_match('/https?:\/\/[^\s,"]+/i', $line, $matches)) {
                                $urls[] = $matches[0];
                            }
                        }
                    }
                }
            }
        }

        // Loại bỏ trùng lặp và chuỗi rỗng
        return array_values(array_unique(array_filter($urls, fn ($u) => !empty(trim((string) $u)))));
    }
}

