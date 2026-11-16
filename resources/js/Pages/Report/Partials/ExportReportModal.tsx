import React, { useState } from 'react';
import {
    Download,
    X,
    FileSpreadsheet,
    CheckSquare,
    Square,
    Video,
    BarChart3,
    Calendar,
    Trophy,
    Users,
    Receipt,
    CheckCircle2,
    Info,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';

export interface ExportSectionOption {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    defaultChecked: boolean;
    badge?: string;
}

interface ExportReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId?: number | null;
    campaignName?: string | null;
    periodLabel: string;
    month?: number | null;
    year?: number | null;
    startDate?: string | null;
    endDate?: string | null;
}

export default function ExportReportModal({
    isOpen,
    onClose,
    campaignId,
    campaignName,
    periodLabel,
    month,
    year,
    startDate,
    endDate,
}: ExportReportModalProps) {
    const availableSections: ExportSectionOption[] = [
        {
            id: 'koc_videos',
            label: 'Chi Tiết Video & Ngày Lên Bài Từng KOC',
            description: 'Danh sách video, URL mở trực tiếp, ngày giờ lên bài thực tế, deadline, views, GMV và chi phí thực tế.',
            icon: <Video className="h-5 w-5 text-indigo-600" />,
            defaultChecked: true,
            badge: 'Trọng tâm',
        },
        {
            id: 'overview',
            label: 'Tổng Quan Hiệu Quả & Phễu Chuyển Đổi ROI',
            description: 'Các chỉ số tài chính, tổng chi phí thực hiện, tỷ lệ ROI, CPV và phân tích các bước phễu.',
            icon: <BarChart3 className="h-5 w-5 text-blue-600" />,
            defaultChecked: true,
        },
        {
            id: 'monthly_breakdown',
            label: 'Diễn Biến Hiệu Quả Theo Từng Tháng (12 Tháng)',
            description: 'Bảng tổng hợp so sánh doanh thu, chi phí, số lượng KOC và video hoàn thành qua các tháng.',
            icon: <Calendar className="h-5 w-5 text-emerald-600" />,
            defaultChecked: true,
        },
        {
            id: 'leaderboard',
            label: 'Bảng Vinh Danh Top Creator',
            description: 'Xếp hạng các KOC có lượt xem cao nhất, doanh thu GMV lớn nhất và CPV tối ưu trong kỳ.',
            icon: <Trophy className="h-5 w-5 text-amber-600" />,
            defaultChecked: true,
        },
        {
            id: 'staff_performance',
            label: 'Năng Suất Đội Ngũ Nhân Viên Booking',
            description: 'Thống kê số lượng KOC phụ trách, tỷ lệ chốt deal, video hoàn thành và tổng GMV theo nhân viên.',
            icon: <Users className="h-5 w-5 text-violet-600" />,
            defaultChecked: true,
        },
        {
            id: 'cost_reconciliation',
            label: 'Bảng Đối Soát Chi Phí & Thù Lao Kế Toán',
            description: 'Chi tiết thù lao thỏa thuận, chi phí sản phẩm mẫu, tình trạng duyệt và đối soát nghiệm thu thanh toán.',
            icon: <Receipt className="h-5 w-5 text-rose-600" />,
            defaultChecked: true,
            badge: 'Kế toán',
        },
    ];

    const [selectedSections, setSelectedSections] = useState<string[]>(
        availableSections.map((s) => s.id)
    );
    const [isExporting, setIsExporting] = useState<boolean>(false);

    if (!isOpen) return null;

    const toggleSection = (id: string) => {
        if (selectedSections.includes(id)) {
            setSelectedSections(selectedSections.filter((item) => item !== id));
        } else {
            setSelectedSections([...selectedSections, id]);
        }
    };

    const handleSelectAll = () => {
        setSelectedSections(availableSections.map((s) => s.id));
    };

    const handleDeselectAll = () => {
        setSelectedSections([]);
    };

    const handleExport = () => {
        if (selectedSections.length === 0) return;

        setIsExporting(true);

        const params = new URLSearchParams();
        if (campaignId) params.append('campaign_id', String(campaignId));
        if (month) params.append('month', String(month));
        if (year) params.append('year', String(year));
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        params.append('sections', selectedSections.join(','));

        // @ts-ignore
        const exportUrl = route('reports.export') + `?${params.toString()}`;
        
        // Trigger download
        window.location.href = exportUrl;

        setTimeout(() => {
            setIsExporting(false);
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-primary-100/70 text-primary-700">
                            <FileSpreadsheet className="h-6 w-6" />
                        </span>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Tùy Chọn Xuất Báo Cáo Excel (.xlsx)
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Chọn chính xác các phần dữ liệu bạn muốn kết xuất ra file Excel.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scope Information Bar */}
                <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100/80 flex flex-wrap items-center justify-between text-xs text-indigo-900 gap-2">
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>
                            Chiến dịch: <strong>{campaignName || 'Tất cả chiến dịch'}</strong>
                        </span>
                    </div>
                    <div>
                        Kỳ báo cáo: <strong className="text-indigo-700">{periodLabel}</strong>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Select All Actions */}
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="text-slate-600 font-medium">
                            Đã chọn: <strong className="text-primary-600">{selectedSections.length}</strong> / {availableSections.length} phân hệ
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-primary-600 hover:text-primary-800 font-semibold hover:underline"
                            >
                                Chọn tất cả
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                type="button"
                                onClick={handleDeselectAll}
                                className="text-slate-500 hover:text-slate-700 font-semibold hover:underline"
                            >
                                Bỏ chọn tất cả
                            </button>
                        </div>
                    </div>

                    {/* Section Checkbox List */}
                    <div className="space-y-2.5">
                        {availableSections.map((section) => {
                            const isChecked = selectedSections.includes(section.id);
                            return (
                                <div
                                    key={section.id}
                                    onClick={() => toggleSection(section.id)}
                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                                        isChecked
                                            ? 'bg-primary-50/30 border-primary-300 shadow-xs ring-1 ring-primary-100'
                                            : 'bg-white border-slate-200 hover:bg-slate-50/70'
                                    }`}
                                >
                                    <div className="mt-0.5 text-primary-600 shrink-0">
                                        {isChecked ? (
                                            <CheckSquare className="h-5 w-5" />
                                        ) : (
                                            <Square className="h-5 w-5 text-slate-300" />
                                        )}
                                    </div>

                                    <div className="p-1.5 rounded-lg bg-slate-100/80 shrink-0">
                                        {section.icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                {section.label}
                                            </span>
                                            {section.badge && (
                                                <Badge
                                                    variant={section.badge === 'Trọng tâm' ? 'primary' : 'warning'}
                                                    size="sm"
                                                >
                                                    {section.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                            {section.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                        {selectedSections.length === 0
                            ? 'Vui lòng chọn ít nhất 1 phân hệ để xuất file'
                            : `Sẽ xuất ${selectedSections.length} sheets vào file .xlsx`}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            Hủy bỏ
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            iconLeft={<Download className="h-4 w-4" />}
                            onClick={handleExport}
                            disabled={selectedSections.length === 0 || isExporting}
                        >
                            {isExporting ? 'Đang xuất file...' : 'Tải File Excel Ngay'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
