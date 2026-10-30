import React, { useState, useMemo } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    Upload,
    FileSpreadsheet,
    AlertTriangle,
    Download,
    CheckCircle2,
    Info,
    FileCheck,
    Sparkles,
    BarChart3,
    Layers,
    ShieldCheck,
    Link2,
    Zap,
    ExternalLink,
    RefreshCw,
    XCircle,
    ArrowRight,
    Eye,
    Settings2,
    Database,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';

interface ColumnReviewItem {
    index: number;
    header_name: string;
    target_field: string | null;
    confidence: number;
    source: string;
    extra_key?: string | null;
}

interface AnalysisData {
    header_row_index: number;
    total_rows: number;
    columns_review: ColumnReviewItem[];
    preview_rows: any[];
    unmapped_count: number;
}

export default function Import() {
    const [activeTab, setActiveTab] = useState<'file' | 'batch_urls'>('file');

    // State cho Smart Import Step 1 & Step 2
    const [fileStep, setFileStep] = useState<'upload' | 'preview'>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const [selectedFormat, setSelectedFormat] = useState<string>('auto');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

    // Schema mapping do người dùng tùy biến hoặc giữ mặc định
    const [userMappings, setUserMappings] = useState<Record<number, string>>({});
    const [autoEnrich, setAutoEnrich] = useState<boolean>(true);
    const [isSubmittingImport, setIsSubmittingImport] = useState<boolean>(false);

    // Các trường đích của Database để người dùng chọn trong Dropdown
    const targetFieldOptions = [
        { value: '', label: '-- Bỏ qua cột này --' },
        { value: 'name', label: 'Họ và tên / Nghệ danh (name)' },
        { value: 'phone', label: 'Số điện thoại (phone)' },
        { value: 'email', label: 'Email liên hệ (email)' },
        { value: 'handle', label: 'Username / @handle (handle)' },
        { value: 'profile_url', label: 'Link trang cá nhân (profile_url)' },
        { value: 'platform', label: 'Nền tảng MXH (platform)' },
        { value: 'followers_count', label: 'Số người theo dõi (followers_count)' },
        { value: 'average_views', label: 'Lượt xem trung bình (average_views)' },
        { value: 'engagement_rate', label: 'Tỷ lệ tương tác ER% (engagement_rate)' },
        { value: 'rate_price', label: 'Giá booking video chính (rate_price)' },
        { value: 'gmv_estimate', label: 'Doanh số ước tính (gmv_estimate)' },
        { value: 'niche', label: 'Ngành hàng / Lĩnh vực (niche)' },
        { value: 'tier', label: 'Phân hạng (tier)' },
        { value: 'shipping_address', label: 'Địa chỉ nhận hàng (shipping_address)' },
        { value: 'city_province', label: 'Tỉnh / Thành phố (city_province)' },
        { value: 'district', label: 'Quận / Huyện (district)' },
        { value: 'notes', label: 'Ghi chú / Lưu ý (notes)' },
        { value: 'extra_price_livestream', label: '[Cột phụ] Giá Livestream' },
        { value: 'extra_price_post', label: '[Cột phụ] Giá bài đăng / Reel' },
        { value: 'extra_bio', label: '[Cột phụ] Tiểu sử / Bio' },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setSelectedFileName(file.name);
            setAnalyzeError(null);
        }
    };

    // Phân tích file tải lên (Bước 1 -> Bước 2)
    const handleStartAnalysis = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setAnalyzeError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(route('creators.import.analyze'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Không thể phân tích cấu trúc file.');
            }

            const data: AnalysisData = json.data;
            setAnalysisData(data);

            // Khởi tạo mapping mặc định từ kết quả tự động nhận diện
            const initialMappings: Record<number, string> = {};
            data.columns_review.forEach((col) => {
                if (col.target_field) {
                    initialMappings[col.index] = col.extra_key || col.target_field;
                } else {
                    initialMappings[col.index] = '';
                }
            });
            setUserMappings(initialMappings);
            setFileStep('preview');
        } catch (err: any) {
            setAnalyzeError(err.message || 'Lỗi kết nối máy chủ.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Xác nhận và thực hiện Import chính thức (Bước 2)
    const handleConfirmImport = () => {
        if (!selectedFile) return;

        setIsSubmittingImport(true);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('format', selectedFormat);
        formData.append('auto_enrich', autoEnrich ? '1' : '0');

        Object.entries(userMappings).forEach(([idx, field]) => {
            if (field) {
                formData.append(`custom_mapping[${idx}]`, field);
            }
        });

        router.post(route('creators.import.confirm'), formData as any, {
            onFinish: () => {
                setIsSubmittingImport(false);
            },
        });
    };

    // Form 2: Batch URLs (Nhập hàng loạt link)
    const urlForm = useForm({
        urls: '',
    });

    const parsedUrlsPreview = useMemo(() => {
        if (!urlForm.data.urls.trim()) return [];
        const lines = urlForm.data.urls.split(/[\r\n,]+/);
        const seen: Record<string, boolean> = {};
        const results: Array<{
            raw: string;
            isValid: boolean;
            platform?: string;
            handle?: string;
        }> = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || seen[trimmed]) continue;
            seen[trimmed] = true;

            const clean = trimmed.split('?')[0].replace(/\/$/, '');

            if (/tiktok\.com\/@([a-zA-Z0-9._-]+)/i.test(clean)) {
                const match = clean.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
                results.push({ raw: trimmed, isValid: true, platform: 'TIKTOK', handle: match?.[1] });
            } else if (/youtube\.com\/(?:@|c\/|channel\/)?([a-zA-Z0-9._-]+)/i.test(clean)) {
                const match = clean.match(/youtube\.com\/(?:@|c\/|channel\/)?([a-zA-Z0-9._-]+)/i);
                results.push({ raw: trimmed, isValid: true, platform: 'YOUTUBE', handle: match?.[1] });
            } else if (/instagram\.com\/([a-zA-Z0-9._]+)/i.test(clean)) {
                const match = clean.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
                results.push({ raw: trimmed, isValid: true, platform: 'INSTAGRAM', handle: match?.[1] });
            } else if (/facebook\.com\/([a-zA-Z0-9._-]+)/i.test(clean)) {
                const match = clean.match(/facebook\.com\/([a-zA-Z0-9._-]+)/i);
                results.push({ raw: trimmed, isValid: true, platform: 'FACEBOOK', handle: match?.[1] });
            } else if (/shopee\.vn\/(?:universal-link\/video|shop)\/([a-zA-Z0-9._-]+)/i.test(clean)) {
                const match = clean.match(/shopee\.vn\/(?:universal-link\/video|shop)\/([a-zA-Z0-9._-]+)/i);
                results.push({ raw: trimmed, isValid: true, platform: 'SHOPEE', handle: match?.[1] });
            } else if (trimmed.startsWith('@')) {
                results.push({ raw: trimmed, isValid: true, platform: 'TIKTOK', handle: trimmed.replace('@', '') });
            } else {
                results.push({ raw: trimmed, isValid: false });
            }
        }
        return results;
    }, [urlForm.data.urls]);

    const validUrlsCount = parsedUrlsPreview.filter((p) => p.isValid).length;
    const invalidUrlsCount = parsedUrlsPreview.filter((p) => !p.isValid).length;

    const handleBatchUrlsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        urlForm.post(route('creators.import.batch-urls'));
    };

    const formats = [
        {
            id: 'auto',
            name: 'Smart Import Tự Động',
            badge: 'Khuyên dùng',
            badgeVariant: 'success' as const,
            desc: 'Dò dòng tiêu đề ở 10 dòng đầu, nhận diện 3 tầng (Fuzzy + Regex + AI) và chuẩn hóa số tiền Việt Nam (4tr5, 5 củ).',
            icon: Sparkles,
        },
        {
            id: 'standard',
            name: 'Mẫu chuẩn CRM (.CSV)',
            badge: '13 Cột',
            badgeVariant: 'primary' as const,
            desc: 'File mẫu chuẩn đầy đủ: Tên, SĐT, Email, Ngành hàng, Phân hạng, Địa chỉ, Handle, Báo giá.',
            icon: FileSpreadsheet,
        },
        {
            id: 'kalodata',
            name: 'Xuất từ Kalodata',
            badge: 'TikTok Analytics',
            badgeVariant: 'purple' as const,
            desc: 'Trích xuất tự động: Tên, Handle, Followers, Doanh số GMV, Tỷ lệ tương tác (ER), Avg Views.',
            icon: BarChart3,
        },
        {
            id: 'fastmoss',
            name: 'Xuất từ FastMoss',
            badge: 'TikTok Analytics',
            badgeVariant: 'info' as const,
            desc: 'Trích xuất tự động: Influencer Name, TikTok ID, Total GMV, Follower Count, Category, Contact.',
            icon: Layers,
        },
    ];

    return (
        <AppLayout title="Nhập danh sách Creator vào hệ thống">
            <PageHeader
                title="Nhập Dữ Liệu Creator / KOC"
                description="Hệ thống Smart Import nhận diện cấu trúc tự động, chuẩn hóa dữ liệu tiếng Việt và kích hoạt cào bổ sung chỉ số"
                backHref={route('creators.index')}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Creator CRM', href: route('creators.index') },
                    { label: 'Nhập Dữ Liệu' },
                ]}
            />

            <div className="mx-auto max-w-5xl space-y-6">
                {/* Thanh chuyển đổi Phương Thức Nhập */}
                <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('file');
                            setFileStep('upload');
                        }}
                        className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
                            activeTab === 'file'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Nhập Từ File Excel / CSV (Smart Import)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('batch_urls')}
                        className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
                            activeTab === 'batch_urls'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Zap className="h-4 w-4 text-amber-500" />
                        Dán Danh Sách Link (Batch URLs)
                        <Badge variant="purple" size="sm">Tự động 100%</Badge>
                    </button>
                </div>

                {/* TAB 1: NHẬP TỪ FILE EXCEL / CSV */}
                {activeTab === 'file' && (
                    <div className="space-y-6">
                        {/* BƯỚC 1: UPLOAD FILE & CHỌN NGUỒN */}
                        {fileStep === 'upload' && (
                            <div className="space-y-6">
                                {/* 1. Chọn Định Dạng Nguồn Dữ Liệu */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-900 mb-1">
                                        1. Chọn Định Dạng Nguồn Của File Dữ Liệu
                                    </label>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Hệ thống áp dụng kiến trúc nhận diện cột 3 tầng tự động dò tiêu đề, fuzzy matching và chuẩn hóa số tiền tiếng Việt
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {formats.map((fmt) => {
                                            const Icon = fmt.icon;
                                            const isSelected = selectedFormat === fmt.id;
                                            return (
                                                <button
                                                    key={fmt.id}
                                                    type="button"
                                                    onClick={() => setSelectedFormat(fmt.id)}
                                                    className={`text-left p-4 rounded-xl border-2 transition-all relative ${
                                                        isSelected
                                                            ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                            <span className="font-bold text-sm text-slate-900">{fmt.name}</span>
                                                        </div>
                                                        <Badge variant={fmt.badgeVariant}>{fmt.badge}</Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                                                        {fmt.desc}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. Tải File Mẫu Chuẩn */}
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-xs">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-xs">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-sm font-bold text-slate-900">
                                                Cơ Chế Nhận Diện Cột Thông Minh (Smart Schema Mapping)
                                            </h2>
                                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                                Bạn có thể tải lên file báo giá của <strong>Agency bất kỳ</strong>, file nội bộ hoặc file xuất từ <strong>Kalodata/FastMoss</strong>. Hệ thống tự động tìm dòng tiêu đề và gợi ý khớp cột chính xác mà không bắt buộc phải sửa file.
                                            </p>
                                            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                                                <a
                                                    href="/import-creators-template.xlsx"
                                                    download="import-creators-template.xlsx"
                                                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/80 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
                                                >
                                                    <Download className="h-4 w-4 text-emerald-700" />
                                                    Tải file mẫu chuẩn Excel (.XLSX)
                                                </a>
                                                <a
                                                    href="/import-creators-template.csv"
                                                    download="import-creators-template.csv"
                                                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 transition-colors"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Tải file mẫu chuẩn CSV
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Khu vực Upload File */}
                                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
                                    <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-indigo-500 bg-slate-50/50">
                                        <Upload className="mx-auto h-12 w-12 text-slate-400" />
                                        <div className="mt-4">
                                            <label
                                                htmlFor="file-upload"
                                                className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-700 focus-within:outline-none"
                                            >
                                                <span>Chọn file từ máy tính</span>
                                                <input
                                                    id="file-upload"
                                                    name="file-upload"
                                                    type="file"
                                                    accept=".csv,.xlsx,.xls,.txt"
                                                    onChange={handleFileChange}
                                                    className="sr-only"
                                                />
                                            </label>
                                            <span className="text-sm text-slate-500"> hoặc kéo thả file vào khu vực này</span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Chấp nhận tệp định dạng .CSV, .XLSX hoặc .XLS (Dung lượng tối đa 20MB)
                                        </p>

                                        {selectedFileName && (
                                            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-xs">
                                                <FileCheck className="h-4 w-4 text-emerald-600" />
                                                Đã chọn: {selectedFileName}
                                            </div>
                                        )}
                                    </div>

                                    {analyzeError && (
                                        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                                            <span>{analyzeError}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                            Tự động phát hiện trùng lặp & khôi phục số 0 ở đầu SĐT
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Link href={route('creators.index')}>
                                                <Button type="button" variant="secondary">
                                                    Hủy bỏ
                                                </Button>
                                            </Link>
                                            <Button
                                                type="button"
                                                variant="primary"
                                                disabled={!selectedFile || isAnalyzing}
                                                loading={isAnalyzing}
                                                loadingText="Đang phân tích cấu trúc file..."
                                                onClick={handleStartAnalysis}
                                                iconRight={<ArrowRight className="h-4 w-4" />}
                                            >
                                                Xem Trước & Khớp Cột (Live Preview)
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BƯỚC 2: REVIEW SCHEMA MAPPING & LIVE PREVIEW DATA */}
                        {fileStep === 'preview' && analysisData && (
                            <div className="space-y-6">
                                {/* Thẻ Tóm Tắt Kết Quả Nhận Diện */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                                                <FileCheck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm">
                                                    Đã Phân Tích Xong: {selectedFileName}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Dòng tiêu đề được phát hiện tại dòng {analysisData.header_row_index + 1} • Ước tính {analysisData.total_rows} bản ghi dữ liệu KOC
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setFileStep('upload')}
                                        >
                                            Chọn lại file khác
                                        </Button>
                                    </div>
                                </div>

                                {/* Bảng Kiểm Tra & Tùy Chỉnh Khớp Cột (Schema Mapping) */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-indigo-600" />
                                            <h4 className="font-bold text-sm text-slate-900">
                                                1. Kiểm Tra Ánh Xạ Cột (Schema Mapping)
                                            </h4>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            Bạn có thể chủ động thay đổi trường đích nếu muốn
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                                                <tr>
                                                    <th className="py-3 px-4 font-bold">Cột Trong File Gốc</th>
                                                    <th className="py-3 px-4 font-bold">Trường Hệ Thống Ánh Xạ</th>
                                                    <th className="py-3 px-4 font-bold">Độ Tin Cậy</th>
                                                    <th className="py-3 px-4 font-bold">Phương Thức Nhận Diện</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {analysisData.columns_review.map((col) => {
                                                    const currentVal = userMappings[col.index] ?? '';
                                                    const isMapped = Boolean(currentVal);

                                                    return (
                                                        <tr key={col.index} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                                <span className="font-mono text-slate-400 mr-1.5">#{col.index + 1}</span>
                                                                {col.header_name}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select
                                                                    value={currentVal}
                                                                    onChange={(e) => {
                                                                        const newVal = e.target.value;
                                                                        setUserMappings((prev) => ({
                                                                            ...prev,
                                                                            [col.index]: newVal,
                                                                        }));
                                                                    }}
                                                                    className={`rounded-lg text-xs font-semibold py-1.5 px-3 border shadow-xs focus:ring-indigo-500 focus:border-indigo-500 ${
                                                                        isMapped
                                                                            ? 'border-indigo-300 bg-indigo-50/30 text-indigo-900'
                                                                            : 'border-slate-300 bg-slate-50 text-slate-500'
                                                                    }`}
                                                                >
                                                                    {targetFieldOptions.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {col.confidence >= 90 ? (
                                                                    <Badge variant="success" size="sm">
                                                                        {col.confidence}% - Rất cao
                                                                    </Badge>
                                                                ) : col.confidence >= 75 ? (
                                                                    <Badge variant="primary" size="sm">
                                                                        {col.confidence}% - Khớp
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="default" size="sm">
                                                                        Chưa map
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-500">
                                                                {col.source === 'dictionary_fuzzy' && 'Tầng 1: Từ điển đồng nghĩa & Fuzzy'}
                                                                {col.source === 'regex_sniffing' && 'Tầng 2: Soi định dạng giá trị (Regex)'}
                                                                {col.source === 'ai_fallback' && 'Tầng 3: AI Fallback Model'}
                                                                {col.source === 'extra_dictionary' && 'Cột thuộc tính mở rộng (JSON)'}
                                                                {col.source === 'unmapped' && 'Chưa xác định'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Bảng Xem Trước Dữ Liệu Đã Chuẩn Hóa (5 Dòng Đầu) */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-indigo-600" />
                                            <h4 className="font-bold text-sm text-slate-900">
                                                2. Dữ Liệu Mẫu Đã Chuẩn Hóa (Live Data Preview - 5 dòng đầu)
                                            </h4>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            Số tiền, số điện thoại và ER% đã qua bộ lọc chuẩn hóa
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                                                <tr>
                                                    <th className="py-3 px-3 font-bold">Dòng</th>
                                                    <th className="py-3 px-3 font-bold">Tên KOC</th>
                                                    <th className="py-3 px-3 font-bold">Kênh / Handle</th>
                                                    <th className="py-3 px-3 font-bold">Số Điện Thoại</th>
                                                    <th className="py-3 px-3 font-bold">Followers</th>
                                                    <th className="py-3 px-3 font-bold">Báo Giá</th>
                                                    <th className="py-3 px-3 font-bold">ER%</th>
                                                    <th className="py-3 px-3 font-bold">Phân Hạng</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {analysisData.preview_rows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="py-3 px-3 text-slate-400 font-mono">
                                                            #{row.original_row_number}
                                                        </td>
                                                        <td className="py-3 px-3 font-bold text-slate-900">
                                                            {row.name}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge variant="purple" size="sm">
                                                                    {row.platform}
                                                                </Badge>
                                                                <span className="text-slate-700 font-mono">
                                                                    @{row.handle}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 font-mono text-slate-800">
                                                            {row.phone || <span className="text-slate-400 font-sans italic">Trống</span>}
                                                        </td>
                                                        <td className="py-3 px-3 text-slate-700">
                                                            {row.followers_count ? row.followers_count.toLocaleString('vi-VN') : '0'}
                                                        </td>
                                                        <td className="py-3 px-3 text-emerald-700 font-bold">
                                                            {row.rate_price > 0 ? (
                                                                `${row.rate_price.toLocaleString('vi-VN')} đ`
                                                            ) : (
                                                                <span className="text-slate-400 font-normal italic">Chưa có</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 text-slate-700">
                                                            {row.engagement_rate > 0 ? `${row.engagement_rate}%` : '0%'}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Badge variant="default" size="sm">
                                                                {row.tier}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Tùy chọn Auto-Enrichment & Nút Xác Nhận Nhập */}
                                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                                    <div className="flex items-start gap-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                                        <input
                                            id="auto-enrich-checkbox"
                                            type="checkbox"
                                            checked={autoEnrich}
                                            onChange={(e) => setAutoEnrich(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="auto-enrich-checkbox" className="text-xs text-slate-700 cursor-pointer">
                                            <span className="font-bold text-amber-900 block mb-0.5">
                                                Tự Động Kích Hoạt Hàng Đợi Cào Bù Chỉ Số (Auto-Enrichment Queue)
                                            </span>
                                            Đối với các KOC có liên kết hoặc @handle nhưng trong file bị thiếu lượt xem trung bình hoặc followers, hệ thống sẽ tự động đưa vào Queue <code className="bg-white px-1 py-0.5 rounded text-amber-800">kol-sync</code> để thu thập bổ sung số liệu mới nhất.
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setFileStep('upload')}
                                        >
                                            Quay lại tải file khác
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="primary"
                                            loading={isSubmittingImport}
                                            loadingText="Đang tiến hành nhập dữ liệu vào CRM..."
                                            onClick={handleConfirmImport}
                                            iconLeft={<Database className="h-4 w-4" />}
                                        >
                                            Xác Nhận Nhập {analysisData.total_rows} KOC Vào CRM
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: DÁN DANH SÁCH BATCH URLS */}
                {activeTab === 'batch_urls' && (
                    <div className="space-y-6">
                        {/* Hướng dẫn tính năng */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-xs">
                            <div className="flex items-start gap-4">
                                <div className="rounded-xl bg-amber-500 p-2.5 text-white shadow-xs">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-sm font-bold text-slate-900">
                                        Tự Động Hóa Thu Thập Không Chạm (Zero-Touch Pipeline)
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                        Dán danh sách các liên kết trang cá nhân (TikTok, YouTube, Instagram, Facebook, Shopee), mỗi dòng một liên kết.
                                        Hệ thống sẽ <strong>tự động nhận diện nền tảng</strong>, <strong>lọc bỏ bài ghim</strong>, <strong>lấy 15 bài gần nhất tính toán ER%</strong> và <strong>dùng Regex bóc tách SĐT/Email từ Bio</strong>.
                                    </p>
                                    <div className="mt-2 text-xs text-amber-800 font-medium">
                                        ⚡ Áp dụng cơ chế Rate Limiting (60 req/phút) và Caching 24h để bảo vệ an toàn máy chủ.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Nhập Batch URLs */}
                        <form
                            onSubmit={handleBatchUrlsSubmit}
                            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="urls-textarea" className="block text-sm font-bold text-slate-900">
                                        Danh Sách Liên Kết Mạng Xã Hội (Mỗi dòng một link)
                                    </label>
                                    {parsedUrlsPreview.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                {validUrlsCount} hợp lệ
                                            </span>
                                            {invalidUrlsCount > 0 && (
                                                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                    {invalidUrlsCount} không hợp lệ
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    id="urls-textarea"
                                    rows={8}
                                    value={urlForm.data.urls}
                                    onChange={(e) => urlForm.setData('urls', e.target.value)}
                                    placeholder={`Ví dụ:\nhttps://www.tiktok.com/@charlidamelio\nhttps://www.youtube.com/@MrBeast\nhttps://www.instagram.com/cristiano\nhttps://www.facebook.com/zuck\nhttps://shopee.vn/universal-link/video/shop123`}
                                    className="w-full rounded-xl border-slate-300 font-mono text-xs shadow-xs focus:border-indigo-500 focus:ring-indigo-500 p-3.5 placeholder:text-slate-400"
                                />
                                {urlForm.errors.urls && (
                                    <p className="mt-1.5 text-xs text-rose-600 font-medium">{urlForm.errors.urls}</p>
                                )}
                            </div>

                            {/* Bộ Xem Trước Phân Tích (Live Preview) */}
                            {parsedUrlsPreview.length > 0 && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span>Xem trước nhận diện ({parsedUrlsPreview.length} dòng):</span>
                                        <span className="text-slate-400 font-normal">Tự động phân giải nền tảng & handle</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/60 pr-1">
                                        {parsedUrlsPreview.map((item, idx) => (
                                            <div key={idx} className="py-2 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 truncate pr-2">
                                                    {item.isValid ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                    ) : (
                                                        <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                    )}
                                                    <span className="truncate text-slate-800 font-mono">{item.raw}</span>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-2">
                                                    {item.isValid ? (
                                                        <>
                                                            <Badge variant="primary" size="sm">
                                                                {item.platform}
                                                            </Badge>
                                                            <span className="font-semibold text-slate-700">
                                                                @{item.handle}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <Badge variant="danger" size="sm">
                                                            Sai định dạng
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    Tự động phân tán tải (Staggered Dispatch) vào Redis Queue
                                </div>

                                <div className="flex items-center gap-3">
                                    <Link href={route('creators.index')}>
                                        <Button type="button" variant="secondary">
                                            Hủy bỏ
                                        </Button>
                                    </Link>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={validUrlsCount === 0}
                                        loading={urlForm.processing}
                                        loadingText="Đang lên lịch đồng bộ..."
                                        iconLeft={<Zap className="h-4 w-4 text-amber-300" />}
                                    >
                                        Bắt đầu đồng bộ tự động ({validUrlsCount} kênh)
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
