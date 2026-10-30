import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Plus,
    FolderKanban,
    LayoutGrid,
    Calendar,
    DollarSign,
    Users,
    Video,
    TrendingUp,
    Trash2,
    Edit3,
    Eye,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import ConfirmDialog from '@/Components/Common/ConfirmDialog';
import FilterBar from '@/Components/Table/FilterBar';

interface CampaignStats {
    total_assigned: number;
    completed_videos: number;
    target_count: number;
    video_progress_percent: number;
    total_committed_budget: number;
    budget_percent: number;
}

interface Campaign {
    id: number;
    name: string;
    product_name: string;
    product_sku: string | null;
    budget: string | number;
    target_creators_count: number;
    start_date: string;
    end_date: string;
    status: 'draft' | 'active' | 'completed' | 'paused';
    created_at: string;
    stats?: CampaignStats;
}

interface Props {
    campaigns: {
        data: Campaign[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: {
        search?: string;
        status?: string;
    };
    statuses: { value: string; label: string }[];
}

export default function Index({ campaigns, filters, statuses }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const triggerSearch = (newSearch: string, newStatus: string) => {
        router.get(
            route('campaigns.index'),
            {
                search: newSearch || undefined,
                status: newStatus || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        triggerSearch(val, status);
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        triggerSearch(search, val);
    };

    const handleReset = () => {
        setSearch('');
        setStatus('');
        triggerSearch('', '');
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        router.delete(route('campaigns.destroy', deleteTarget.id), {
            onFinish: () => {
                setIsDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(val));
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN');
    };

    const getStatusVariant = (st: string): BadgeVariant => {
        switch (st) {
            case 'active':
                return 'success';
            case 'completed':
                return 'primary';
            case 'paused':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (st: string) => {
        const found = statuses.find((s) => s.value === st);
        return found ? found.label : st;
    };

    return (
        <AppLayout title="Quản lý Chiến Dịch">
            <PageHeader
                title="Quản Lý Chiến Dịch Booking"
                description={`Theo dõi tiến độ tuyển Creator, ngân sách và mục tiêu số lượng video (${campaigns.total} chiến dịch)`}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Chiến dịch' },
                ]}
                actions={
                    <Link href={route('campaigns.create')}>
                        <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />}>
                            Tạo Chiến Dịch Mới
                        </Button>
                    </Link>
                }
            />

            {/* Toolbar Tìm kiếm & Lọc */}
            <div className="mb-6">
                <FilterBar
                    searchValue={search}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder="Tìm theo tên chiến dịch hoặc sản phẩm..."
                    activeFiltersCount={(search ? 1 : 0) + (status ? 1 : 0)}
                    onResetFilters={handleReset}
                    filtersSlot={
                        <select
                            value={status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                            <option value="">Tất cả trạng thái</option>
                            {statuses.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    }
                />
            </div>

            {/* Lưới Thẻ Chiến Dịch Chuẩn Design System */}
            {campaigns.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.data.map((c) => {
                        const stats = c.stats;

                        return (
                            <div
                                key={c.id}
                                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                            >
                                <div>
                                    {/* Top Bar của Card */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0">
                                            <span className="text-xs font-semibold text-primary-600 block truncate">
                                                SP: {c.product_name}
                                            </span>
                                            <Link
                                                href={route('campaigns.show', c.id)}
                                                className="text-base font-bold text-slate-900 hover:text-primary-600 transition-colors block truncate"
                                            >
                                                {c.name}
                                            </Link>
                                        </div>
                                        <Badge variant={getStatusVariant(c.status)} size="sm">
                                            {getStatusLabel(c.status)}
                                        </Badge>
                                    </div>

                                    {/* Thời gian */}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        <span>
                                            {formatDate(c.start_date)} - {formatDate(c.end_date)}
                                        </span>
                                    </div>

                                    {/* Thông số Ngân Sách & Tiến độ Video */}
                                    <div className="space-y-3.5 rounded-lg bg-slate-50 p-3.5 border border-slate-100 mb-4 text-xs">
                                        {/* Ngân sách */}
                                        <div>
                                            <div className="flex justify-between text-slate-600 mb-1">
                                                <span>Ngân sách dự kiến:</span>
                                                <span className="font-bold text-slate-900">
                                                    {formatCurrency(c.budget)}
                                                </span>
                                            </div>
                                            {stats && (
                                                <div className="flex justify-between text-[11px] text-slate-400">
                                                    <span>Đã cam kết:</span>
                                                    <span>{formatCurrency(stats.total_committed_budget)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Thanh tiến độ Video */}
                                        {stats && (
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-slate-600">Tiến độ lên video:</span>
                                                    <span className="font-semibold text-primary-700">
                                                        {stats.completed_videos}/{stats.target_count} video ({stats.video_progress_percent}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className="h-full rounded-full bg-primary-600 transition-all"
                                                        style={{ width: `${stats.video_progress_percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Actions của Card */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>{stats ? stats.total_assigned : 0} Creator</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Nút Chỉnh sửa chiến dịch */}
                                        <Link href={route('campaigns.edit', c.id)}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                iconLeft={<Edit3 className="h-3.5 w-3.5" />}
                                            >
                                                Sửa
                                            </Button>
                                        </Link>

                                        {/* Nút vào quản lý KOC & Ma Trận Tiến Độ */}
                                        <Link href={route('campaigns.show', c.id)}>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                iconLeft={<LayoutGrid className="h-3.5 w-3.5" />}
                                            >
                                                Quản Lý KOC
                                            </Button>
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                            title="Xóa chiến dịch"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <FolderKanban className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <h3 className="text-base font-bold text-slate-900">Chưa có chiến dịch nào</h3>
                    <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                        Hãy tạo chiến dịch đầu tiên để bắt đầu quy trình book KOL/KOC và quản lý phễu kéo thả Kanban.
                    </p>
                    <div className="mt-6">
                        <Link href={route('campaigns.create')}>
                            <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />}>
                                Tạo Chiến Dịch Mới
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Modal Xác nhận Xóa */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Xóa Chiến Dịch"
                message={`Bạn có chắc chắn muốn xóa chiến dịch "${deleteTarget?.name}"? Hệ thống sẽ kiểm tra và chỉ cho phép xóa nếu chưa gửi mẫu hoặc chưa phát sinh chi phí.`}
                confirmText="Xóa chiến dịch"
                cancelText="Hủy bỏ"
                variant="danger"
                loading={isDeleting}
            />
        </AppLayout>
    );
}
