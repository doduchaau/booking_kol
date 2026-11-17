import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Eye,
    Percent,
    Download,
    Filter,
    Calendar,
    Users,
    Video,
    Award,
    Trophy,
    ExternalLink,
    CheckCircle2,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight,
    HelpCircle,
    RotateCcw,
    RefreshCw,
    Layers,
    Play,
    Film,
    Check,
    Clock,
    SlidersHorizontal,
    Search,
    Edit3,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import PlatformBadge from '@/Components/Common/PlatformBadge';
import FunnelAnalysisSection, {
    DropOffAnalysis,
    TierConversionItem,
    CycleTimeInfo,
} from '@/Pages/Report/Partials/FunnelAnalysisSection';
import PlatformComparisonSection, {
    PlatformComparisonData,
} from '@/Pages/Report/Partials/PlatformComparisonSection';
import ExportReportModal from '@/Pages/Report/Partials/ExportReportModal';
import EditVideoMetricsModal from '@/Pages/Report/Partials/EditVideoMetricsModal';
import {
    ResponsiveContainer,
    ComposedChart,
    BarChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

export interface CampaignOption {
    id: number;
    name: string;
    product_name: string;
    status: string;
    budget: number;
}

export interface FunnelStep {
    name: string;
    stage: string;
    count: number;
    conversion_rate: number;
    drop_rate: number;
}

export interface WeeklyTrendItem {
    week: string;
    cost: number;
    gmv: number;
    views: number;
    roi: number;
}

export interface LeaderboardItem {
    rank: number;
    campaign_creator_id: number;
    creator_id: number;
    name: string;
    handle: string;
    platform: string;
    tier: string;
    avatar_url?: string;
    campaign_name: string;
    views_count: number;
    likes_count: number;
    gmv_amount: number;
    booking_fee: number;
    sample_cost?: number;
    total_cost: number;
    cpv: number;
    roi_percentage: number;
    videos_count: number;
    latest_video_url?: string;
    status: string;
}

export interface StaffPerformanceItem {
    staff_id: number;
    staff_name: string;
    staff_email: string;
    roles: string[];
    total_assigned: number;
    contacted_count: number;
    agreed_count: number;
    samples_sent_count: number;
    posted_count: number;
    close_rate: number;
    completion_rate: number;
    total_gmv: number;
    rating: 'excellent' | 'good' | 'standard';
}

export interface KocVideoDetailItem {
    index: number;
    post_id: number;
    creator_name: string;
    creator_phone?: string;
    handle: string;
    platform: string;
    tier: string;
    staff_name: string;
    campaign_name: string;
    product_name: string;
    post_url: string;
    video_title: string;
    posted_at: string;
    deadline: string;
    delivery_status: string;
    post_status: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    gmv_amount: number;
    booking_fee: number;
    sample_cost: number;
    total_cost: number;
    cpv: number;
    roi_percentage: number;
}

export interface ReportIndexProps {
    campaigns: CampaignOption[];
    selectedCampaign?: CampaignOption | null;
    filters: {
        campaign_id?: number | null;
        filter_type?: 'month' | 'date_range';
        month?: number | null;
        year?: number | null;
        start_date?: string | null;
        end_date?: string | null;
        period_label?: string;
    };
    funnel: {
        steps: FunnelStep[];
        total_candidates: number;
        total_posted: number;
        overall_conversion_rate: number;
        drop_off_analysis?: DropOffAnalysis;
        tier_conversion?: TierConversionItem[];
        cycle_time?: CycleTimeInfo;
    };
    financial: {
        total_booking_cost: number;
        total_sample_cost: number;
        total_cost: number;
        total_views: number;
        total_likes: number;
        total_comments: number;
        total_shares: number;
        total_gmv: number;
        total_videos: number;
        net_profit: number;
        roi_percentage: number;
        cpv: number;
        weekly_trend: WeeklyTrendItem[];
    };
    leaderboard: {
        top_views: LeaderboardItem[];
        top_gmv: LeaderboardItem[];
    };
    staffPerformance: StaffPerformanceItem[];
    videoDetails?: KocVideoDetailItem[];
    platformComparison?: PlatformComparisonData | null;
}

export default function ReportIndex({
    campaigns,
    selectedCampaign,
    filters,
    funnel,
    financial,
    leaderboard,
    staffPerformance,
    videoDetails = [],
    platformComparison,
}: ReportIndexProps) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
        filters.campaign_id ? String(filters.campaign_id) : ''
    );
    const [filterType, setFilterType] = useState<'month' | 'date_range'>(
        filters.month ? 'month' : (filters.start_date ? 'date_range' : 'month')
    );
    const [selectedMonth, setSelectedMonth] = useState<number>(
        filters.month || currentMonth
    );
    const [selectedYear, setSelectedYear] = useState<number>(
        filters.year || currentYear
    );
    const [startDate, setStartDate] = useState<string>(filters.start_date || '');
    const [endDate, setEndDate] = useState<string>(filters.end_date || '');
    const [leaderboardTab, setLeaderboardTab] = useState<'views' | 'gmv'>('views');
    const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
    const [videoSearchQuery, setVideoSearchQuery] = useState<string>('');
    const [syncingPostId, setSyncingPostId] = useState<number | null>(null);
    const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
    const [editingVideo, setEditingVideo] = useState<KocVideoDetailItem | null>(null);

    const handleSyncSingleVideo = (postId: number) => {
        setSyncingPostId(postId);
        router.post(
            // @ts-ignore
            route('content.sync', postId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncingPostId(null),
            }
        );
    };

    const handleSyncAllVideos = () => {
        if (confirm('Hệ thống sẽ kết nối API chính thức để làm mới chỉ số (Views, Likes) cho toàn bộ video đang chạy. Bạn có muốn tiếp tục?')) {
            setIsSyncingAll(true);
            router.post(
                // @ts-ignore
                route('content.sync_all'),
                {},
                {
                    preserveScroll: true,
                    onFinish: () => setIsSyncingAll(false),
                }
            );
        }
    };

    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const handleFilter = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const params: Record<string, any> = {
            campaign_id: selectedCampaignId || undefined,
            filter_type: filterType,
        };

        if (filterType === 'month') {
            params.month = selectedMonth;
            params.year = selectedYear;
        } else {
            params.start_date = startDate || undefined;
            params.end_date = endDate || undefined;
        }

        router.get(
            // @ts-ignore
            route('reports.index'),
            params,
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleQuickPreset = (preset: 'this_month' | 'last_month' | 'all') => {
        if (preset === 'this_month') {
            setFilterType('month');
            setSelectedMonth(currentMonth);
            setSelectedYear(currentYear);
            // @ts-ignore
            router.get(route('reports.index'), {
                campaign_id: selectedCampaignId || undefined,
                filter_type: 'month',
                month: currentMonth,
                year: currentYear,
            }, { preserveState: true });
        } else if (preset === 'last_month') {
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
            setFilterType('month');
            setSelectedMonth(prevMonth);
            setSelectedYear(prevYear);
            // @ts-ignore
            router.get(route('reports.index'), {
                campaign_id: selectedCampaignId || undefined,
                filter_type: 'month',
                month: prevMonth,
                year: prevYear,
            }, { preserveState: true });
        } else if (preset === 'all') {
            setSelectedCampaignId('');
            setStartDate('');
            setEndDate('');
            // @ts-ignore
            router.get(route('reports.index'), {}, { preserveState: true });
        }
    };

    const handleReset = () => {
        setSelectedCampaignId('');
        setStartDate('');
        setEndDate('');
        setFilterType('month');
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
        // @ts-ignore
        router.get(route('reports.index'), {}, { preserveState: true });
    };

    const activeLeaderboard = leaderboardTab === 'views' ? leaderboard.top_views : leaderboard.top_gmv;

    // Lọc danh sách video theo từ khóa tìm kiếm
    const filteredVideoDetails = videoDetails.filter((v) => {
        if (!videoSearchQuery.trim()) return true;
        const query = videoSearchQuery.toLowerCase();
        return (
            v.creator_name.toLowerCase().includes(query) ||
            v.handle.toLowerCase().includes(query) ||
            v.video_title.toLowerCase().includes(query) ||
            v.platform.toLowerCase().includes(query)
        );
    });

    // Màu sắc từng bước phễu
    const funnelColors = ['#6366F1', '#4F46E5', '#3B82F6', '#0EA5E9', '#10B981'];

    return (
        <AppLayout title="Báo Cáo Hiệu Quả & Phân Tích ROI">
            <Head title="Báo Cáo Hiệu Quả & Phân Tích ROI" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* 1. Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-primary-50 text-primary-600">
                                <BarChart3 className="h-6 w-6" />
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Báo Cáo Hiệu Quả & Phân Tích ROI
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Phân tích dữ liệu thực tế phễu chuyển đổi KOC, tối ưu hóa ngân sách và nghiệm thu video chi tiết.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            iconLeft={<Download className="h-4 w-4" />}
                            onClick={() => setIsExportModalOpen(true)}
                        >
                            Xuất Báo Cáo Excel (.xlsx)
                        </Button>
                    </div>
                </div>

                {/* 2. Enhanced Filter Bar with Month Selector & Presets */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                    {/* Top filter row: Mode switch & Presets */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Filter className="h-3.5 w-3.5 text-primary-600" /> Chế độ lọc:
                            </span>
                            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setFilterType('month')}
                                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                        filterType === 'month'
                                            ? 'bg-white text-primary-600 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Theo Tháng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterType('date_range')}
                                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                        filterType === 'date_range'
                                            ? 'bg-white text-primary-600 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Khoảng Ngày
                                </button>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 mr-1">Chọn nhanh:</span>
                            <button
                                type="button"
                                onClick={() => handleQuickPreset('this_month')}
                                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                            >
                                Tháng này
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickPreset('last_month')}
                                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                            >
                                Tháng trước
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickPreset('all')}
                                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                            >
                                Toàn bộ
                            </button>
                        </div>
                    </div>

                    {/* Filter controls row */}
                    <form
                        onSubmit={handleFilter}
                        className="flex flex-col md:flex-row items-stretch md:items-center gap-3 text-sm"
                    >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Chiến dịch */}
                            <div>
                                <select
                                    value={selectedCampaignId}
                                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                >
                                    <option value="">Tất cả chiến dịch</option>
                                    {campaigns.map((camp) => (
                                        <option key={camp.id} value={camp.id}>
                                            {camp.name} ({camp.product_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Trường lọc theo Tháng hoặc Khoảng Ngày */}
                            {filterType === 'month' ? (
                                <>
                                    {/* Chọn Tháng */}
                                    <div>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white font-medium"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                                <option key={m} value={m}>
                                                    Tháng {m < 10 ? `0${m}` : m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Chọn Năm */}
                                    <div>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white font-medium"
                                        >
                                            <option value={currentYear - 1}>Năm {currentYear - 1}</option>
                                            <option value={currentYear}>Năm {currentYear}</option>
                                            <option value={currentYear + 1}>Năm {currentYear + 1}</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Từ ngày */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-500 shrink-0">Từ:</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                        />
                                    </div>

                                    {/* Đến ngày */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-500 shrink-0">Đến:</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button type="submit" variant="primary" size="sm">
                                Áp dụng
                            </Button>
                            {(selectedCampaignId || startDate || endDate || filters.month) && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Đặt lại bộ lọc"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Filter Active Badge Bar */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>
                            Đang xem: <strong className="text-primary-600">{filters.period_label || 'Toàn thời gian'}</strong>
                            {selectedCampaign && (
                                <span> • Chiến dịch: <strong className="text-slate-800">{selectedCampaign.name}</strong></span>
                            )}
                        </span>
                        <span className="text-slate-400 italic">
                            * Dữ liệu tài chính & chi phí mẫu được tính từ đơn giá bán lẻ sản phẩm thực tế
                        </span>
                    </div>
                </div>

                {/* 3. Financial KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Tổng Chi Phí */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Tổng Chi Phí Thực Hiện
                            </span>
                            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                <DollarSign className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold tracking-tight text-slate-900">
                                {formatVND(financial.total_cost)}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <span>Booking: <strong>{formatVND(financial.total_booking_cost)}</strong></span>
                                <span>•</span>
                                <span title="Chi phí mẫu thực tế từ giá bán lẻ sản phẩm">
                                    Mẫu thật: <strong>{formatVND(financial.total_sample_cost)}</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Tổng GMV */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Tổng Doanh Thu (GMV)
                            </span>
                            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold tracking-tight text-emerald-600">
                                {formatVND(financial.total_gmv)}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="text-slate-700 font-medium">{financial.total_videos} video</span>
                                <span>hoàn tất nghiệm thu</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Tỷ Lệ ROI */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Tỷ Lệ Lợi Nhuận (ROI)
                            </span>
                            <span className={`p-2 rounded-lg ${financial.roi_percentage >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                <Percent className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold tracking-tight ${financial.roi_percentage >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                                    {financial.roi_percentage > 0 ? `+${financial.roi_percentage}%` : `${financial.roi_percentage}%`}
                                </span>
                                {financial.roi_percentage >= 0 ? (
                                    <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                        <ArrowUpRight className="h-3 w-3 mr-0.5" /> Lãi
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                        <ArrowDownRight className="h-3 w-3 mr-0.5" /> Lỗ
                                    </span>
                                )}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                Lợi nhuận ròng: <strong>{formatVND(financial.net_profit)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: CPV & Lượt xem */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Chi Phí / Lượt Xem (CPV)
                            </span>
                            <span className="p-2 rounded-lg bg-sky-50 text-sky-600">
                                <Eye className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold tracking-tight text-slate-900">
                                {formatNumber(financial.cpv)} đ <span className="text-xs font-normal text-slate-500">/ view</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                Tổng lượt xem: <strong className="text-slate-700">{formatNumber(financial.total_views)}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Charts Section: Funnel & Weekly Composed Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Funnel Chart: Phễu chuyển đổi KOC */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span>Phễu Chuyển Đổi KOC</span>
                                    <span className="text-xs font-normal text-slate-500">(Pipeline Funnel)</span>
                                </h2>
                                <Badge variant="primary" size="sm">
                                    {funnel.overall_conversion_rate}% chuyển đổi
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mb-6">
                                Đo lường tỷ lệ giữ chân và mức độ hao hụt qua 5 giai đoạn tiếp cận KOC.
                            </p>

                            {/* Horizontal Funnel Progress Bars */}
                            <div className="space-y-4">
                                {funnel.steps.map((step, idx) => {
                                    const maxCount = Math.max(funnel.total_candidates, 1);
                                    const widthPercent = Math.max(12, Math.round((step.count / maxCount) * 100));

                                    return (
                                        <div key={step.stage} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-800 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    {step.name}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {step.count} <span className="text-xs font-normal text-slate-500">KOC</span>
                                                    </span>
                                                    {idx > 0 && (
                                                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                            {step.conversion_rate}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress Bar Container */}
                                            <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden flex relative">
                                                <div
                                                    className="h-full transition-all duration-500 rounded-lg flex items-center px-3"
                                                    style={{
                                                        width: `${widthPercent}%`,
                                                        backgroundColor: funnelColors[idx % funnelColors.length],
                                                    }}
                                                >
                                                    <span className="text-[11px] font-bold text-white tracking-wide">
                                                        {step.count}
                                                    </span>
                                                </div>

                                                {idx > 0 && step.drop_rate > 0 && (
                                                    <span className="absolute right-2 top-1 text-[10px] text-slate-400 font-mono">
                                                        Hao hụt: {step.drop_rate}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Từ {funnel.total_candidates} KOC tiềm năng</span>
                            <span className="font-semibold text-emerald-600">
                                Đạt {funnel.total_posted} video xuất bản thành công
                            </span>
                        </div>
                    </div>

                    {/* Composed Chart: Chi phí, GMV & ROI theo tuần */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span>Xu Hướng Chi Phí, Doanh Thu & ROI</span>
                                    <span className="text-xs font-normal text-slate-500">
                                        ({filters.period_label || 'Theo Tuần'})
                                    </span>
                                </h2>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" /> Diễn biến thực tế
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                                So sánh tương quan giữa chi phí đầu tư booking (cột tím), doanh số GMV mang lại (cột xanh) và tỷ lệ ROI (đường cam).
                            </p>

                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={financial.weekly_trend}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="week"
                                            stroke="#64748b"
                                            fontSize={11}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            stroke="#64748b"
                                            fontSize={11}
                                            tickLine={false}
                                            tickFormatter={(val) => `${val >= 1000000 ? (val / 1000000).toFixed(0) + 'Tr' : val}`}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            stroke="#f97316"
                                            fontSize={11}
                                            tickLine={false}
                                            tickFormatter={(val) => `${val}%`}
                                        />
                                        <Tooltip
                                            formatter={(value: any, name: any) => {
                                                if (name === 'ROI (%)') return [`${value}%`, name];
                                                return [formatVND(Number(value)), name];
                                            }}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                fontSize: '12px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '12px' }}
                                        />
                                        <Bar
                                            yAxisId="left"
                                            dataKey="cost"
                                            name="Chi Phí Booking"
                                            fill="#6366F1"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={32}
                                        />
                                        <Bar
                                            yAxisId="left"
                                            dataKey="gmv"
                                            name="Doanh Thu GMV"
                                            fill="#10B981"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={32}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="roi"
                                            name="ROI (%)"
                                            stroke="#f97316"
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: '#f97316' }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>* Số liệu được tổng hợp theo các video phát sinh chỉ số trong kỳ</span>
                            <span className="font-medium text-slate-700">Đơn vị: VND / %</span>
                        </div>
                    </div>
                </div>

                {/* 4.4. So Sánh Hiệu Quả Đa Nền Tảng (TikTok vs Shopee Video vs Facebook Reels) */}
                <PlatformComparisonSection
                    data={platformComparison}
                    formatVND={formatVND}
                    formatNumber={formatNumber}
                />

                {/* 4.5. Phân Tích Chuyên Sâu Hao Hụt & Chuyển Đổi Phễu */}
                <FunnelAnalysisSection funnel={funnel} formatVND={formatVND} />

                {/* 5. Trọng Tâm Nghiệm Thu: Chi Tiết Video & Ngày Lên Video Cho Từng KOC */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                                    <Film className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Chi Tiết Video Nghiệm Thu & Ngày Lên Bài Từng KOC
                                </h2>
                                <Badge variant="primary" size="sm">
                                    {videoDetails.length} Video
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Danh sách chi tiết đường dẫn video, thời gian lên bài thực tế, đối chiếu deadline và chỉ số của từng KOC trong kỳ.
                            </p>
                        </div>

                        {/* Search Input for Videos & Bulk Sync */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            <div className="w-full sm:w-64 relative">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={videoSearchQuery}
                                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                                    placeholder="Tìm KOC, handle, tiêu đề..."
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSyncAllVideos}
                                disabled={isSyncingAll}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 shrink-0 shadow-2xs cursor-pointer"
                                title="Đồng bộ chỉ số thực tế từ API chính thức cho toàn bộ video"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin text-primary-600' : 'text-slate-500'}`} />
                                {isSyncingAll ? 'Đang cập nhật...' : 'Đồng bộ tất cả'}
                            </button>
                        </div>
                    </div>

                    {/* Table Video Details */}
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-xs">
                                <tr>
                                    <th className="px-5 py-3.5">KOC / Creator</th>
                                    <th className="px-5 py-3.5">Video & Nền Tảng</th>
                                    <th className="px-5 py-3.5">Ngày Lên Video Thực Tế</th>
                                    <th className="px-5 py-3.5">Hạn Chót (Deadline)</th>
                                    <th className="px-5 py-3.5 text-right">Lượt Xem (Views)</th>
                                    <th className="px-5 py-3.5 text-right">Doanh Thu (GMV)</th>
                                    <th className="px-5 py-3.5 text-right">Chi Phí KOC</th>
                                    <th className="px-5 py-3.5 text-right">CPV</th>
                                    <th className="px-5 py-3.5 text-right">ROI (%)</th>
                                    <th className="px-5 py-3.5 text-center">Đồng Bộ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredVideoDetails.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                                            {videoSearchQuery
                                                ? 'Không tìm thấy video nào khớp với từ khóa tìm kiếm.'
                                                : 'Chưa có video nào phát sinh trong kỳ báo cáo đã chọn.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVideoDetails.map((v) => {
                                        const isLate = v.delivery_status.includes('Trễ hạn');
                                        const hasGmv = v.gmv_amount > 0;
                                        return (
                                            <tr key={v.post_id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <div className="font-bold text-slate-900">
                                                            {v.creator_name}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-mono">
                                                            {v.handle} • {v.tier}
                                                        </div>
                                                        {v.staff_name && (
                                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                                Phụ trách: {v.staff_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <PlatformBadge platform={v.platform.toLowerCase()} size="xs" />
                                                            <span className="font-semibold text-xs text-slate-800 line-clamp-1 max-w-[200px]" title={v.video_title}>
                                                                {v.video_title}
                                                            </span>
                                                        </div>
                                                        {v.post_url ? (
                                                            <a
                                                                href={v.post_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium hover:underline"
                                                            >
                                                                Xem video <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Không có link</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="space-y-0.5">
                                                        <div className="font-medium text-slate-900 text-xs">
                                                            {v.posted_at}
                                                        </div>
                                                        <div>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                isLate
                                                                    ? 'bg-rose-50 text-rose-700'
                                                                    : 'bg-emerald-50 text-emerald-700'
                                                            }`}>
                                                                {v.delivery_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-xs text-slate-600">
                                                    {v.deadline}
                                                </td>

                                                <td className="px-5 py-4 text-right font-bold text-slate-900">
                                                    {formatNumber(v.views_count)}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    {hasGmv ? (
                                                        <span className="font-bold text-emerald-600">
                                                            {formatVND(v.gmv_amount)}
                                                        </span>
                                                    ) : (
                                                        <div>
                                                            <span className="font-medium text-slate-500">0 đ</span>
                                                            <div className="text-[10px] text-slate-400">Chưa đối soát</div>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="font-medium text-slate-900 text-xs">
                                                        {formatVND(v.total_cost)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Thù lao: {formatVND(v.booking_fee)}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-right font-mono text-xs text-slate-600">
                                                    {formatNumber(v.cpv)} đ
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    {hasGmv ? (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                            v.roi_percentage >= 0
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-rose-50 text-rose-700'
                                                        }`}>
                                                            {v.roi_percentage >= 0 ? `+${v.roi_percentage}%` : `${v.roi_percentage}%`}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-400"
                                                            title="Chưa đối soát doanh thu GMV từ sàn"
                                                        >
                                                            -
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSyncSingleVideo(v.post_id)}
                                                            disabled={syncingPostId === v.post_id}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                                                            title="Đồng bộ chỉ số thực tế từ API"
                                                        >
                                                            <RefreshCw className={`h-3 w-3 ${syncingPostId === v.post_id ? 'animate-spin text-primary-600' : 'text-slate-500'}`} />
                                                            {syncingPostId === v.post_id ? 'Đang lấy...' : 'Làm mới'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingVideo(v)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                                                            title="Chỉnh sửa hoặc nhập chỉ số đối soát thủ công"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Top Creator Leaderboard */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                                    <Trophy className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Bảng Vinh Danh Top Creator
                                </h2>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Xếp hạng các KOC mang lại hiệu quả lượt xem và doanh thu cao nhất cho chiến dịch trong kỳ.
                            </p>
                        </div>

                        {/* Switch Tab Views / GMV */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setLeaderboardTab('views')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    leaderboardTab === 'views'
                                        ? 'bg-white text-primary-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Top 10 Lượt Xem (Views)
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeaderboardTab('gmv')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    leaderboardTab === 'gmv'
                                        ? 'bg-white text-primary-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Top 10 Doanh Thu (GMV)
                            </button>
                        </div>
                    </div>

                    {/* Leaderboard Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3.5 w-16 text-center">Hạng</th>
                                    <th className="px-6 py-3.5">Creator / KOC</th>
                                    <th className="px-6 py-3.5">Nền Tảng & Tier</th>
                                    <th className="px-6 py-3.5 text-right">Lượt Xem (Views)</th>
                                    <th className="px-6 py-3.5 text-right">Doanh Thu (GMV)</th>
                                    <th className="px-6 py-3.5 text-right">Phí Booking</th>
                                    <th className="px-6 py-3.5 text-right">CPV (Chi phí/view)</th>
                                    <th className="px-6 py-3.5 text-right">ROI (%)</th>
                                    <th className="px-6 py-3.5 text-center">Video</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeLeaderboard.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                                            Chưa có dữ liệu Creator đạt chuẩn xếp hạng trong kỳ đã chọn.
                                        </td>
                                    </tr>
                                ) : (
                                    activeLeaderboard.map((koc) => {
                                        let rankBadge = (
                                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center mx-auto">
                                                {koc.rank}
                                            </span>
                                        );
                                        if (koc.rank === 1) {
                                            rankBadge = (
                                                <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center mx-auto shadow-sm ring-2 ring-amber-300">
                                                    🥇
                                                </span>
                                            );
                                        } else if (koc.rank === 2) {
                                            rankBadge = (
                                                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center mx-auto shadow-sm">
                                                    🥈
                                                </span>
                                            );
                                        } else if (koc.rank === 3) {
                                            rankBadge = (
                                                <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center mx-auto shadow-sm">
                                                    🥉
                                                </span>
                                            );
                                        }

                                        return (
                                            <tr key={koc.campaign_creator_id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-6 py-4 text-center">{rankBadge}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                                                            {koc.avatar_url ? (
                                                                <img
                                                                    src={koc.avatar_url}
                                                                    alt={koc.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                koc.name.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">
                                                                {koc.name}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-mono">
                                                                {koc.handle}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <PlatformBadge platform={koc.platform} size="xs" />
                                                        <Badge variant="info" size="sm">
                                                            {koc.tier.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                    {formatNumber(koc.views_count)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                    {formatVND(koc.gmv_amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                    {formatVND(koc.booking_fee)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-xs font-mono text-slate-600">
                                                    {formatNumber(koc.cpv)} đ
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                            koc.roi_percentage >= 0
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-rose-50 text-rose-700'
                                                        }`}
                                                    >
                                                        {koc.roi_percentage >= 0 ? `+${koc.roi_percentage}%` : `${koc.roi_percentage}%`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {koc.latest_video_url ? (
                                                        <a
                                                            href={koc.latest_video_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-semibold"
                                                        >
                                                            Xem ({koc.videos_count})
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">
                                                            {koc.videos_count} video
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 7. Staff Performance Report */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                                    <Users className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Báo Cáo Năng Suất Nhân Viên Booking
                                </h2>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Đánh giá tỷ lệ hoàn thành công việc, số lượng KOC chốt hợp tác và doanh thu do từng nhân viên tạo ra trong kỳ.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3.5">Nhân Viên Phụ Trách</th>
                                    <th className="px-6 py-3.5 text-center">KOC Được Gán</th>
                                    <th className="px-6 py-3.5 text-center">Đã Liên Hệ</th>
                                    <th className="px-6 py-3.5 text-center">Đã Chốt Hợp Tác</th>
                                    <th className="px-6 py-3.5 text-right">Tỷ Lệ Chốt</th>
                                    <th className="px-6 py-3.5 text-center">Mẫu Đã Gửi</th>
                                    <th className="px-6 py-3.5 text-center">Video Nghiệm Thu</th>
                                    <th className="px-6 py-3.5 text-right">Tỷ Lệ Hoàn Thành</th>
                                    <th className="px-6 py-3.5 text-right">Tổng GMV Tạo Ra</th>
                                    <th className="px-6 py-3.5 text-center">Đánh Giá</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staffPerformance.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                                            Chưa có nhân viên nào được phân công phụ trách KOC trong kỳ này.
                                        </td>
                                    </tr>
                                ) : (
                                    staffPerformance.map((staff) => (
                                        <tr key={staff.staff_id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-bold text-slate-900">
                                                        {staff.staff_name}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {staff.staff_email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-800">
                                                {staff.total_assigned}
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-slate-600">
                                                {staff.contacted_count}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-indigo-600">
                                                {staff.agreed_count}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                                {staff.close_rate}%
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-slate-600">
                                                {staff.samples_sent_count}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-emerald-600">
                                                {staff.posted_count}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                {staff.completion_rate}%
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                {formatVND(staff.total_gmv)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {staff.rating === 'excellent' && (
                                                    <Badge variant="success" size="sm">
                                                        Xuất Sắc
                                                    </Badge>
                                                )}
                                                {staff.rating === 'good' && (
                                                    <Badge variant="info" size="sm">
                                                        Tốt
                                                    </Badge>
                                                )}
                                                {staff.rating === 'standard' && (
                                                    <Badge variant="default" size="sm">
                                                        Tiêu Chuẩn
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Custom Export Options Modal */}
            <ExportReportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                campaignId={selectedCampaignId ? Number(selectedCampaignId) : null}
                campaignName={selectedCampaign?.name}
                periodLabel={filters.period_label || 'Toàn thời gian'}
                month={filterType === 'month' ? selectedMonth : null}
                year={filterType === 'month' ? selectedYear : null}
                startDate={filterType === 'date_range' ? startDate : null}
                endDate={filterType === 'date_range' ? endDate : null}
            />

            {/* Manual Edit Video Metrics Modal */}
            <EditVideoMetricsModal
                isOpen={editingVideo !== null}
                onClose={() => setEditingVideo(null)}
                video={editingVideo}
            />
        </AppLayout>
    );
}
