<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// 1. Quét và đồng bộ chỉ số bài đăng video đã nghiệm thu hằng đêm vào lúc 02:00
Schedule::command('content:sync-metrics')
    ->dailyAt('02:00')
    ->withoutOverlapping(60)
    ->runInBackground();

// 2. Tự động quét và làm mới chỉ số Creator quá hạn 7 ngày vào sáng thứ Hai lúc 03:00
Schedule::command('kol:auto-refresh --days=7 --limit=150')
    ->weeklyOn(1, '03:00')
    ->withoutOverlapping(120)
    ->runInBackground();

// 3. Quét và gửi thông báo đôn đốc deadline nộp video vào mỗi 08:00 sáng
Schedule::command('campaigns:check-deadlines')
    ->dailyAt('08:00')
    ->withoutOverlapping(30)
    ->runInBackground();

// 4. Tự động dọn dẹp các tệp tạm (temp_imports, testing, logs cũ) hằng ngày vào lúc 03:30
Schedule::command('system:clean-temp-files --hours=24 --days=7')
    ->dailyAt('03:30')
    ->withoutOverlapping(15)
    ->runInBackground();

/**
 * Command dọn dẹp tệp tạm và dữ liệu thừa định kỳ
 */
Artisan::command('system:clean-temp-files {--hours=24 : Số giờ giữ lại tệp import tạm} {--days=7 : Số ngày giữ lại tệp log sync}', function () {
    $hours = (int) $this->option('hours');
    $days = (int) $this->option('days');
    $now = time();
    $deletedFiles = 0;
    $freedBytes = 0;

    // 1. Dọn dẹp tệp import tạm trong storage/app/temp_imports
    $tempImportsDir = storage_path('app/temp_imports');
    if (is_dir($tempImportsDir)) {
        $files = scandir($tempImportsDir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || $file === '.gitignore') {
                continue;
            }
            $filePath = $tempImportsDir . DIRECTORY_SEPARATOR . $file;
            if (is_file($filePath)) {
                $mtime = filemtime($filePath);
                if ($mtime !== false && ($now - $mtime) > ($hours * 3600)) {
                    $size = filesize($filePath) ?: 0;
                    if (@unlink($filePath)) {
                        $deletedFiles++;
                        $freedBytes += $size;
                    }
                }
            }
        }
    }

    // 2. Dọn dẹp tệp log đồng bộ cũ trong storage/logs
    $logsDir = storage_path('logs');
    if (is_dir($logsDir)) {
        $logFiles = glob($logsDir . DIRECTORY_SEPARATOR . 'kol-sync-*.log') ?: [];
        foreach ($logFiles as $logFile) {
            $mtime = filemtime($logFile);
            if ($mtime !== false && ($now - $mtime) > ($days * 86400)) {
                $size = filesize($logFile) ?: 0;
                if (@unlink($logFile)) {
                    $deletedFiles++;
                    $freedBytes += $size;
                }
            }
        }
    }

    // 3. Dọn dẹp tệp rác testing trong storage/framework/testing
    $testingDir = storage_path('framework/testing');
    if (is_dir($testingDir)) {
        $testFiles = scandir($testingDir);
        foreach ($testFiles as $file) {
            if ($file === '.' || $file === '..' || $file === '.gitignore') {
                continue;
            }
            $filePath = $testingDir . DIRECTORY_SEPARATOR . $file;
            if (is_file($filePath)) {
                $size = filesize($filePath) ?: 0;
                if (@unlink($filePath)) {
                    $deletedFiles++;
                    $freedBytes += $size;
                }
            }
        }
    }

    $freedKb = round($freedBytes / 1024, 2);
    $this->info("Dọn dẹp thành công: đã xóa {$deletedFiles} tệp tạm, giải phóng {$freedKb} KB.");
})->purpose('Dọn dẹp các tệp tạm, tệp import cũ và log định kỳ để tối ưu dung lượng hệ thống');

