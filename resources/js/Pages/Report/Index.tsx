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
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
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
    Cell,
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

export interface ReportIndexProps {
    campaigns: CampaignOption[];
    selectedCampaign?: CampaignOption | null;
    filters: {
        campaign_id?: number | null;
        start_date?: string | null;
        end_date?: string | null;
    };
    funnel: {
        steps: FunnelStep[];
        total_candidates: number;
        total_posted: number;
        overall_conversion_rate: number;
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
}

export default function ReportIndex({
    campaigns,
    selectedCampaign,
    filters,
    funnel,
    financial,
    leaderboard,
    staffPerformance,
}: ReportIndexProps) {
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
        filters.campaign_id ? String(filters.campaign_id) : ''
    );
    const [startDate, setStartDate] = useState<string>(filters.start_date || '');
    const [endDate, setEndDate] = useState<string>(filters.end_date || '');
    const [leaderboardTab, setLeaderboardTab] = useState<'views' | 'gmv'>('views');

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
        router.get(
            // @ts-ignore
            route('reports.index'),
            {
                campaign_id: selectedCampaignId || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleReset = () => {
        setSelectedCampaignId('');
        setStartDate('');
        setEndDate('');
        // @ts-ignore
        router.get(route('reports.index'), {}, { preserveState: true });
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams();
        if (selectedCampaignId) params.append('campaign_id', selectedCampaignId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        // @ts-ignore
        const exportUrl = route('reports.export') + (params.toString() ? `?${params.toString()}` : '');
        window.location.href = exportUrl;
    };

    const activeLeaderboard = leaderboardTab === 'views' ? leaderboard.top_views : leaderboard.top_gmv;

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
                            Phân tích chuyên sâu phễu chuyển đổi KOC, tối ưu hóa ngân sách và đánh giá năng suất đội ngũ booking.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            iconLeft={<Download className="h-4 w-4" />}
                            onClick={handleExportExcel}
                        >
                            Xuất Báo Cáo Excel (.xlsx)
                        </Button>
                    </div>
                </div>

                {/* 2. Filter Bar */}
                <form
                    onSubmit={handleFilter}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3 text-sm"
                >
                    <div className="flex items-center gap-2 text-slate-600 font-medium shrink-0">
                        <Filter className="h-4 w-4 text-primary-600" />
                        <span>Bộ lọc:</span>
                    </div>

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
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button type="submit" variant="secondary" size="sm">
                            Áp dụng
                        </Button>
                        {(selectedCampaignId || startDate || endDate) && (
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
                                <span>Mẫu: <strong>{formatVND(financial.total_sample_cost)}</strong></span>
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
                                    <span className="text-xs font-normal text-slate-500">(Theo Tuần)</span>
                                </h2>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" /> 8 tuần gần nhất
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
                            <span>* Số liệu được tổng hợp theo các video phát sinh chỉ số trong tuần</span>
                            <span className="font-medium text-slate-700">Đơn vị: VND / %</span>
                        </div>
                    </div>
                </div>

                {/* 5. Top Creator Leaderboard */}
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
                                Xếp hạng các KOC mang lại hiệu quả lượt xem và doanh thu cao nhất cho chiến dịch.
                            </p>
                        </div>

                        {/* Switch Tab Views / GMV */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setLeaderboardTab('views')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${leaderboardTab === 'views'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Top 10 Lượt Xem (Views)
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeaderboardTab('gmv')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${leaderboardTab === 'gmv'
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
                                            Chưa có dữ liệu Creator đạt chuẩn xếp hạng.
                                        </td>
                                    </tr>
                                ) : (
                                    activeLeaderboard.map((koc) => {
                                        // Huy chương hạng 1, 2, 3
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
                                                        <Badge variant="default" size="sm">
                                                            {koc.platform.toUpperCase()}
                                                        </Badge>
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
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${koc.roi_percentage >= 0
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

                {/* 6. Staff Performance Report */}
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
                                Đánh giá tỷ lệ hoàn thành công việc, số lượng KOC chốt hợp tác và doanh thu do từng nhân viên tạo ra.
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
                                            Chưa có nhân viên nào được phân công phụ trách KOC.
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
        </AppLayout>
    );
}
