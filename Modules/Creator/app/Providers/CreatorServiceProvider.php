<?php

namespace Modules\Creator\Providers;

use Nwidart\Modules\Support\ModuleServiceProvider;
use Illuminate\Console\Scheduling\Schedule;

class CreatorServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Creator';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'creator';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    protected array $commands = [
        \Modules\Creator\Console\Commands\AutoRefreshCreatorsCommand::class,
    ];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [
        EventServiceProvider::class,
        RouteServiceProvider::class,
    ];

    /**
     * Define module schedules.
     * 
     * @param Schedule $schedule
     */
    protected function configureSchedules(Schedule $schedule): void
    {
        $schedule->command('kol:auto-refresh --days=7 --limit=200')
            ->dailyAt('03:00')
            ->withoutOverlapping();
    }
}
