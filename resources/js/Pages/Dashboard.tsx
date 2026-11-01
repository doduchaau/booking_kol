import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import {
    Users,
    FolderKanban,
    Video,
    TrendingUp,
    Plus,
    ArrowUpRight,
    AlertTriangle,
    Clock,
    Truck,
    CheckCircle2,
    ExternalLink,
    ChevronRight,
    Package,
    Sparkles,
    Calendar,
    Phone,
    ShieldAlert,
    MessageSquare,
    MessageCircle,
    Eye,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import QuickZaloReminderModal from '@/Components/Outreach/QuickZaloReminderModal';

export interface DashboardProps {
    stats: {
        total_creators: number;
        new_creators_this_week: number;
        active_campaigns: number;
        total_campaigns: number;
        approved_videos_count: number;
        approved_this_month: number;
        on_time_rate: number;
        total_views: number;
        total_gmv: number;
        total_cost: number;
        roi_percent: number;
    };
    action_center: {
        deadline_kocs: Array<{
            id: number;
            campaign_id: number;
            campaign_name: string;
            creator_id: number;
            creator_name: string;
            creator_phone: string;
            assignee_name: string;
            sample_received_at?: string;
            deadline_info: {
                status: 'overdue' | 'warning' | 'safe';
                days: number;
                text: string;
                date: string;
            };
        }>;
        pending_approval_posts: Array<{
            id: number;
            platform: string;
            video_title: string;
            post_url: string;
            created_at: string;
            creator_name: string;
            campaign_name: string;
            campaign_id: number;
        }>;
        pending_approval_count: number;
        ready_to_ship_count: number;
        ready_to_ship_list: Array<{
            id: number;
            campaign_id: number;
            campaign_name: string;
            creator_name: string;
            creator_phone: string;
            shipping_address: string;
            address_confirmed_at?: string;
        }>;
    };
    active_campaigns: Array<{
        id: number;
        name: string;
        product_name: string;
        start_date?: string;
        end_date?: string;
        total_assigned: number;
        completed_videos: number;
        target_creators_count: number;
        progress_percent: number;
        committed_budget: number;
        budget: number;
        budget_percent: number;
    }>;
}

export default function Dashboard({ stats, action_center, active_campaigns }: DashboardProps) {
    const [actionTab, setActionTab] = useState<'deadlines' | 'approvals' | 'shipping'>('deadlines');
    const [quickZaloModalId, setQuickZaloModalId] = useState<number | null>(null);
    const [dashboardToast, setDashboardToast] = useState<string | null>(null);

    // Helper format tiền tệ VND chuẩn
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Helper format số tiền dạng rút gọn (M, tỷ)
    const formatCurrencyCompact = (amount: number) => {
        if (!amount || amount === 0) return '0 đ';
        if (amount >= 1_000_000_000) {
            return (amount / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ đ';
        }
        if (amount >= 1_000_000) {
            return (amount / 1_000_000).toFixed(1).replace('.0', '') + 'M đ';
        }
        if (amount >= 1_000) {
            return (amount / 1_000).toFixed(0) + 'K đ';
        }
        return amount.toLocaleString('vi-VN') + ' đ';
    };

    // Helper format số lượt view dạng rút gọn
    const formatCompactNumber = (num: number) => {
        if (!num || num === 0) return '0';
        if (num >= 1_000_000) {
            return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M';
        }
        if (num >= 1_000) {
            return (num / 1_000).toFixed(1).replace('.0', '') + 'K';
        }
        return num.toLocaleString('vi-VN');
    };

    const overdueCount = action_center.deadline_kocs.filter(k => k.deadline_info?.status === 'overdue').length;
    const warningCount = action_center.deadline_kocs.filter(k => k.deadline_info?.status === 'warning').length;

    return (
        <AppLayout title="Bảng điều khiển">
            <Head title="Bảng Điều Khiển Tổng Quan" />

            <PageHeader
                title="Bảng Điều Khiển Tổng Quan"
                description="Tổng quan chỉ số hoạt động booking KOL/KOC, tiến độ chiến dịch và các việc khẩn cấp cần xử lý"
                breadcrumbs={[{ label: 'Tổng quan' }]}
                actions={
                    <div className="flex items-center gap-2.5">
                        <Link href={route('campaigns.create')}>
                            <Button variant="secondary" iconLeft={<Plus className="h-4 w-4" />}>
                                Tạo Chiến Dịch
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

            {/* 4 Khối Metric Cards chuẩn Enterprise SaaS với dữ liệu thời gian thực */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Metric 1: Creator Đang Quản Lý */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Creator Đang Quản Lý
                        </span>
                        <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {stats.total_creators.toLocaleString('vi-VN')}
                        </span>
                        {stats.new_creators_this_week > 0 && (
                            <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                                +{stats.new_creators_this_week} tuần này
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Từ hồ sơ Master CRM và Extension</p>
                </div>

                {/* Metric 2: Chiến Dịch Hoạt Động */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Chiến Dịch Đang Chạy
                        </span>
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                            <FolderKanban className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {stats.active_campaigns}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                            / {stats.total_campaigns} tổng chiến dịch
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Đang triển khai booking & gửi mẫu</p>
                </div>

                {/* Metric 3: Video Đã Nghiệm Thu */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Video Đã Nghiệm Thu
                        </span>
                        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                            <Video className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {stats.approved_videos_count}
                        </span>
                        <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {stats.on_time_rate}% đúng hạn
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        {stats.approved_this_month > 0 ? `+${stats.approved_this_month} video trong tháng này` : 'Tất cả video đã duyệt'}
                    </p>
                </div>

                {/* Metric 4: GMV Ước Tính & Chi Phí */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            GMV Ước Tính
                        </span>
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {formatCurrencyCompact(stats.total_gmv)}
                        </span>
                        <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {stats.roi_percent > 0 ? `+${stats.roi_percent}% ROI` : 'Theo dõi'}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        Chi phí: {formatCurrencyCompact(stats.total_cost)} ({formatCompactNumber(stats.total_views)} lượt xem)
                    </p>
                </div>
            </div>

            {/* Khối Việc Cần Xử Lý Ngay (Action Center) */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden mb-6">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 font-bold">
                            <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                Trung Tâm Xử Lý Khẩn Cấp
                                {(overdueCount > 0 || action_center.pending_approval_count > 0 || action_center.ready_to_ship_count > 0) && (
                                    <span className="inline-flex items-center justify-center h-5 px-1.5 text-[11px] font-bold text-white bg-rose-600 rounded-full">
                                        {overdueCount + action_center.pending_approval_count + action_center.ready_to_ship_count}
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-slate-500">
                                Các tác vụ ảnh hưởng trực tiếp đến tiến độ và doanh số chiến dịch cần nhân viên xử lý ngay
                            </p>
                        </div>
                    </div>

                    {/* Tabs chuyển đổi bộ phận */}
                    <div className="flex items-center rounded-lg bg-slate-200/70 p-1 text-xs font-medium text-slate-600">
                        <button
                            type="button"
                            onClick={() => setActionTab('deadlines')}
                            className={`rounded-md px-3 py-1.5 transition-all ${actionTab === 'deadlines'
                                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                                : 'hover:text-slate-900'
                                }`}
                        >
                            Hạn Nộp Video
                            {overdueCount > 0 && (
                                <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                                    {overdueCount}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActionTab('approvals')}
                            className={`rounded-md px-3 py-1.5 transition-all ${actionTab === 'approvals'
                                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                                : 'hover:text-slate-900'
                                }`}
                        >
                            Chờ Duyệt Video
                            {action_center.pending_approval_count > 0 && (
                                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">
                                    {action_center.pending_approval_count}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActionTab('shipping')}
                            className={`rounded-md px-3 py-1.5 transition-all ${actionTab === 'shipping'
                                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                                : 'hover:text-slate-900'
                                }`}
                        >
                            Chờ Gửi Mẫu
                            {action_center.ready_to_ship_count > 0 && (
                                <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                                    {action_center.ready_to_ship_count}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Nội dung từng Tab */}
                <div className="p-5">
                    {/* TAB 1: DEADLINE NỘP VIDEO */}
                    {actionTab === 'deadlines' && (
                        <div>
                            {action_center.deadline_kocs.length === 0 ? (
                                <div className="py-8 text-center">
                                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500 mb-2" />
                                    <p className="text-sm font-semibold text-slate-800">
                                        Không có KOC nào quá hạn hoặc sắp trễ deadline!
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Tất cả các bạn KOC đã nhận mẫu đều đang trong khung thời gian an toàn.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {action_center.deadline_kocs.map((koc) => {
                                        const isOverdue = koc.deadline_info?.status === 'overdue';
                                        const isWarning = koc.deadline_info?.status === 'warning';

                                        return (
                                            <div
                                                key={koc.id}
                                                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isOverdue
                                                            ? 'bg-rose-100 text-rose-600'
                                                            : isWarning
                                                                ? 'bg-amber-100 text-amber-600'
                                                                : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                    >
                                                        {isOverdue ? (
                                                            <AlertTriangle className="h-4 w-4" />
                                                        ) : (
                                                            <Clock className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-900">
                                                                {koc.creator_name}
                                                            </span>
                                                            {koc.creator_phone && (
                                                                <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                                                                    <Phone className="h-3 w-3 text-slate-400" />
                                                                    {koc.creator_phone}
                                                                </span>
                                                            )}
                                                            <Badge
                                                                variant={
                                                                    isOverdue
                                                                        ? 'danger'
                                                                        : isWarning
                                                                            ? 'warning'
                                                                            : 'default'
                                                                }
                                                                size="sm"
                                                            >
                                                                {koc.deadline_info?.text}
                                                            </Badge>
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                                            <span>
                                                                Chiến dịch:{' '}
                                                                <strong className="text-slate-700 font-medium">
                                                                    {koc.campaign_name}
                                                                </strong>
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                Nhận mẫu: {koc.sample_received_at || 'Đã nhận'}
                                                            </span>
                                                            <span>•</span>
                                                            <span>Phụ trách: {koc.assignee_name}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => setQuickZaloModalId(koc.id)}
                                                        iconLeft={<MessageCircle className="h-3.5 w-3.5" />}
                                                    >
                                                        Nhắc Zalo
                                                    </Button>
                                                    <Link href={route('campaigns.show', koc.campaign_id)}>
                                                        <Button variant="secondary" size="sm" iconRight={<ChevronRight className="h-3.5 w-3.5" />}>
                                                            Chi Tiết
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: CHỜ DUYỆT VIDEO */}
                    {actionTab === 'approvals' && (
                        <div>
                            {action_center.pending_approval_posts.length === 0 ? (
                                <div className="py-8 text-center">
                                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500 mb-2" />
                                    <p className="text-sm font-semibold text-slate-800">
                                        Không có video nào đang chờ duyệt!
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Tất cả các bài đăng KOC nộp đã được xử lý nghiệm thu.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {action_center.pending_approval_posts.map((post) => (
                                        <div
                                            key={post.id}
                                            className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                                    <Video className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {post.video_title}
                                                        </span>
                                                        <Badge variant="warning" size="sm">
                                                            Chờ duyệt
                                                        </Badge>
                                                        <span className="text-xs uppercase font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                                            {post.platform}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                                        <span>
                                                            KOC: <strong className="text-slate-700">{post.creator_name}</strong>
                                                        </span>
                                                        <span>•</span>
                                                        <span>{post.campaign_name}</span>
                                                        <span>•</span>
                                                        <span>Nộp lúc: {post.created_at}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <a
                                                    href={post.post_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Xem link video
                                                </a>
                                                <Link href={route('content.index', { status: 'pending_approval' })}>
                                                    <Button variant="primary" size="sm">
                                                        Duyệt Video
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: KOC ĐÃ CHỐT ĐỊA CHỈ - CHỜ GỬI MẪU */}
                    {actionTab === 'shipping' && (
                        <div>
                            {action_center.ready_to_ship_list.length === 0 ? (
                                <div className="py-8 text-center">
                                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500 mb-2" />
                                    <p className="text-sm font-semibold text-slate-800">
                                        Không có KOC nào đang chờ gửi mẫu!
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Tất cả các bạn KOC chốt địa chỉ đều đã được gửi thông tin/xác nhận chuyển mẫu.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {action_center.ready_to_ship_list.map((shipItem) => (
                                        <div
                                            key={shipItem.id}
                                            className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {shipItem.creator_name}
                                                        </span>
                                                        <Badge variant="info" size="sm">
                                                            Đã chốt địa chỉ
                                                        </Badge>
                                                        <span className="text-xs text-slate-500 font-mono">
                                                            {shipItem.creator_phone}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-600 truncate max-w-xl">
                                                        Địa chỉ nhận: {shipItem.shipping_address}
                                                    </p>
                                                    <div className="mt-0.5 text-[11px] text-slate-400">
                                                        Chiến dịch: {shipItem.campaign_name} • Chốt lúc: {shipItem.address_confirmed_at}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <Link href={route('campaigns.show', shipItem.campaign_id)}>
                                                    <Button variant="secondary" size="sm" iconLeft={<Package className="h-3.5 w-3.5" />}>
                                                        Xác Nhận Gửi Mẫu
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Khối Tiến Độ Các Chiến Dịch Đang Chạy (Active Campaigns) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Tiến Độ Các Chiến Dịch Đang Chạy
                        </h2>
                        <p className="text-xs text-slate-500">
                            Theo dõi mục tiêu số lượng video hoàn thành và tỷ lệ giải ngân ngân sách thực tế
                        </p>
                    </div>
                    <Link
                        href={route('campaigns.index')}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                        Xem tất cả ({stats.total_campaigns})
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                {active_campaigns.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
                        <FolderKanban className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">Chưa có chiến dịch nào đang hoạt động</p>
                        <p className="text-xs text-slate-400 mt-1 mb-3">Tạo chiến dịch mới để bắt đầu quy trình hợp tác với KOL/KOC</p>
                        <Link href={route('campaigns.create')}>
                            <Button variant="primary" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" />}>
                                Tạo Chiến Dịch Mới
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {active_campaigns.map((camp) => (
                            <div
                                key={camp.id}
                                className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors bg-white shadow-2xs"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <Link
                                            href={route('campaigns.show', camp.id)}
                                            className="text-sm font-bold text-slate-900 hover:text-primary-600 transition-colors"
                                        >
                                            {camp.name}
                                        </Link>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Sản phẩm: <span className="font-medium text-slate-700">{camp.product_name}</span>
                                        </p>
                                    </div>
                                    <Badge variant="success" size="sm">
                                        Đang chạy
                                    </Badge>
                                </div>

                                {/* Thanh Tiến độ Video */}
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-slate-500 font-medium">Tiến độ nghiệm thu video</span>
                                        <span className="font-bold text-slate-800">
                                            {camp.completed_videos} / {camp.target_creators_count} video ({camp.progress_percent}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-600 rounded-full transition-all duration-300"
                                            style={{ width: `${camp.progress_percent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Thanh Tiến độ Ngân sách */}
                                <div className="mt-2.5">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-slate-500 font-medium">Ngân sách đã cam kết</span>
                                        <span className="font-bold text-slate-800">
                                            {formatCurrencyCompact(camp.committed_budget)}
                                            {camp.budget > 0 && ` / ${formatCurrencyCompact(camp.budget)}`}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                            style={{ width: `${camp.budget_percent}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        {camp.total_assigned} KOC trong chiến dịch
                                    </span>
                                    <Link
                                        href={route('campaigns.show', camp.id)}
                                        className="font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                    >
                                        Mở Ma Trận KOC
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Shortcuts & Tools */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary-600" />
                    Phím Tắt & Công Cụ Nhanh
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link
                        href={route('creators.index')}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-primary-50/50 hover:border-primary-200 transition-colors text-left group"
                    >
                        <Users className="h-5 w-5 text-slate-600 group-hover:text-primary-600 mb-1.5 transition-colors" />
                        <span className="text-xs font-bold text-slate-900 block">Master CRM</span>
                        <span className="text-[11px] text-slate-500 block">Tra cứu & lọc KOC</span>
                    </Link>

                    <Link
                        href={route('creators.import.view')}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-primary-50/50 hover:border-primary-200 transition-colors text-left group"
                    >
                        <FolderKanban className="h-5 w-5 text-slate-600 group-hover:text-primary-600 mb-1.5 transition-colors" />
                        <span className="text-xs font-bold text-slate-900 block">Nhập Excel</span>
                        <span className="text-[11px] text-slate-500 block">Import danh sách KOC</span>
                    </Link>

                    <Link
                        href={route('outreach.index')}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-primary-50/50 hover:border-primary-200 transition-colors text-left group"
                    >
                        <MessageSquare className="h-5 w-5 text-slate-600 group-hover:text-primary-600 mb-1.5 transition-colors" />
                        <span className="text-xs font-bold text-slate-900 block">Tiếp Cận Zalo</span>
                        <span className="text-[11px] text-slate-500 block">Mẫu tin & Deep-link</span>
                    </Link>

                    <Link
                        href={route('content.index')}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-primary-50/50 hover:border-primary-200 transition-colors text-left group"
                    >
                        <Video className="h-5 w-5 text-slate-600 group-hover:text-primary-600 mb-1.5 transition-colors" />
                        <span className="text-xs font-bold text-slate-900 block">Nghiệm Thu Video</span>
                        <span className="text-[11px] text-slate-500 block">Duyệt & đo lường view</span>
                    </Link>
                </div>
            </div>

            {/* Modal Nhắc Zalo 1-Chạm Thông Minh */}
            <QuickZaloReminderModal
                isOpen={quickZaloModalId !== null}
                campaignCreatorId={quickZaloModalId}
                onClose={() => setQuickZaloModalId(null)}
                onSuccess={(msg) => {
                    setDashboardToast(msg);
                    setTimeout(() => setDashboardToast(null), 3000);
                }}
            />

            {/* Toast feedback nếu có */}
            {dashboardToast && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl text-xs font-semibold animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{dashboardToast}</span>
                </div>
            )}
        </AppLayout>
    );
}