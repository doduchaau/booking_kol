import React from 'react';
import { Search, X, Clock, AlertTriangle, Package } from 'lucide-react';
import { StageType, RiskFilterType } from './types';
import PlatformLogo, { getPlatformDisplayName } from '@/Components/Common/PlatformLogo';

interface Props {
    currentStage: StageType;
    onStageChange: (stage: StageType) => void;
    stageCounts: Record<StageType, number>;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    riskFilter: RiskFilterType;
    onRiskFilterChange: (r: RiskFilterType) => void;
    selectedStaffFilter: string;
    onStaffFilterChange: (staffId: string) => void;
    selectedPlatformFilter?: string;
    onPlatformFilterChange?: (platform: string) => void;
    targetPlatforms?: string[];
    staffUsers: { id: number; name: string; email: string }[];
    videoDeadlineDays?: number;
    isVirtualEnabled?: boolean;
    visibleCount?: number;
    filteredCount?: number;
}

export default React.memo(function KocMatrixFilterBar({
    currentStage,
    onStageChange,
    stageCounts,
    searchQuery,
    onSearchChange,
    riskFilter,
    onRiskFilterChange,
    selectedStaffFilter,
    onStaffFilterChange,
    selectedPlatformFilter = 'all',
    onPlatformFilterChange,
    targetPlatforms = [],
    staffUsers,
    videoDeadlineDays = 7,
    isVirtualEnabled = false,
    visibleCount = 0,
    filteredCount = 0,
}: Props) {
    return (
        <div className="space-y-3">
            {/* PHẦN 1: BỘ CHUYỂN ĐỔI TAB 4 CHẶNG (STAGE FUNNEL TABS) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200">
                <button
                    type="button"
                    onClick={() => onStageChange('all')}
                    className={`flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all ${currentStage === 'all'
                        ? 'bg-white shadow-sm ring-1 ring-slate-200 text-slate-900'
                        : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold">Tất Cả KOC</span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'
                                }`}
                        >
                            {stageCounts.all}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">Toàn bộ danh sách</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStageChange('waiting_approval')}
                    className={`flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all ${currentStage === 'waiting_approval'
                        ? 'bg-white shadow-sm ring-2 ring-amber-400 text-amber-900'
                        : 'text-slate-600 hover:bg-white/50'
                        } ${stageCounts.waiting_approval > 0 ? 'bg-amber-50/70 border border-amber-200' : ''}`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1 text-amber-800">
                            <Clock className={`h-3 w-3 text-amber-600 ${stageCounts.waiting_approval > 0 ? 'animate-pulse' : ''}`} />
                            Chờ Duyệt Phí
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${stageCounts.waiting_approval > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                        >
                            {stageCounts.waiting_approval}
                        </span>
                    </div>
                    <span className="text-[11px] text-amber-700/80 mt-0.5">Cần thông qua sếp</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStageChange('outreach')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all ${currentStage === 'outreach'
                        ? 'bg-white shadow-sm ring-1 ring-indigo-200 text-indigo-900'
                        : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            1. Tiếp Cận & Chốt
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'outreach' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                }`}
                        >
                            {stageCounts.outreach}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Mới ➔ Liên hệ ➔ Chốt</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStageChange('shipping')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all ${currentStage === 'shipping'
                        ? 'bg-white shadow-sm ring-1 ring-amber-200 text-amber-900'
                        : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            2. Địa Chỉ & Gửi Mẫu
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'shipping' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                                }`}
                        >
                            {stageCounts.shipping}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Địa chỉ ➔ Gửi ➔ Đã nhận</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStageChange('production')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all ${currentStage === 'production'
                        ? 'bg-white shadow-sm ring-1 ring-purple-200 text-purple-900'
                        : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            3. Sản Xuất & Video
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'production' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'
                                }`}
                        >
                            {stageCounts.production}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Hạn {videoDeadlineDays} ngày ➔ Lên video</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStageChange('completion')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all col-span-2 md:col-span-1 ${currentStage === 'completion'
                        ? 'bg-white shadow-sm ring-1 ring-emerald-200 text-emerald-900'
                        : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            4. Hoàn Tất & Ngoại Lệ
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'completion' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}
                        >
                            {stageCounts.completion}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Nghiệm thu / Từ chối / Bom</span>
                </button>
            </div>

            {/* PHẦN 2: BỘ LỌC TÌM KIẾM & BỘ LỌC RỦI RO (RISK FILTER PILLS) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Tìm KOC theo tên, SĐT, kênh TikTok, Niche..."
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
                    <button
                        type="button"
                        onClick={() => onRiskFilterChange('all')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Tất cả rủi ro
                    </button>

                    <button
                        type="button"
                        onClick={() => onRiskFilterChange('overdue')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'overdue'
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                            }`}
                    >
                        <Clock className="h-3 w-3" />
                        Quá hạn video
                    </button>

                    <button
                        type="button"
                        onClick={() => onRiskFilterChange('warning')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'warning'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                            }`}
                    >
                        <AlertTriangle className="h-3 w-3" />
                        Sắp đến hạn (&le; 2 ngày)
                    </button>

                    <button
                        type="button"
                        onClick={() => onRiskFilterChange('missing_address')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'missing_address'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                            }`}
                    >
                        <Package className="h-3 w-3" />
                        Chưa có địa chỉ
                    </button>

                    {/* Filter Nhân viên */}
                    <div className="border-l border-slate-200 pl-2 ml-1 flex items-center gap-2">
                        <select
                            value={selectedStaffFilter}
                            onChange={(e) => onStaffFilterChange(e.target.value)}
                            className="py-1 pl-2 pr-7 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                        >
                            <option value="all">Tất cả nhân sự</option>
                            <option value="unassigned">Chưa phân công</option>
                            {staffUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>

                        {/* Filter Nền tảng được giao */}
                        <select
                            value={selectedPlatformFilter}
                            onChange={(e) => onPlatformFilterChange?.(e.target.value)}
                            className="py-1 pl-2 pr-7 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                        >
                            <option value="all">Tất cả nền tảng</option>
                            {(targetPlatforms.length > 0
                                ? targetPlatforms
                                : ['tiktok', 'shopee', 'facebook', 'youtube', 'instagram']
                            ).map((plat) => (
                                <option key={plat} value={plat}>
                                    {getPlatformDisplayName(plat)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Virtual Scrolling Indicator Badge */}
                    {isVirtualEnabled && (
                        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>⚡ Cuộn ảo: {visibleCount}/{filteredCount} KOC</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

