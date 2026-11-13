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
