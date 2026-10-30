import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Plus,
    Upload,
    ExternalLink,
    Trash2,
    Eye,
    ShieldAlert,
    Users,
    Sparkles,
    Zap,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import ConfirmDialog from '@/Components/Common/ConfirmDialog';
import FilterBar from '@/Components/Table/FilterBar';
import DataTable, { Column, PaginationMeta } from '@/Components/Table/DataTable';

interface CreatorAccount {
    id: number;
    platform: string;
    handle: string;
    url: string;
    followers_count: number;
}

interface Creator {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    niche: string;
    tier: 'nano' | 'micro' | 'macro' | 'mega';
    trust_score: number;
    blacklist_status: boolean;
    shipping_address: string | null;
    city_province: string | null;
    accounts: CreatorAccount[];
}

interface Props {
    creators: {
        data: Creator[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: {
        search?: string;
        tier?: string;
        niche?: string;
        blacklist?: string;
    };
    availableNiches: string[];
    tiers: { value: string; label: string }[];
}

export default function Index({ creators, filters, availableNiches, tiers }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [tier, setTier] = useState(filters.tier || '');
    const [niche, setNiche] = useState(filters.niche || '');

    // State cho Modal xác nhận xóa
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Kích hoạt tìm kiếm qua router.get
    const triggerSearch = (newSearch: string, newTier: string, newNiche: string) => {
        router.get(
            route('creators.index'),
            {
                search: newSearch || undefined,
                tier: newTier || undefined,
                niche: newNiche || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        triggerSearch(val, tier, niche);
    };

    const handleTierChange = (val: string) => {
        setTier(val);
        triggerSearch(search, val, niche);
    };

    const handleNicheChange = (val: string) => {
        setNiche(val);
        triggerSearch(search, tier, val);
    };

    const handleResetFilters = () => {
        setSearch('');
        setTier('');
        setNiche('');
        triggerSearch('', '', '');
    };

    const activeFiltersCount = (search ? 1 : 0) + (tier ? 1 : 0) + (niche ? 1 : 0);

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        router.delete(route('creators.destroy', deleteTarget.id), {
            onFinish: () => {
                setIsDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const getTierVariant = (t: string): BadgeVariant => {
        switch (t.toLowerCase()) {
            case 'mega':
                return 'primary';
            case 'macro':
                return 'purple';
            case 'micro':
                return 'info';
            default:
                return 'default';
        }
    };

    const columns: Column[] = [
        { key: 'creator', label: 'Creator / Hồ sơ', className: 'w-1/4' },
        { key: 'channels', label: 'Kênh mạng xã hội', className: 'w-1/3' },
        { key: 'niche', label: 'Ngành hàng' },
        { key: 'tier', label: 'Phân hạng' },
        { key: 'trust', label: 'Điểm uy tín' },
        { key: 'actions', label: 'Thao tác', align: 'right' },
    ];

    const paginationMeta: PaginationMeta = {
        current_page: creators.current_page,
        last_page: creators.last_page,
        per_page: creators.per_page,
        total: creators.total,
        links: creators.links,
    };

    return (
        <AppLayout title="Quản lý KOL / KOC">
            {/* Page Header Chuẩn */}
            <PageHeader
                title="Quản Lý KOL / KOC"
                description={`Kho lưu trữ hồ sơ, kênh truyền thông và danh bạ Creator toàn hệ thống (${creators.total} hồ sơ)`}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Creator CRM' },
                ]}
                actions={
                    <div className="flex items-center gap-2.5">
                        <Link href={route('creators.discovery')}>
                            <Button variant="secondary" iconLeft={<Zap className="h-4 w-4 text-amber-500" />}>
                                Khám Phá Tự Động
                            </Button>
                        </Link>
                        <Link href={route('creators.extension.index')}>
                            <Button variant="secondary" iconLeft={<Sparkles className="h-4 w-4 text-indigo-600" />}>
                                Tiện ích Extension
                            </Button>
                        </Link>
                        <Link href={route('creators.import.view')}>
                            <Button variant="secondary" iconLeft={<Upload className="h-4 w-4" />}>
                                Nhập Dữ Liệu
                            </Button>
                        </Link>
                        <Link href={route('creators.create')}>
                            <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />}>
                                Thêm Creator
                            </Button>
                        </Link>
                    </div>
                }
            />

            {/* Thanh Tìm Kiếm & Bộ Lọc Đa Chiều */}
            <div className="mb-6">
                <FilterBar
                    searchValue={search}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder="Tìm theo Tên, SĐT, Email hoặc @handle..."
                    activeFiltersCount={activeFiltersCount}
                    onResetFilters={handleResetFilters}
                    filtersSlot={
                        <>
                            {/* Lọc Phân Hạng (Tier) */}
                            <select
                                value={tier}
                                onChange={(e) => handleTierChange(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Tất cả phân hạng (Tier)</option>
                                {tiers.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>

                            {/* Lọc Ngành Hàng (Niche) */}
                            <select
                                value={niche}
                                onChange={(e) => handleNicheChange(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Tất cả ngành hàng (Niche)</option>
                                {availableNiches.map((n) => (
                                    <option key={n} value={n}>
                                        {n.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </>
                    }
                />
            </div>

            {/* Bảng Dữ Liệu DataTable Chuẩn */}
            <DataTable<Creator>
                columns={columns}
                data={creators.data}
                pagination={paginationMeta}
                emptyTitle="Chưa tìm thấy Creator nào"
                emptyDescription="Không có Creator nào khớp với điều kiện lọc hiện tại. Hãy thử thay đổi từ khóa hoặc đặt lại bộ lọc."
                emptyAction={
                    <div className="flex gap-2">
                        {activeFiltersCount > 0 ? (
                            <Button variant="secondary" onClick={handleResetFilters}>
                                Xóa bộ lọc
                            </Button>
                        ) : (
                            <Link href={route('creators.create')}>
                                <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />}>
                                    Thêm Creator đầu tiên
                                </Button>
                            </Link>
                        )}
                    </div>
                }
                renderRow={(c: Creator) => (
                    <tr key={c.id} className="transition-colors hover:bg-slate-50/80">
                        {/* Thông tin Creator */}
                        <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700 text-sm shadow-xs">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <Link
                                            href={route('creators.show', c.id)}
                                            className="font-semibold text-slate-900 hover:text-primary-600 transition-colors truncate block"
                                        >
                                            {c.name}
                                        </Link>
                                        {c.blacklist_status && (
                                            <span title="Creator nằm trong danh sách đen">
                                                <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        {c.phone ? (
                                            <span>{c.phone}</span>
                                        ) : (
                                            <span className="italic text-slate-400">Chưa có SĐT</span>
                                        )}
                                        {c.city_province && <span>• {c.city_province}</span>}
                                    </div>
                                </div>
                            </div>
                        </td>

                        {/* Kênh mạng xã hội */}
                        <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                                {c.accounts && c.accounts.length > 0 ? (
                                    c.accounts.map((acc: CreatorAccount) => (
                                        <a
                                            key={acc.id}
                                            href={acc.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                                            title={`Xem trang ${acc.platform}`}
                                        >
                                            <span className="font-semibold capitalize text-slate-800">
                                                {acc.platform}:
                                            </span>
                                            <span>@{acc.handle}</span>
                                            <span className="text-slate-400 font-medium">
                                                ({(acc.followers_count / 1000).toFixed(0)}k)
                                            </span>
                                            <ExternalLink className="h-3 w-3 text-slate-400" />
                                        </a>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Chưa liên kết</span>
                                )}
                            </div>
                        </td>

                        {/* Ngành hàng */}
                        <td className="px-4 py-3.5">
                            <Badge variant="default" size="sm">
                                {c.niche.toUpperCase()}
                            </Badge>
                        </td>

                        {/* Phân hạng */}
                        <td className="px-4 py-3.5">
                            <Badge variant={getTierVariant(c.tier)} size="sm">
                                {c.tier.toUpperCase()}
                            </Badge>
                        </td>

                        {/* Điểm uy tín */}
                        <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            c.trust_score >= 80
                                                ? 'bg-emerald-500'
                                                : c.trust_score >= 50
                                                ? 'bg-amber-500'
                                                : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${c.trust_score}%` }}
                                    />
                                </div>
                                <span className="text-xs font-semibold text-slate-700">
                                    {c.trust_score}
                                </span>
                            </div>
                        </td>

                        {/* Thao tác */}
                        <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <Link
                                    href={route('creators.show', c.id)}
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                    title="Xem chi tiết hồ sơ"
                                >
                                    <Eye className="h-4 w-4" />
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    title="Xóa hồ sơ"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                )}
            />

            {/* Modal Xác Nhận Xóa Creator Chuẩn B2B */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Xóa Hồ Sơ Creator"
                message={`Bạn có chắc chắn muốn xóa hồ sơ của Creator "${deleteTarget?.name}"? Dữ liệu liên quan có thể bị ẩn khỏi các chiến dịch hiện tại.`}
                confirmText="Xóa hồ sơ"
                cancelText="Hủy bỏ"
                variant="danger"
                loading={isDeleting}
            />
        </AppLayout>
    );
}
