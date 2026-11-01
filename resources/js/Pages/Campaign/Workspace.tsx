import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import QuickZaloReminderModal from '@/Components/Outreach/QuickZaloReminderModal';
import {
    ClipboardList,
    Users,
    Clock,
    AlertTriangle,
    Package,
    Video,
    CheckCircle2,
    Search,
    Filter,
    MessageCircle,
    Copy,
    Check,
    ExternalLink,
    ChevronRight,
    ArrowUpRight,
    Calendar,
    Phone,
    ShieldAlert,
    Sparkles,
    User,
    UserPlus,
    FolderKanban,
} from 'lucide-react';

export interface CreatorAccount {
    id: number;
    platform: string;
    handle: string;
    followers_count: number;
    url?: string;
}

export interface Creator {
    id: number;
    name: string;
    phone: string | null;
    shipping_address: string | null;
    niche: string;
    tier: string;
    trust_score?: number;
    blacklist_status?: boolean;
    accounts?: CreatorAccount[];
}

export interface DeadlineInfo {
    status: 'safe' | 'warning' | 'overdue';
    days: number;
    text: string;
    date: string;
}

export interface WorkspaceKocItem {
    id: number;
    campaign_id: number;
    creator_id: number;
    assigned_to: number | null;
    status: string;
    booking_fee: string | number;
    portal_token: string | null;
    notes: string | null;
    contacted_at?: string | null;
    address_confirmed_at?: string | null;
    sample_sent_at?: string | null;
    sample_received_at?: string | null;
    posted_at?: string | null;
    creator?: Creator;
    campaign?: {
        id: number;
        name: string;
        product_name: string;
        video_deadline_days?: number;
        status: string;
        hashtags?: string | null;
        discount_code?: string | null;
    };
    assignee?: { id: number; name: string; email: string } | null;
    deadline_info?: DeadlineInfo | null;
    contentPosts?: Array<{
        id: number;
        platform: string;
        post_url: string;
        video_title?: string;
        status: string;
    }>;
}

interface Props {
    filters: {
        staff_id: string;
        campaign_id: number | null;
        search: string | null;
    };
    is_leader_or_admin: boolean;
    current_user_id: number;
    staff_users: Array<{ id: number; name: string; email: string }>;
    campaigns: Array<{ id: number; name: string; product_name: string; status: string }>;
    stats: {
        total_my_kocs: number;
        my_kocs_count?: number;
        unassigned_count?: number;
        leads_count: number;
        samples_count: number;
        deadlines_count: number;
        reviews_count: number;
        overdue_count: number;
        warning_count: number;
        ready_to_ship_count: number;
        awaiting_receipt_count: number;
        pending_approval_count: number;
    };
    buckets: {
        leads: WorkspaceKocItem[];
        samples: WorkspaceKocItem[];
        deadlines: WorkspaceKocItem[];
        reviews: WorkspaceKocItem[];
    };
}

