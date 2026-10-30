<?php

namespace Modules\Creator\Enums;

enum CreatorTierEnum: string
{
    case NANO = 'nano';
    case MICRO = 'micro';
    case MACRO = 'macro';
    case MEGA = 'mega';

    public function label(): string
    {
        return match ($this) {
            self::NANO => 'Nano (1K - 10K)',
            self::MICRO => 'Micro (10K - 100K)',
            self::MACRO => 'Macro (100K - 1M)',
            self::MEGA => 'Mega / Celeb (> 1M)',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::NANO => 'bg-slate-100 text-slate-700 border-slate-300',
            self::MICRO => 'bg-blue-100 text-blue-700 border-blue-300',
            self::MACRO => 'bg-purple-100 text-purple-700 border-purple-300',
            self::MEGA => 'bg-rose-100 text-rose-700 border-rose-300 font-semibold',
        };
    }
}
