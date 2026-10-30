import React, { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

export interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
    backHref?: string;
    className?: string;
}

export default function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    backHref,
    className = '',
}: PageHeaderProps) {
    return (
        <div className={`mb-6 space-y-2 ${className}`}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="mb-2">
                    <Breadcrumb items={breadcrumbs} />
                </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    {backHref && (
                        <Link
                            href={backHref}
                            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
                            title="Quay lại"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    )}

                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-1 text-sm text-slate-500">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
