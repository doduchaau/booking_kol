import React, { ReactNode } from 'react';

export type BadgeVariant =
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | 'cyan';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    icon?: ReactNode;
    className?: string;
}

export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    dot = false,
    icon,
    className = '',
}: BadgeProps) {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs font-medium gap-1',
        md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
    };

    const variantClasses = {
        default: 'bg-slate-100 text-slate-700 border-slate-200',
        primary: 'bg-primary-50 text-primary-700 border-primary-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-rose-50 text-rose-700 border-rose-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    };

    const dotClasses = {
        default: 'bg-slate-400',
        primary: 'bg-primary-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-rose-500',
        info: 'bg-blue-500',
        purple: 'bg-purple-500',
        cyan: 'bg-cyan-500',
    };

    return (
        <span
            className={`inline-flex items-center rounded-md border ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        >
            {dot && (
                <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClasses[variant]}`}
                />
            )}
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
        </span>
    );
}
