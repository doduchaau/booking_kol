import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    loadingText?: string;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    iconLeft,
    iconRight,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseClasses =
        'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed select-none';

    const sizeClasses = {
        sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
        md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
        lg: 'px-4 py-2.5 text-base rounded-xl gap-2.5',
    };

    const variantClasses = {
        primary:
            'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500 shadow-sm',
        secondary:
            'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus:ring-primary-500 shadow-sm',
        outline:
            'bg-transparent text-primary-600 border border-primary-600 hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-500',
        danger:
            'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-sm',
        ghost:
            'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-400',
    };

    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        >
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin text-current" />
                    <span>{loadingText || children || 'Đang xử lý...'}</span>
                </>
            ) : (
                <>
                    {iconLeft && <span className="shrink-0">{iconLeft}</span>}
                    {children}
                    {iconRight && <span className="shrink-0">{iconRight}</span>}
                </>
            )}
        </button>
    );
}