export default function Workspace({
    filters,
    is_leader_or_admin,
    current_user_id,
    staff_users,
    campaigns,
    stats,
    buckets,
}: Props) {
    const [activeTab, setActiveTab] = useState<'deadlines' | 'samples' | 'leads' | 'reviews'>('deadlines');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(filters.campaign_id ? String(filters.campaign_id) : '');
    const [selectedStaffId, setSelectedStaffId] = useState<string>(filters.staff_id || '');
    const [quickZaloModalId, setQuickZaloModalId] = useState<number | null>(null);
    const [copiedToken, setCopiedToken] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [claimingId, setClaimingId] = useState<number | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Nhận phụ trách KOC (hoặc Admin chỉ định nhân viên)
    const handleAssignKoc = (kocId: number, staffUserId: number | null, creatorName?: string) => {
        setClaimingId(kocId);
        // @ts-ignore
        const assignUrl = typeof route === 'function'
            ? route('pipeline.assign', kocId)
            : `/pipeline/${kocId}/assign`;

        router.patch(
            assignUrl,
            { assigned_to: staffUserId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    const staffName = staffUserId
                        ? staff_users.find((u) => u.id === staffUserId)?.name || 'nhân viên'
                        : 'chưa phân công';
                    showToast(staffUserId === current_user_id
                        ? `Bạn đã nhận phụ trách KOC ${creatorName || ''} thành công!`
                        : `Đã phân công KOC ${creatorName || ''} cho ${staffName}.`
                    );
                },
                onFinish: () => setClaimingId(null),
            }
        );
    };

    // Áp dụng bộ lọc
    const handleFilterChange = (newParams: Record<string, any>) => {
        router.get(
            // @ts-ignore
            typeof route === 'function' ? route('workspace.index') : '/workspace',
            {
                search: searchTerm || undefined,
                campaign_id: selectedCampaignId || undefined,
                staff_id: selectedStaffId || undefined,
                ...newParams,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleCopyPortal = (item: WorkspaceKocItem) => {
        if (!item.portal_token) return;
        // @ts-ignore
        const portalUrl = typeof route === 'function'
            ? route('portal.show', item.portal_token)
            : `${window.location.origin}/portal/${item.portal_token}`;

        navigator.clipboard.writeText(portalUrl);
        setCopiedToken(item.id);
        setTimeout(() => setCopiedToken(null), 2500);
        showToast(`Đã chép link Portal cho ${item.creator?.name}`);
    };

    // Format tiền tệ VND
    const formatCurrency = (val: string | number) => {
        const num = Number(val) || 0;
        return num.toLocaleString('vi-VN') + ' đ';
    };

    // Lấy badge trạng thái chuẩn
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new':
                return <Badge variant="default">Mới</Badge>;
            case 'contacted':
                return <Badge variant="info">Đã liên hệ</Badge>;
            case 'agreed':
                return <Badge variant="primary">Đã chốt</Badge>;
            case 'address_confirmed':
                return <Badge variant="warning">Đã chốt địa chỉ</Badge>;
            case 'sample_sent':
                return <Badge variant="info">Đã gửi mẫu</Badge>;
            case 'sample_received':
                return <Badge variant="primary">Đã nhận mẫu</Badge>;
            case 'posted':
                return <Badge variant="success">Đã lên video</Badge>;
            case 'completed':
                return <Badge variant="success">Hoàn thành</Badge>;
            case 'declined':
                return <Badge variant="danger">Từ chối</Badge>;
            case 'no_show':
                return <Badge variant="danger">Bom hàng</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    };

    const currentList = buckets[activeTab] || [];

    return (
        <AppLayout title="Bàn Làm Việc Booking">
            <Head title="Bàn Làm Việc Booking - Việc Cần Xử Lý" />

            {/* Toast thông báo */}
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <PageHeader
                title="Bàn Làm Việc Booking (My Workspace)"
                description="Không gian làm việc tập trung toàn bộ KOC theo phân công, theo dõi hạn chót và chăm sóc 1-chạm"
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Bàn làm việc Booking' },
                ]}
                actions={
                    <div className="flex items-center gap-2.5">
                        <Link href={route('campaigns.index')}>
                            <Button variant="secondary" iconLeft={<FolderKanban className="h-4 w-4" />}>
                                Xem Các Chiến Dịch
                            </Button>
                        </Link>
                    </div>
                }
            />

            {/* 4 Khối Chỉ Số Khẩn Cấp của Bàn Làm Việc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Metric 1: Tổng KOC Đang Phụ Trách */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            KOC Đang Phụ Trách
                        </span>
                        <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {stats.total_my_kocs}
                        </span>
                        <span className="text-xs text-slate-500">KOC trên toàn bộ chiến dịch</span>
                    </div>
                </div>

                {/* Metric 2: Mẫu Cần Xử Lý */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Xử Lý Mẫu Thử
                        </span>
                        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                            <Package className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-600">
                            {stats.ready_to_ship_count}
                        </span>
                        <span className="text-xs text-slate-500">chờ báo kho / {stats.awaiting_receipt_count} chờ KOC nhận</span>
                    </div>
                </div>

                {/* Metric 3: Cảnh Báo Quá Hạn Video */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Video Quá Hạn
                        </span>
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-rose-600">
                            {stats.overdue_count}
                        </span>
                        <span className="text-xs text-slate-500">quá hạn ({stats.warning_count} sắp đến hạn)</span>
                    </div>
                </div>

                {/* Metric 4: Video Đang Chờ Nghiệm Thu */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Chờ Nghiệm Thu
                        </span>
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                            <Video className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">
                            {stats.pending_approval_count}
                        </span>
                        <span className="text-xs text-slate-500">video chờ duyệt</span>
                    </div>
                </div>
            </div>

            {/* Thanh Bộ Lọc & Tìm Kiếm */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs mb-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        {/* Tìm kiếm */}
                        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleFilterChange({ search: searchTerm });
                                    }
                                }}
                                placeholder="Tìm KOC, SĐT, Handle..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            />
                        </div>

                        {/* Lọc theo chiến dịch */}
                        <select
                            value={selectedCampaignId}
                            onChange={(e) => {
                                setSelectedCampaignId(e.target.value);
                                handleFilterChange({ campaign_id: e.target.value || undefined });
                            }}
                            className="rounded-lg border border-slate-300 py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">Tất cả chiến dịch</option>
                            {campaigns.map((camp) => (
                                <option key={camp.id} value={camp.id}>
                                    {camp.name} ({camp.product_name})
                                </option>
                            ))}
                        </select>

                        {/* Lọc theo nhân viên phụ trách & Trạng thái phân công */}
                        <select
                            value={selectedStaffId}
                            onChange={(e) => {
                                setSelectedStaffId(e.target.value);
                                handleFilterChange({ staff_id: e.target.value || undefined });
                            }}
                            className="rounded-lg border border-slate-300 py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-medium"
                        >
                            <option value={String(current_user_id)}>
                                Việc của tôi ({stats.my_kocs_count ?? 0})
                            </option>
                            {(stats.unassigned_count ?? 0) > 0 && (
                                <option value="unassigned">
                                    ⚠️ Chưa phân công ({stats.unassigned_count})
                                </option>
                            )}
                            <option value="all">Tất cả KOC & Nhân viên</option>
                            {is_leader_or_admin && staff_users.map((u) => (
                                <option key={u.id} value={String(u.id)}>
                                    {u.name} {u.id === current_user_id ? '(Tôi)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleFilterChange({ search: searchTerm })}
                    >
                        Áp dụng lọc
                    </Button>
                </div>
            </div>

            {/* Cảnh báo KOC chưa có người phụ trách */}
            {(stats.unassigned_count ?? 0) > 0 && selectedStaffId !== 'unassigned' && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50/90 border border-amber-200 px-5 py-3.5 text-xs text-amber-900 shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 font-bold">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="font-bold text-slate-900 text-sm">
                                Có {stats.unassigned_count} KOC trong chiến dịch chưa được phân công nhân sự
                            </span>
                            <p className="mt-0.5 text-amber-800">
                                Hãy bấm xem danh sách KOC chưa gán để nhận phụ trách hoặc chỉ định nhân sự chăm sóc ngay.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStaffId('unassigned');
                                handleFilterChange({ staff_id: 'unassigned' });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 font-bold text-white hover:bg-amber-700 transition-colors shadow-xs"
                        >
                            <span>Xem {stats.unassigned_count} KOC Chưa Gán</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Khối Tabs To-Do & Bảng Công Việc */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {/* 4 Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-3 overflow-x-auto gap-2">
                    {/* Tab 1: Đôn đốc deadline */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('deadlines')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                            activeTab === 'deadlines'
                                ? 'bg-white text-slate-900 border-primary-600 shadow-xs'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                        }`}
                    >
                        <Clock className="h-4 w-4 text-rose-500" />
                        <span>Hạn Nộp Video</span>
                        {stats.overdue_count > 0 && (
                            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                {stats.overdue_count} trễ
                            </span>
                        )}
                        <span className="rounded-md bg-slate-200/70 px-1.5 py-0.2 text-[11px] text-slate-700">
                            {stats.deadlines_count}
                        </span>
                    </button>

                    {/* Tab 2: Xử lý mẫu thử */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('samples')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                            activeTab === 'samples'
                                ? 'bg-white text-slate-900 border-primary-600 shadow-xs'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                        }`}
                    >
                        <Package className="h-4 w-4 text-amber-500" />
                        <span>Mẫu Thử & Gửi Hàng</span>
                        {stats.ready_to_ship_count > 0 && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                {stats.ready_to_ship_count} báo kho
                            </span>
                        )}
                        <span className="rounded-md bg-slate-200/70 px-1.5 py-0.2 text-[11px] text-slate-700">
                            {stats.samples_count}
                        </span>
                    </button>

                    {/* Tab 3: Cần liên hệ & Gửi Brief */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('leads')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                            activeTab === 'leads'
                                ? 'bg-white text-slate-900 border-primary-600 shadow-xs'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                        }`}
                    >
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>Tiếp Cận & Gửi Brief</span>
                        <span className="rounded-md bg-slate-200/70 px-1.5 py-0.2 text-[11px] text-slate-700">
                            {stats.leads_count}
                        </span>
                    </button>

                    {/* Tab 4: Nghiệm thu video */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('reviews')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                            activeTab === 'reviews'
                                ? 'bg-white text-slate-900 border-primary-600 shadow-xs'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                        }`}
                    >
                        <Video className="h-4 w-4 text-emerald-500" />
                        <span>Nghiệm Thu & Đối Soát</span>
                        <span className="rounded-md bg-slate-200/70 px-1.5 py-0.2 text-[11px] text-slate-700">
                            {stats.reviews_count}
                        </span>
                    </button>
                </div>

                {/* Danh sách KOC trong Tab hiện tại */}
                <div className="overflow-x-auto">
                    {currentList.length === 0 ? (
                        <div className="py-16 text-center">
                            <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                            <h4 className="mt-3 text-sm font-bold text-slate-800">
                                Không có tác vụ nào trong mục này
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                                Tuyệt vời! Bạn đã hoàn thành các công việc trong mục này hoặc chưa có KOC nào cần xử lý.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold">
                                    <th className="py-3 px-4">KOC & Kênh Chính</th>
                                    <th className="py-3 px-4">Chiến Dịch & Sản Phẩm</th>
                                    <th className="py-3 px-4">Trạng Thái & Hạn Chót</th>
                                    <th className="py-3 px-4">Thù Lao (Deal)</th>
                                    <th className="py-3 px-4 text-right">Thao Tác Nhanh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentList.map((item) => {
                                    const primaryAccount = item.creator?.accounts?.[0];
                                    const isOverdue = item.deadline_info?.status === 'overdue';
                                    const isWarning = item.deadline_info?.status === 'warning';

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Cột 1: Thông tin KOC */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700 font-bold shrink-0">
                                                        {item.creator?.name?.charAt(0).toUpperCase() || 'K'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                                            <span>{item.creator?.name}</span>
                                                            {item.creator?.phone && (
                                                                <span className="font-mono text-[11px] font-normal text-slate-500">
                                                                    ({item.creator.phone})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                                            {primaryAccount ? (
                                                                <a
                                                                    href={primaryAccount.url || '#'}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-primary-600 hover:underline flex items-center gap-0.5"
                                                                >
                                                                    <span>@{primaryAccount.handle}</span>
                                                                    <ArrowUpRight className="h-3 w-3" />
                                                                </a>
                                                            ) : (
                                                                <span>{item.creator?.niche}</span>
                                                            )}
                                                            <span>•</span>
                                                            <span className="uppercase font-semibold text-slate-600">
                                                                {item.creator?.tier}
                                                            </span>
                                                        </div>
                                                        {/* Phụ trách */}
                                                        <div className="mt-1 flex items-center gap-1.5">
                                                            {item.assignee ? (
                                                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium" title="Nhân viên phụ trách">
                                                                    <User className="h-3 w-3 text-slate-400" />
                                                                    <span>{item.assignee.name}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                                    Chưa gán
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Cột 2: Chiến dịch & Sản phẩm */}
                                            <td className="py-3 px-4">
                                                <Link
                                                    href={route('campaigns.show', item.campaign_id)}
                                                    className="font-bold text-slate-900 hover:text-primary-600 flex items-center gap-1"
                                                >
                                                    <span className="line-clamp-1">{item.campaign?.name}</span>
                                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                </Link>
                                                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                                    SP: <span className="font-medium text-slate-700">{item.campaign?.product_name}</span>
                                                </div>
                                            </td>

                                            {/* Cột 3: Trạng thái & Hạn chót */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(item.status)}
                                                </div>
                                                {item.deadline_info && (
                                                    <div className="mt-1 flex items-center gap-1">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[11px] font-semibold ${
                                                                isOverdue
                                                                    ? 'bg-rose-100 text-rose-700 font-bold'
                                                                    : isWarning
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            <Clock className="h-3 w-3" />
                                                            {item.deadline_info.text}
                                                        </span>
                                                    </div>
                                                )}
                                                {item.status === 'address_confirmed' && (
                                                    <div className="mt-1 text-[11px] text-amber-700 font-medium flex items-center gap-1">
                                                        <Package className="h-3 w-3" />
                                                        Đã có địa chỉ, cần báo kho
                                                    </div>
                                                )}
                                            </td>

                                            {/* Cột 4: Thù lao */}
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-slate-800">
                                                    {formatCurrency(item.booking_fee)}
                                                </span>
                                            </td>

                                            {/* Cột 5: Thao tác nhanh */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Nút Nhận KOC khi chưa có ai nhận */}
                                                    {!item.assigned_to && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => handleAssignKoc(item.id, current_user_id, item.creator?.name)}
                                                            disabled={claimingId === item.id}
                                                            iconLeft={<UserPlus className="h-3.5 w-3.5 text-amber-600" />}
                                                            className="!border-amber-300 hover:!bg-amber-50 text-amber-900 font-bold"
                                                        >
                                                            {claimingId === item.id ? 'Đang nhận...' : 'Nhận KOC'}
                                                        </Button>
                                                    )}

                                                    {/* Nút Nhắc Zalo Thông Minh */}
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => setQuickZaloModalId(item.id)}
                                                        iconLeft={<MessageCircle className="h-3.5 w-3.5" />}
                                                    >
                                                        Nhắc Zalo
                                                    </Button>

                                                    {/* Nút Sao chép Link Portal */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyPortal(item)}
                                                        title="Sao chép link Portal cho KOC"
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-primary-600 shadow-2xs transition-colors"
                                                    >
                                                        {copiedToken === item.id ? (
                                                            <Check className="h-4 w-4 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-4 w-4" />
                                                        )}
                                                    </button>

                                                    {/* Mở chi tiết chiến dịch */}
                                                    <Link
                                                        href={route('campaigns.show', item.campaign_id)}
                                                        title="Xem trên ma trận chiến dịch"
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-primary-600 shadow-2xs transition-colors"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal Nhắc Zalo 1-Chạm Thông Minh */}
            <QuickZaloReminderModal
                isOpen={quickZaloModalId !== null}
                campaignCreatorId={quickZaloModalId}
                onClose={() => setQuickZaloModalId(null)}
                onSuccess={(msg) => showToast(msg)}
            />
        </AppLayout>
    );
}
