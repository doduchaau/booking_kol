<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Khống chế tần suất gọi Social Data Provider tối đa 60 request/phút
        \Illuminate\Support\Facades\RateLimiter::for('social-data-provider', function ($job) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(60)->by('provider-global-quota');
        });
    }
}
