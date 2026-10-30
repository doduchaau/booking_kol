<?php

declare(strict_types=1);

namespace App\Services\Kol;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use Throwable;

class PlaywrightNetworkConnector
{
    /**
     * Danh sách domain rút gọn phổ biến cần giải mã
     */
    protected const SHORT_LINK_DOMAINS = [
        'vt.tiktok.com',
        'vm.tiktok.com',
        'shp.ee',
        's.shopee.vn',
        'bit.ly',
        'tinyurl.com',
        't.co',
        'fb.me',
    ];

    /**
     * Bắt gói tin viễn trắc (telemetry) của KOL/KOC qua Playwright Network Interception
     *
     * @param string $url Link trang cá nhân hoặc chi tiết Creator
     * @param string $platform Nền tảng: tiktok, shopee, kalodata
     * @return array<string, mixed> Dữ liệu viễn trắc thu thập được
     * @throws RuntimeException
     */
    public function fetchKolTelemetry(string $url, string $platform = 'tiktok'): array
    {
        $platform = strtolower(trim($platform));
        if (!in_array($platform, ['tiktok', 'shopee', 'kalodata'], true)) {
            $platform = 'tiktok';
        }

        // 1. Phân giải link rút gọn để lấy Final URL sạch
        $cleanUrl = $this->resolveFinalUrl(trim($url));

        // 2. Chuẩn bị câu lệnh gọi Python CLI Engine
        $scriptPath = base_path('scripts/kol_network_inspector.py');
        if (!file_exists($scriptPath)) {
            throw new RuntimeException("Python inspector script không tồn tại tại: {$scriptPath}");
        }

        $pythonBin = (string) config('services.kol_sync.python_path', env('PYTHON_BINARY_PATH', 'python'));
        $proxyUrl = config('services.kol_sync.proxy_url', env('KOL_SYNC_PROXY_URL'));
        $userDataDir = config('services.kol_sync.user_data_dir', env('KOL_SYNC_USER_DATA_DIR'));
        $timeout = (int) config('services.kol_sync.timeout', 45);

        $command = [
            $pythonBin,
            $scriptPath,
            '--url',
            $cleanUrl,
            '--platform',
            $platform,
            '--timeout',
            (string) max($timeout - 5, 10),
        ];

        if (!empty($proxyUrl)) {
            $command[] = '--proxy';
            $command[] = (string) $proxyUrl;
        }

        if (!empty($userDataDir)) {
            $command[] = '--user-data-dir';
            $command[] = (string) $userDataDir;
        }

        $this->logInfo("Bắt đầu khởi chạy Playwright Network Inspector cho [{$platform}] URL: {$cleanUrl}");

        // 3. Thực thi Process an toàn với timeout
        $startTime = microtime(true);
        try {
            $result = Process::timeout($timeout)->run($command);
        } catch (Throwable $e) {
            $this->logError("Lỗi hệ thống khi khởi chạy Playwright Process: {$e->getMessage()}", [
                'url' => $cleanUrl,
                'platform' => $platform,
            ]);
            throw new RuntimeException("Không thể thực thi tiến trình Playwright: {$e->getMessage()}", 0, $e);
        }

        $duration = round(microtime(true) - $startTime, 2);

        // 4. Kiểm tra mã thoát (Exit code)
        if ($result->failed() && empty(trim($result->output()))) {
            $errorOutput = trim($result->errorOutput());
            $this->logError("Playwright Process thất bại (Code: {$result->exitCode()}): {$errorOutput}");
            throw new RuntimeException("Playwright process gặp lỗi: {$errorOutput}");
        }

        // 5. Parse JSON từ STDOUT
        $rawStdout = trim($result->output());
        if (empty($rawStdout)) {
            $stderrOutput = trim($result->errorOutput());
            throw new RuntimeException("Playwright không trả về dữ liệu tại STDOUT. STDERR: {$stderrOutput}");
        }

        /** @var array<string, mixed>|null $parsed */
        $parsed = json_decode($rawStdout, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($parsed)) {
            $this->logError("STDOUT không phải định dạng JSON hợp lệ: {$rawStdout}");
            throw new RuntimeException("Dữ liệu trả về từ Python không phải JSON hợp lệ. Lỗi: " . json_last_error_msg());
        }

        // 6. Kiểm tra cờ thành công từ Python Engine
        if (isset($parsed['success']) && $parsed['success'] === false) {
            $errorMessage = $parsed['error'] ?? 'Lỗi không xác định từ Python Inspector';
            $this->logError("Python Inspector thông báo thất bại: {$errorMessage}", ['url' => $cleanUrl]);
            throw new RuntimeException("Thu thập dữ liệu thất bại: {$errorMessage}");
        }

        $this->logInfo("Thu thập thành công viễn trắc [{$platform}] trong {$duration}s", [
            'url' => $cleanUrl,
            'posts_count' => count($parsed['posts'] ?? []),
            'xhr_count' => count($parsed['xhr_dumps'] ?? []),
        ]);

        $parsed['resolved_url'] = $cleanUrl;
        return $parsed;
    }

