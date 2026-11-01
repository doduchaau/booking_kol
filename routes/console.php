<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// 1. Quét và đồng bộ chỉ số bài đăng video đã nghiệm thu hằng đêm vào lúc 02:00
Schedule::command('content:sync-metrics')->dailyAt('02:00');

// 2. Tự động quét và làm mới chỉ số Creator quá hạn 7 ngày vào sáng thứ Hai lúc 03:00
Schedule::command('kol:auto-refresh --days=7 --limit=100')->weeklyOn(1, '03:00');
