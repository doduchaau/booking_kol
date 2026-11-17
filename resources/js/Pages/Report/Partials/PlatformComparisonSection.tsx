import React from 'react';
import PlatformIcon from '@/Components/Common/PlatformIcon';
import Badge from '@/Components/Common/Badge';
import { Layers, Eye, DollarSign, Award, TrendingUp, CheckCircle2, Percent, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export interface PlatformMetricItem {
    platform: string;
    label: string;
    video_count: number;
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    gmv_amount: number;
    cost: number;
    cpv: number;
    engagement_rate: number;
    compliance_rate: number;
    avg_compliance_score: number;
    views_share: number;
    cost_share: number;
}

export interface PlatformComparisonData {
    total_platforms: number;
    platforms: PlatformMetricItem[];
    total_views: number;
    total_cost: number;
}

interface Props {
    data?: PlatformComparisonData | null;
    formatVND: (amount: number) => string;
    formatNumber: (amount: number) => string;
}

export default function PlatformComparisonSection({
    data,
    formatVND,
    formatNumber,
}: Props) {
    if (!data || !data.platforms || data.platforms.length === 0) {
        return null;
    }

    // Tìm nền tảng có CPV rẻ nhất (tối ưu ngân sách nhất)
    const validCpvList = data.platforms.filter((p) => p.views_count > 0 && p.cpv > 0);
    const bestCpvPlatform = validCpvList.length > 0
        ? validCpvList.reduce((prev, curr) => (curr.cpv < prev.cpv ? curr : prev))
        : null;

    // Chuẩn bị dữ liệu cho biểu đồ so sánh Recharts
    const chartData = data.platforms.map((p) => ({
        name: p.label,
        platform: p.platform,
        views: p.views_count,
        cost: p.cost,
        cpv: p.cpv,
        compliance: p.compliance_rate,
    }));

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                            <Layers className="h-5 w-5" />
                        </span>
                        <h2 className="text-lg font-bold text-slate-900">
                            So Sánh Hiệu Quả Đa Nền Tảng (TikTok vs Shopee Video vs Facebook Reels)
                        </h2>
                        <Badge variant="primary" size="sm">
                            {data.platforms.length} Kênh Xuất Bản
                        </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Đối chiếu chi phí, số lượng video, CPV, tỷ lệ tương tác (ER) và tỷ lệ tuân thủ brief (Compliance) trên từng nền tảng.
                    </p>
                </div>

                {bestCpvPlatform && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                        <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                            Kênh tối ưu chi phí nhất: <strong>{bestCpvPlatform.label}</strong> ({formatNumber(bestCpvPlatform.cpv)} đ/view)
                        </span>
                    </div>
                )}
            </div>

            {/* Grid Thẻ Tổng Quan Từng Kênh */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.platforms.map((item) => {
                    const isBestCpv = bestCpvPlatform && bestCpvPlatform.platform === item.platform;
                    return (
                        <div
                            key={item.platform}
                            className={`p-4 rounded-xl border transition-all ${
                                isBestCpv
                                    ? 'bg-emerald-50/20 border-emerald-200 ring-1 ring-emerald-500/20'
                                    : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-slate-200">
                                        <PlatformIcon platform={item.platform} className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-sm text-slate-800">{item.label}</span>
                                </div>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                    {item.video_count} video
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                                    <span className="text-[11px] text-slate-400 block mb-0.5">Lượt xem</span>
                                    <strong className="text-slate-900 font-bold text-sm block">
                                        {formatNumber(item.views_count)}
                                    </strong>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {item.views_share}% tổng views
                                    </span>
                                </div>

                                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                                    <span className="text-[11px] text-slate-400 block mb-0.5">Chi phí Booking</span>
                                    <strong className="text-slate-900 font-bold text-sm block">
                                        {formatVND(item.cost)}
                                    </strong>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {item.cost_share}% ngân sách
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Đơn giá / View (CPV):</span>
                                    <strong className={isBestCpv ? 'text-emerald-600 font-bold' : 'text-slate-800'}>
                                        {formatNumber(item.cpv)} đ
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Tỷ lệ tương tác (ER):</span>
                                    <span className="font-medium text-slate-700">{item.engagement_rate}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Tuân thủ Brief:</span>
                                    <span className={`font-semibold ${item.compliance_rate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {item.compliance_rate}% ({item.avg_compliance_score}/100đ)
                                    </span>
                                </div>
                                {item.gmv_amount > 0 && (
                                    <div className="flex items-center justify-between text-indigo-600 font-medium pt-1">
                                        <span>Doanh thu GMV:</span>
                                        <strong>{formatVND(item.gmv_amount)}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bảng So Sánh Chi Tiết & Biểu Đồ Minh Họa */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* Biểu đồ phân bổ lượt xem theo nền tảng */}
                <div className="lg:col-span-6 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-primary-600" />
                        <span>So Sánh Lượt Xem (Views) Từng Kênh</span>
                    </h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => (val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`)} />
                                <Tooltip
                                    formatter={(value: any) => [`${formatNumber(Number(value))} views`, 'Lượt xem']}
                                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                />
                                <Bar dataKey="views" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Biểu đồ so sánh CPV & Tỷ lệ đạt chuẩn */}
                <div className="lg:col-span-6 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                        <Percent className="h-4 w-4 text-emerald-600" />
                        <span>Chi Phí Mỗi Lượt Xem (CPV) & Tỷ Lệ Đạt Chuẩn Brief</span>
                    </h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}đ`} />
                                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
                                <Tooltip
                                    formatter={(value: any, name: any) => [
                                        name === 'cpv' ? `${formatNumber(Number(value))} đ` : `${value}%`,
                                        name === 'cpv' ? 'CPV' : 'Đạt chuẩn brief',
                                    ]}
                                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar yAxisId="left" dataKey="cpv" name="CPV (đ/view)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                <Bar yAxisId="right" dataKey="compliance" name="Tỷ lệ đạt chuẩn (%)" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
