import React from 'react';

export interface ApplicationLogoProps {
    className?: string;
    variant?: 'icon' | 'full';
    theme?: 'light' | 'dark';
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function ApplicationLogo({
    className = '',
    variant = 'full',
    theme = 'dark',
    size = 'md',
}: ApplicationLogoProps) {
    const sizeConfig = {
        sm: {
            box: 'h-8 w-8',
            title: 'text-sm',
            subtitle: 'text-[9px]',
        },
        md: {
            box: 'h-10 w-10',
            title: 'text-base',
            subtitle: 'text-[10px]',
        },
        lg: {
            box: 'h-12 w-12',
            title: 'text-lg',
            subtitle: 'text-xs',
        },
        xl: {
            box: 'h-14 w-14',
            title: 'text-xl',
            subtitle: 'text-xs',
        },
    };

    const cfg = sizeConfig[size] || sizeConfig.md;

    return (
        <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
            {/* Brand Logo */}
            <div
                className={`relative flex ${cfg.box} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 p-0.5`}
            >
                <img
                    src="/images/logo.png"
                    alt="KOL Booking Logo"
                    className="h-full w-full object-cover rounded-[inherit]"
                />
            </div>

            {/* Typography Lockup */}
            {variant === 'full' && (
                <div className="flex flex-col text-left">
                    <span
                        className={`font-bold tracking-tight leading-tight ${
                            theme === 'light' ? 'text-white' : 'text-slate-900'
                        } ${cfg.title}`}
                    >
                        KOL Booking
                    </span>
                    <span
                        className={`font-semibold uppercase tracking-wider ${
                            theme === 'light' ? 'text-primary-300' : 'text-primary-600'
                        } ${cfg.subtitle}`}
                    >
                        Doanh Nghiệp
                    </span>
                </div>
            )}
        </div>
    );
}
