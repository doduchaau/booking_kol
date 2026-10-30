import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    actionHref?: string;
    children?: ReactNode;
    className?: string;
}

export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    actionHref,
    children,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center ${className}`}
        >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-4">
                {icon || <Inbox className="h-7 w-7 text-slate-400" />}
            </div>

            <h3 className="text-base font-semibold text-slate-900">{title}</h3>

            {description && (
                <p className="mt-1.5 max-w-sm text-sm text-slate-500 leading-relaxed">
                    {description}
                </p>
            )}

            {children && <div className="mt-4">{children}</div>}

            {(actionLabel && (onAction || actionHref)) && (
                <div className="mt-6">
                    {actionHref ? (
                        <a
                            href={actionHref}
                            className="inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg gap-2 px-3.5 py-2 text-sm bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
                        >
                            {actionLabel}
                        </a>
                    ) : (
                        <Button variant="primary" onClick={onAction}>
                            {actionLabel}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
