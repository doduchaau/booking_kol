import React from 'react';
import { Link } from '@inertiajs/react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface BreadcrumbProps {
    items?: BreadcrumbItem[];
    className?: string;
}

export default function Breadcrumb({ items = [], className = '' }: BreadcrumbProps) {
    if (!items || items.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 ${className}`}>
            <ol className="flex items-center space-x-1 sm:space-x-1.5 flex-wrap">
                <li className="flex items-center">
                    <Link
                        href={route('dashboard')}
                        className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
                        title="Trang chủ"
                    >
                        <Home className="h-3.5 w-3.5" />
                        <span className="sr-only">Trang chủ</span>
                    </Link>
                </li>

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li key={index} className="flex items-center">
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mx-1" />
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className="text-slate-600 hover:text-primary-600 font-medium transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className={`font-semibold ${isLast ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
