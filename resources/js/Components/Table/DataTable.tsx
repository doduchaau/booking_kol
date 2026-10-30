import React, { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import EmptyState from '../Common/EmptyState';
import { SkeletonTable } from '../Common/LoadingSkeleton';

export interface Column<T = any> {
    key: string;
    label: string;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
}

export interface DataTableProps<T = any> {
    columns: Column<T>[];
    data: T[];
    renderRow: (item: T, index: number) => ReactNode;
    pagination?: PaginationMeta;
    loading?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    className?: string;
}

export default function DataTable<T = any>({
    columns,
    data = [],
    renderRow,
    pagination,
    loading = false,
    emptyTitle = 'Không tìm thấy dữ liệu',
    emptyDescription = 'Chưa có bản ghi nào hoặc không có kết quả phù hợp với bộ lọc hiện tại.',
    emptyAction,
    className = '',
}: DataTableProps<T>) {
    if (loading) {
        return <SkeletonTable rows={6} cols={columns.length} />;
    }

    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                >
                    {emptyAction}
                </EmptyState>
            </div>
        );
    }

    return (
        <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {columns.map((col) => {
                                const alignClass =
                                    col.align === 'center'
                                        ? 'text-center'
                                        : col.align === 'right'
                                        ? 'text-right'
                                        : 'text-left';

                                return (
                                    <th
                                        key={col.key}
                                        scope="col"
                                        className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${alignClass} ${
                                            col.className || ''
                                        }`}
                                    >
                                        {col.label}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {data.map((item, index) => renderRow(item, index))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {pagination && pagination.last_page > 1 && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3.5 sm:flex-row sm:px-6">
                    <div className="text-xs text-slate-500">
                        Hiển thị từ{' '}
                        <span className="font-semibold text-slate-900">
                            {(pagination.current_page - 1) * pagination.per_page + 1}
                        </span>{' '}
                        đến{' '}
                        <span className="font-semibold text-slate-900">
                            {Math.min(
                                pagination.current_page * pagination.per_page,
                                pagination.total,
                            )}
                        </span>{' '}
                        trên tổng số{' '}
                        <span className="font-semibold text-slate-900">
                            {pagination.total}
                        </span>{' '}
                        bản ghi
                    </div>

                    <div className="flex items-center space-x-1">
                        {pagination.links.map((link, idx) => {
                            // Xử lý nhãn tiếng Anh mặc định của Laravel thành tiếng Việt
                            let labelContent = link.label;
                            if (labelContent.includes('Previous') || labelContent.includes('&laquo;')) {
                                labelContent = 'Trước';
                            } else if (labelContent.includes('Next') || labelContent.includes('&raquo;')) {
                                labelContent = 'Sau';
                            }

                            if (!link.url) {
                                return (
                                    <span
                                        key={idx}
                                        className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs text-slate-400 cursor-not-allowed select-none"
                                        dangerouslySetInnerHTML={{ __html: labelContent }}
                                    />
                                );
                            }

                            return (
                                <Link
                                    key={idx}
                                    href={link.url}
                                    preserveState
                                    preserveScroll
                                    className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                                        link.active
                                            ? 'bg-primary-600 text-white shadow-sm'
                                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: labelContent }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
