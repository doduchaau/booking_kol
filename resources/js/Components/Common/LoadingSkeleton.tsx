import React from 'react';

export interface SkeletonProps {
    className?: string;
}

export function SkeletonLine({ className = 'h-4 w-full' }: SkeletonProps) {
    return <div className={`animate-pulse rounded bg-slate-200/80 ${className}`} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-3.5">
                <div className="flex gap-4">
                    {Array.from({ length: cols }).map((_, i) => (
                        <SkeletonLine key={i} className="h-4 flex-1" />
                    ))}
                </div>
            </div>
            <div className="divide-y divide-slate-100 p-2">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="flex items-center gap-4 px-4 py-3.5">
                        {Array.from({ length: cols }).map((_, c) => (
                            <SkeletonLine
                                key={c}
                                className={`h-4 flex-1 ${c === 0 ? 'max-w-[180px]' : ''}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
    return (
        <div className={`animate-pulse rounded-xl border border-slate-200 bg-white p-5 space-y-3.5 ${className}`}>
            <div className="flex items-center justify-between">
                <SkeletonLine className="h-5 w-1/3" />
                <SkeletonLine className="h-5 w-12 rounded-full" />
            </div>
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonLine className="h-4 w-1/2" />
        </div>
    );
}

export default function LoadingSkeleton({ className = '' }: SkeletonProps) {
    return <SkeletonLine className={className} />;
}
