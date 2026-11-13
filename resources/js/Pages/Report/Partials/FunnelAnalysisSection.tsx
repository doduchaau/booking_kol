import React from 'react';
import Badge from '@/Components/Common/Badge';
import {
    Filter,
    Lightbulb,
    AlertCircle,
    Clock,
    Layers,
    UserCheck,
    UserX,
    TrendingDown,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    BarChart2,
} from 'lucide-react';

export interface FunnelStep {
    name: string;
    stage: string;
    count: number;
    conversion_rate: number;
    drop_rate: number;
}

export interface DropOffAnalysis {
    declined_count: number;
    no_show_count: number;
    contact_drop_rate: number;
    agreed_drop_rate: number;
    sample_drop_rate: number;
    posted_drop_rate: number;
    biggest_drop_stage: string;
    bottleneck_advice: string;
}

export interface TierConversionItem {
    tier: string;
    total_kocs: number;
    posted_kocs: number;
    conversion_rate: number;
    total_fee: number;
}

export interface CycleTimeInfo {
    avg_days_to_agree: number;
    avg_days_shipping: number;
    avg_days_to_post: number;
}

interface FunnelAnalysisSectionProps {
    funnel: {
        steps: FunnelStep[];
        total_candidates: number;
        total_posted: number;
        overall_conversion_rate: number;
        drop_off_analysis?: DropOffAnalysis;
        tier_conversion?: TierConversionItem[];
        cycle_time?: CycleTimeInfo;
    };
    formatVND: (amount: number) => string;
}

export default function FunnelAnalysisSection({
    funnel,
    formatVND,
}: FunnelAnalysisSectionProps) {
    const dropOff = funnel.drop_off_analysis;
    const tierConversion = funnel.tier_conversion || [];
    const cycleTime = funnel.cycle_time;

    const getTierBadge = (tier: string) => {
        switch (tier.toLowerCase()) {
            case 'nano':
                return <Badge variant="default">Nano (&lt;10k)</Badge>;
            case 'micro':
                return <Badge variant="primary">Micro (10k-50k)</Badge>;
            case 'macro':
                return <Badge variant="info">Macro (50k-500k)</Badge>;
            case 'celeb':
                return <Badge variant="warning">Celeb (&gt;500k)</Badge>;
            default:
                return <Badge variant="default">{tier}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Khối Điểm Nghẽn & Khuyến Nghị Tối Ưu Phễu */}
            {dropOff && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Thẻ Điểm Nghẽn & Gợi Ý */}
                    <div className="lg:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                                        <Lightbulb className="h-5 w-5" />
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Phát Hiện Điểm Nghẽn Phễu & Gợi Ý Hành Động
                                    </h3>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                                    <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                                    Điểm rớt lớn: {dropOff.biggest_drop_stage}
                                </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed mt-2 font-medium">
                                💡 {dropOff.bottleneck_advice}
                            </p>
                        </div>

                        {/* Thống kê KOC từ chối & Bom hàng */}
                        <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <UserX className="h-4 w-4 text-rose-500" />
                                    KOC từ chối hợp tác: <strong className="text-rose-600 font-bold">{dropOff.declined_count} KOC</strong>
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    Bom hàng / Quá hạn bỏ cuộc: <strong className="text-amber-700 font-bold">{dropOff.no_show_count} KOC</strong>
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                Tỷ lệ hoàn thành toàn phễu: <strong className="text-emerald-600 font-bold">{funnel.overall_conversion_rate}%</strong>
                            </span>
                        </div>
                    </div>

                    {/* Thẻ Tốc Độ Chu Kỳ Vận Hành */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="p-1.5 rounded-lg bg-primary-50 text-primary-600">
                                    <Clock className="h-5 w-5" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Tốc Độ Chu Kỳ Phễu (Cycle Velocity)
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                                Thời gian trung bình chuyển đổi giữa các mốc trong chiến dịch.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        Mới &rarr; Chốt hợp tác:
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {cycleTime?.avg_days_to_agree ?? 0} ngày
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        Gửi mẫu &rarr; Nhận mẫu:
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {cycleTime?.avg_days_shipping ?? 0} ngày
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Nhận mẫu &rarr; Lên video:
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {cycleTime?.avg_days_to_post ?? 0} ngày
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                            <span>* Tính trên các KOC đã qua mốc</span>
                            <span className="text-primary-600 font-semibold flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Tối ưu &lt; 14 ngày
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Bảng Phân Tích Chuyển Đổi Theo Phân Hạng KOC (Tier Breakdown) */}
            {tierConversion.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                                <Layers className="h-5 w-5" />
                            </span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Hiệu Suất Chuyển Đổi Theo Phân Hạng KOC (Tier Breakdown)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    So sánh tỷ lệ chốt và xuất bản video thành công giữa Nano, Micro, Macro để tối ưu phân bổ ngân sách.
                                </p>
                            </div>
                        </div>
                        <Badge variant="default" size="sm">
                            {tierConversion.length} phân hạng
                        </Badge>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 uppercase tracking-wider font-semibold">
                                    <th className="py-3 px-5">Phân Hạng (Tier)</th>
                                    <th className="py-3 px-5 text-center">Tổng KOC Tiếp Cận</th>
                                    <th className="py-3 px-5 text-center">Lên Video Thành Công</th>
                                    <th className="py-3 px-5">Tỷ Lệ Hoàn Thành</th>
                                    <th className="py-3 px-5 text-right">Tổng Thù Lao Booking</th>
                                    <th className="py-3 px-5 text-right">Chi Phí / Video Hoàn Tất</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tierConversion.map((row) => {
                                    const costPerVideo = row.posted_kocs > 0 ? Math.round(row.total_fee / row.posted_kocs) : 0;
                                    return (
                                        <tr key={row.tier} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-5 font-semibold text-slate-900">
                                                {getTierBadge(row.tier)}
                                            </td>
                                            <td className="py-3 px-5 text-center font-bold text-slate-800">
                                                {row.total_kocs} <span className="font-normal text-slate-500">KOC</span>
                                            </td>
                                            <td className="py-3 px-5 text-center font-bold text-emerald-600">
                                                {row.posted_kocs} <span className="font-normal text-slate-500">video</span>
                                            </td>
                                            <td className="py-3 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                                            style={{ width: `${Math.min(row.conversion_rate, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-slate-800">
                                                        {row.conversion_rate}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 text-right font-semibold text-slate-800">
                                                {formatVND(row.total_fee)}
                                            </td>
                                            <td className="py-3 px-5 text-right font-bold text-primary-600">
                                                {costPerVideo > 0 ? formatVND(costPerVideo) : '0 đ'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