    /**
     * Tự động giải mã link rút gọn (Short Link) bằng Http::head/get để lấy URL đích sạch
     */
    public function resolveFinalUrl(string $url): string
    {
        $currentUrl = trim($url);
        if (empty($currentUrl)) {
            return $url;
        }

        $maxHops = 5;
        $hops = 0;

        while ($hops < $maxHops) {
            $host = strtolower((string) parse_url($currentUrl, PHP_URL_HOST));
            $isShortLink = false;

            foreach (self::SHORT_LINK_DOMAINS as $domain) {
                if ($host === $domain || str_ends_with($host, '.' . $domain)) {
                    $isShortLink = true;
                    break;
                }
            }

            if (!$isShortLink) {
                break;
            }

            try {
                // Thử HEAD trước để tiết kiệm băng thông
                $response = Http::withoutRedirecting()
                    ->timeout(8)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'])
                    ->head($currentUrl);

                $redirectUrl = $response->header('Location');

                // Nếu HEAD không trả về redirect header, thử dùng GET
                if (empty($redirectUrl) && in_array($response->status(), [301, 302, 303, 307, 308], true)) {
                    $redirectUrl = $response->header('Location');
                }

                if (empty($redirectUrl)) {
                    $getResponse = Http::withoutRedirecting()
                        ->timeout(8)
                        ->withHeaders(['User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'])
                        ->get($currentUrl);
                    $redirectUrl = $getResponse->header('Location');
                }

                if (!empty($redirectUrl)) {
                    // Nếu là đường dẫn tương đối
                    if (!str_starts_with($redirectUrl, 'http://') && !str_starts_with($redirectUrl, 'https://')) {
                        $parsedHost = parse_url($currentUrl, PHP_URL_SCHEME) . '://' . $host;
                        $redirectUrl = rtrim($parsedHost, '/') . '/' . ltrim($redirectUrl, '/');
                    }
                    $currentUrl = $redirectUrl;
                    $hops++;
                } else {
                    break;
                }
            } catch (Throwable $e) {
                $this->logWarning("Không thể resolve redirect cho URL {$currentUrl}: {$e->getMessage()}");
                break;
            }
        }

        // Làm sạch query parameters rác
        return $this->cleanTrackingParameters($currentUrl);
    }

    /**
     * Loại bỏ các tham số tracking, utm, session rác
     */
    protected function cleanTrackingParameters(string $url): string
    {
        $parts = parse_url($url);
        if (!isset($parts['query'])) {
            return $url;
        }

        parse_str($parts['query'], $queryParams);

        $trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'is_from_webapp', 'sender_device', '_t', '_r',
            'checksum', 'sec_uid', 'share_app_id', 'timestamp',
        ];

        foreach ($trackingParams as $param) {
            unset($queryParams[$param]);
        }

        $scheme = isset($parts['scheme']) ? $parts['scheme'] . '://' : '';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';
        $path = $parts['path'] ?? '';
        $query = !empty($queryParams) ? '?' . http_build_query($queryParams) : '';
        $fragment = isset($parts['fragment']) ? '#' . $parts['fragment'] : '';

        return $scheme . $host . $port . $path . $query . $fragment;
    }

    protected function logInfo(string $message, array $context = []): void
    {
        if (config()->has('logging.channels.kol_sync')) {
            Log::channel('kol_sync')->info("[PlaywrightConnector] {$message}", $context);
        } else {
            Log::info("[PlaywrightConnector] {$message}", $context);
        }
    }

    protected function logWarning(string $message, array $context = []): void
    {
        if (config()->has('logging.channels.kol_sync')) {
            Log::channel('kol_sync')->warning("[PlaywrightConnector] {$message}", $context);
        } else {
            Log::warning("[PlaywrightConnector] {$message}", $context);
        }
    }

    protected function logError(string $message, array $context = []): void
    {
        if (config()->has('logging.channels.kol_sync')) {
            Log::channel('kol_sync')->error("[PlaywrightConnector] {$message}", $context);
        } else {
            Log::error("[PlaywrightConnector] {$message}", $context);
        }
    }
}

