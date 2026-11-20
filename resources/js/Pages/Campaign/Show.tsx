import React, { useState, useMemo } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Calendar,
    Users,
    Plus,
    Sparkles,
    Search,
    SlidersHorizontal,
    LayoutGrid,
    FileText,
    Edit3,
    Paperclip,
    Download,
    Database,
    Info,
    X,
    Package,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    ArrowLeft,
    RefreshCw,
    Check,
    Image as ImageIcon,
    Eye,
    ShoppingBag,
    Tag,
    ExternalLink,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import FormField from '@/Components/Form/FormField';
import Select from '@/Components/Form/Select';
import TextInput from '@/Components/Form/TextInput';
import CampaignBriefCard from '@/Components/Campaign/CampaignBriefCard';
import PlatformLogo, { getPlatformDisplayName, normalizePlatformName } from '@/Components/Common/PlatformLogo';
import KocPlatformCluster from '@/Components/Common/KocPlatformCluster';
import KocMatrixTable, {
    CampaignCreatorPivot,
    Creator,
} from './Partials/KocMatrixTable';
import { CampaignProduct } from './Partials/KocMatrix/types';

interface CampaignStats {
    total_assigned: number;
    completed_videos: number;
    target_count: number;
    video_progress_percent: number;
    total_committed_budget: number;
    budget_percent: number;
}

interface Campaign {
    id: number;
    name: string;
    product_name: string;
    product_sku: string | null;
    target_platforms?: string[];
    budget: string | number;
    target_creators_count: number;
    start_date: string;
    end_date: string;
    content_guidelines: string | null;
    sample_requirement: string | null;
    content_guidelines_file?: string | null;
    content_guidelines_file_url?: string | null;
    sample_requirement_file?: string | null;
    sample_requirement_file_url?: string | null;
    key_messages?: string | null;
    hashtags?: string | null;
    dos_and_donts?: string | null;
    discount_code?: string | null;
    affiliate_link?: string | null;
    video_deadline_days?: number;
    commission_rate: string | number;
    ads_commission_rate?: string | number;
    status: 'draft' | 'active' | 'completed' | 'paused';
    products?: CampaignProduct[];
    campaign_creators: CampaignCreatorPivot[];
}

interface Props {
    campaign: Campaign;
    stats: CampaignStats;
    stageCounts?: Record<string, number>;
    availableCreators: Creator[];
    totalAvailableCount?: number;
    staffUsers: { id: number; name: string; email: string }[];
}

export default function Show({
    campaign,
    stats,
    availableCreators = [],
    totalAvailableCount = 0,
    staffUsers = [],
}: Props) {
    const [activeTab, setActiveTab] = useState<'matrix' | 'guidelines'>('matrix');
    const [previewModalImage, setPreviewModalImage] = useState<{ url: string; name: string } | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState<'specific' | 'all_db' | 'import_file'>('specific');
    const [selectAllInDb, setSelectAllInDb] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [modalPlatformFilter, setModalPlatformFilter] = useState<string>('all');

    // State cho tính năng Import KOC từ File Mẫu (Reverse Logic)
    const [importStep, setImportStep] = useState<'upload' | 'review'>('upload');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importPreviewData, setImportPreviewData] = useState<{
        token: string;
        file_name: string;
        summary: {
            total_rows: number;
            total_kocs: number;
            new_count: number;
            crm_duplicate_count: number;
            campaign_duplicate_count: number;
            invalid_count: number;
        };
        new_kocs: Array<{
            key: string;
            name: string;
            phone: string | null;
            email: string | null;
            accounts: Array<{ platform: string; handle: string; url: string; followers: number }>;
            tier: string;
            niche: string;
            fee: number;
            shipping_address: string;
            notes: string;
        }>;
        crm_duplicates: Array<{
            key: string;
            name: string;
            phone: string | null;
            creator_id: number;
            existing_accounts: Array<{ platform: string; handle: string }>;
            new_accounts: Array<{ platform: string; handle: string; url: string; followers: number }>;
            imported_data: any;
            suggested_action: string;
        }>;
        campaign_duplicates: Array<{
            key: string;
            name: string;
            phone: string | null;
            creator_id: number;
            campaign_creator_id: number;
            current_status: string;
            current_fee: number;
            current_platforms: string[];
            imported_data: any;
            suggested_action: string;
        }>;
        invalid_rows: Array<{
            key: string;
            name: string;
            reason: string;
            source_rows: number[];
        }>;
    } | null>(null);

    const [importResolutions, setImportResolutions] = useState<Record<string, string>>({});
    const [importAssignedTo, setImportAssignedTo] = useState<string>('');
    const [importDefaultBookingFee, setImportDefaultBookingFee] = useState<string>('0');
    const [importPlatforms, setImportPlatforms] = useState<string[]>(
        campaign.target_platforms && campaign.target_platforms.length > 0
            ? campaign.target_platforms
            : ['tiktok']
    );

    const totalKocsToAssign = useMemo(() => {
        if (!importPreviewData) return 0;
        let count = 0;
        (importPreviewData.new_kocs || []).forEach((k) => {
            if ((importResolutions[k.key] || 'create_and_assign') !== 'skip') count++;
        });
        (importPreviewData.crm_duplicates || []).forEach((k) => {
            if ((importResolutions[k.key] || 'update_and_assign') !== 'skip') count++;
        });
        return count;
    }, [importPreviewData, importResolutions]);

    // Thống kê số lượng KOC sở hữu từng nền tảng trong danh sách khả dụng
    const platformCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: availableCreators.length,
            tiktok: 0,
            shopee: 0,
            facebook: 0,
            youtube: 0,
            instagram: 0,
        };
        availableCreators.forEach((c) => {
            const userPlatforms = new Set(
                (c.accounts || []).map((acc) => normalizePlatformName(acc.platform))
            );
            userPlatforms.forEach((plat) => {
                if (counts[plat] !== undefined) {
                    counts[plat]++;
                } else {
                    counts[plat] = 1;
                }
            });
        });
        return counts;
    }, [availableCreators]);

    // Form gán Creator mới
    const addForm = useForm({
        select_all_in_db: false,
        creator_ids: [] as number[],
        assigned_to: '',
        booking_fee: '0',
        booking_platforms: (campaign.target_platforms && campaign.target_platforms.length > 0
            ? campaign.target_platforms
            : ['tiktok']) as string[],
    });

    const handleOpenAddModal = (mode: 'specific' | 'all_db' | 'import_file' | boolean = 'specific') => {
        const targetTab = typeof mode === 'boolean' ? (mode ? 'all_db' : 'specific') : mode;
        setModalTab(targetTab);
        setSelectAllInDb(targetTab === 'all_db');
        setModalSearch('');
        setModalPlatformFilter('all');
        setImportStep('upload');
        setImportFile(null);
        setImportPreviewData(null);
        setImportError(null);
        setImportResolutions({});
        setImportAssignedTo('');
        setImportDefaultBookingFee('0');
        setImportPlatforms(
            campaign.target_platforms && campaign.target_platforms.length > 0
                ? campaign.target_platforms
                : ['tiktok']
        );
        addForm.setData({
            select_all_in_db: targetTab === 'all_db',
            creator_ids: [],
            assigned_to: '',
            booking_fee: '0',
            booking_platforms: (campaign.target_platforms && campaign.target_platforms.length > 0
                ? campaign.target_platforms
                : ['tiktok']) as string[],
        });
        if (targetTab === 'specific' && (!availableCreators || availableCreators.length === 0)) {
            router.reload({ only: ['availableCreators'] });
        }
        setIsAddModalOpen(true);
    };

    const handlePreviewImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importFile) {
            setImportError('Vui lòng chọn file Excel hoặc CSV để kiểm tra.');
            return;
        }

        setImportLoading(true);
        setImportError(null);

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await axios.post(route('campaigns.creators.import-preview', campaign.id), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.success) {
                const preview = res.data.data;
                setImportPreviewData(preview);
                const initialRes: Record<string, string> = {};
                (preview.new_kocs || []).forEach((k: any) => {
                    initialRes[k.key] = 'create_and_assign';
                });
                (preview.crm_duplicates || []).forEach((k: any) => {
                    initialRes[k.key] = 'update_and_assign';
                });
                (preview.campaign_duplicates || []).forEach((k: any) => {
                    initialRes[k.key] = 'skip';
                });
                setImportResolutions(initialRes);
                setImportStep('review');
            } else {
                setImportError(res.data.message || 'Không thể kiểm tra file.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.file?.[0] || 'Lỗi khi kiểm tra file Excel.';
            setImportError(msg);
        } finally {
            setImportLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!importPreviewData?.token) return;

        setImportLoading(true);
        setImportError(null);

        try {
            const res = await axios.post(route('campaigns.creators.import-confirm', campaign.id), {
                token: importPreviewData.token,
                resolutions: importResolutions,
                assigned_to: importAssignedTo ? Number(importAssignedTo) : null,
                default_booking_fee: Number(importDefaultBookingFee) || 0,
                default_platforms: importPlatforms,
            });

            if (res.data.success) {
                setIsAddModalOpen(false);
                setImportStep('upload');
                setImportFile(null);
                setImportPreviewData(null);
                router.reload();
            } else {
                setImportError(res.data.message || 'Không thể thực hiện import.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Lỗi khi xác nhận import KOC.';
            setImportError(msg);
        } finally {
            setImportLoading(false);
        }
    };

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(val) || 0);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN');
    };

    const getStatusVariant = (st: string): BadgeVariant => {
        switch (st) {
            case 'active':
                return 'success';
            case 'completed':
                return 'primary';
            case 'paused':
                return 'warning';
            default:
                return 'default';
        }
    };

    const filteredAvailableCreators = useMemo(() => {
        return availableCreators.filter((c) => {
            // 1. Lọc theo từ khóa tìm kiếm (tên, SĐT, niche, handle tài khoản)
            if (modalSearch.trim()) {
                const q = modalSearch.toLowerCase().trim();
                const matches =
                    c.name.toLowerCase().includes(q) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.niche && c.niche.toLowerCase().includes(q)) ||
                    (c.accounts && c.accounts.some((acc) => acc.handle?.toLowerCase().includes(q)));
                if (!matches) return false;
            }

            // 2. Lọc theo nền tảng mạng xã hội KOC sở hữu
            if (modalPlatformFilter !== 'all') {
                const hasPlatform = (c.accounts || []).some(
                    (acc) => normalizePlatformName(acc.platform) === modalPlatformFilter
                );
                if (!hasPlatform) return false;
            }

            return true;
        });
    }, [availableCreators, modalSearch, modalPlatformFilter]);

    // Trạng thái chọn tất cả KOC trong modal
    const isAllFilteredSelected = useMemo(() => {
        if (filteredAvailableCreators.length === 0) return false;
        return filteredAvailableCreators.every((c) => addForm.data.creator_ids.includes(c.id));
    }, [filteredAvailableCreators, addForm.data.creator_ids]);

    const isSomeFilteredSelected = useMemo(() => {
        return (
            filteredAvailableCreators.some((c) => addForm.data.creator_ids.includes(c.id)) &&
            !isAllFilteredSelected
        );
    }, [filteredAvailableCreators, addForm.data.creator_ids, isAllFilteredSelected]);

    const handleToggleSelectAll = () => {
        if (isAllFilteredSelected) {
            const filteredIdSet = new Set(filteredAvailableCreators.map((c) => c.id));
            addForm.setData(
                'creator_ids',
                addForm.data.creator_ids.filter((id) => !filteredIdSet.has(id))
            );
        } else {
            const newIds = Array.from(
                new Set([...addForm.data.creator_ids, ...filteredAvailableCreators.map((c) => c.id)])
            );
            addForm.setData('creator_ids', newIds);
        }
    };

    const handleSelectAllInDb = () => {
        addForm.setData('creator_ids', availableCreators.map((c) => c.id));
    };

    const handleDeselectAll = () => {
        addForm.setData('creator_ids', []);
    };

    const handleAddCreatorsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('campaigns.creators.add', campaign.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddModalOpen(false);
                addForm.reset();
                setModalSearch('');
            },
        });
    };

    return (
        <AppLayout title={`Chi tiết Chiến Dịch - ${campaign.name}`}>
            {/* Header Chuẩn Doanh Nghiệp */}
            <PageHeader
                title={campaign.name}
                description={`Sản phẩm: ${campaign.product_name} • Hạn lên video: ${campaign.video_deadline_days || 7} ngày sau khi nhận mẫu • Thời gian: ${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`}
                backHref={route('campaigns.index')}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Chiến dịch', href: route('campaigns.index') },
                    { label: campaign.name },
                ]}
                actions={
                    <div className="flex items-center gap-2.5">
                        <Badge variant={getStatusVariant(campaign.status)} size="md">
                            {campaign.status.toUpperCase()}
                        </Badge>

                        {/* Nút Chỉnh Sửa Chiến Dịch */}
                        <Link href={route('campaigns.edit', campaign.id)}>
                            <Button
                                variant="secondary"
                                iconLeft={<Edit3 className="h-4 w-4" />}
                            >
                                Chỉnh Sửa
                            </Button>
                        </Link>

                        {/* Nút Gán Creator */}
                        <Button
                            variant="primary"
                            iconLeft={<Plus className="h-4 w-4" />}
                            onClick={() => handleOpenAddModal(false)}
                        >
                            Gán KOC Vào Chiến Dịch
                        </Button>
                    </div>
                }
            />

            {/* Executive KPI Strip Tinh Gọn */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* 1. Tiến độ video */}
                    <div className="space-y-1.5 pr-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider">Tiến độ lên video</span>
                            <span className="font-bold text-primary-600">{stats.video_progress_percent}%</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">
                                {stats.completed_videos} <span className="text-sm font-medium text-slate-400">/ {stats.target_count} video</span>
                            </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-primary-600 transition-all duration-500"
                                style={{ width: `${stats.video_progress_percent}%` }}
                            />
                        </div>
                    </div>

                    {/* 2. KOC đã gán */}
                    <div className="space-y-1.5 pt-3 md:pt-0 md:px-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">KOC Đã Gán</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">{stats.total_assigned}</span>
                            <span className="text-xs text-slate-400">mục tiêu: {campaign.target_creators_count}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">Đang trong quy trình booking</span>
                    </div>

                    {/* 3. Ngân sách */}
                    <div className="space-y-1.5 pt-3 md:pt-0 md:px-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Ngân Sách Booking</span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xl font-black text-slate-900">{formatCurrency(campaign.budget)}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate" title={`Đã cam kết: ${formatCurrency(stats.total_committed_budget)}`}>
                            Đã cam kết: <strong className="text-slate-700">{formatCurrency(stats.total_committed_budget)}</strong>
                        </span>
                    </div>

                    {/* 4. Hoa hồng chính sách */}
                    <div className="space-y-1.5 pt-3 md:pt-0 md:pl-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Chính Sách Hoa Hồng</span>
                        <div className="flex items-center gap-3">
                            <div>
                                <span className="text-[11px] text-slate-400 block">Affiliate</span>
                                <span className="text-lg font-black text-slate-900">{campaign.commission_rate}%</span>
                            </div>
                            <div className="h-6 w-px bg-slate-200" />
                            <div>
                                <span className="text-[11px] text-slate-400 block">Chạy ADS</span>
                                <span className="text-lg font-black text-indigo-600">{campaign.ads_commission_rate || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thanh Tab Chuyển Đổi Giữa Ma Trận KOC & Guidelines */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-200">
                <div className="flex space-x-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('matrix')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === 'matrix'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        <span>Ma Trận Tiến Độ KOC ({campaign.campaign_creators.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('guidelines')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === 'guidelines'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FileText className="h-4 w-4" />
                        <span>Kịch Bản & Hướng Dẫn Gửi Mẫu</span>
                    </button>
                </div>
            </div>

            {/* NỘI DUNG CHÍNH: MA TRẬN TIẾN ĐỘ KOC */}
            {activeTab === 'matrix' && (
                <KocMatrixTable
                    campaign={campaign}
                    items={campaign.campaign_creators}
                    staffUsers={staffUsers}
                    onOpenAddModal={handleOpenAddModal}
                    totalAvailableCount={totalAvailableCount}
                />
            )}

            {/* TAB GUIDELINES & HƯỚNG DẪN */}
            {activeTab === 'guidelines' && (
                <div className="space-y-6">
                    <CampaignBriefCard
                        campaign={{
                            id: campaign.id,
                            name: campaign.name,
                            product_name: campaign.product_name,
                            product_sku: campaign.product_sku,
                            content_guidelines: campaign.content_guidelines,
                            content_guidelines_file_url: campaign.content_guidelines_file_url,
                            sample_requirement: campaign.sample_requirement,
                            sample_requirement_file_url: campaign.sample_requirement_file_url,
                            key_messages: campaign.key_messages,
                            hashtags: campaign.hashtags,
                            dos_and_donts: campaign.dos_and_donts,
                            discount_code: campaign.discount_code,
                            affiliate_link: campaign.affiliate_link,
                        }}
                    />

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary-600" />
                                Hướng Dẫn Kịch Bản & Quy Định Cấm Kỵ Chi Tiết
                            </h3>
                            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {campaign.content_guidelines || 'Chưa thiết lập nội dung văn bản cho kịch bản.'}
                            </div>

                            {campaign.content_guidelines_file_url && (
                                <div className="mt-3 flex items-center justify-between p-3.5 rounded-xl bg-primary-50/40 border border-primary-200/60 shadow-2xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2.5 rounded-lg bg-primary-100/70 text-primary-700">
                                            <Paperclip className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                Tệp Đính Kèm Kịch Bản & Briefing
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-mono truncate">
                                                {campaign.content_guidelines_file ? campaign.content_guidelines_file.split('/').pop() : 'Tài liệu kịch bản'}
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={campaign.content_guidelines_file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-700 bg-white hover:bg-primary-50 border border-primary-300 rounded-lg shadow-2xs transition-colors shrink-0"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        <span>Tải File / Mở File</span>
                                    </a>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary-600" />
                                Quy Định Về Mẫu Sản Phẩm Trải Nghiệm
                            </h3>
                            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {campaign.sample_requirement || 'Chưa thiết lập quy định mẫu sản phẩm.'}
                            </div>

                        {campaign.sample_requirement_file_url && (
                            <div className="mt-3 flex items-center justify-between p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/60 shadow-2xs">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2.5 rounded-lg bg-amber-100/70 text-amber-700">
                                        <Paperclip className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            Tệp Đính Kèm Quy Định & Danh Mục Mẫu
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono truncate">
                                            {campaign.sample_requirement_file ? campaign.sample_requirement_file.split('/').pop() : 'Tài liệu quy định mẫu'}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={campaign.sample_requirement_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-white hover:bg-amber-50 border border-amber-300 rounded-lg shadow-2xs transition-colors shrink-0"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Tải File / Mở File</span>
                                </a>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* DANH SÁCH SẢN PHẨM & TÀI LIỆU BRIEF CHI TIẾT */}
                    {campaign.products && campaign.products.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4 text-primary-600" />
                                    Danh Sách Sản Phẩm & Brief Riêng Cho Từng Món ({campaign.products.length} sản phẩm)
                                </h3>
                                <Link
                                    href={route('campaigns.edit', campaign.id)}
                                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Chỉnh sửa sản phẩm
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {campaign.products.map((p, idx) => {
                                    const images = p.image_urls || (p.thumbnail_url ? [{ url: p.thumbnail_url, path: p.thumbnail_url, name: 'Ảnh sản phẩm' }] : []);
                                    const briefFiles = p.brief_file_items || (p.brief_file_url ? [{ url: p.brief_file_url, path: p.brief_file_url, name: p.brief_file_name || 'Tài liệu brief', size: null, type: null }] : []);

                                    return (
                                        <div
                                            key={p.id || idx}
                                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4"
                                        >
                                            {/* Header sản phẩm */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-100 text-primary-800">
                                                        <ShoppingBag className="h-3.5 w-3.5" />
                                                        #{idx + 1}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        {p.name || p.product_name}
                                                    </h4>
                                                    {p.sku && (
                                                        <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                            SKU: {p.sku}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-xs">
                                                    {p.retail_price ? (
                                                        <span className="font-semibold text-slate-700">
                                                            Giá bán: <span className="font-bold text-primary-700">{Number(p.retail_price).toLocaleString('vi-VN')} đ</span>
                                                        </span>
                                                    ) : null}
                                                    {p.product_url && (
                                                        <a
                                                            href={p.product_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline"
                                                        >
                                                            <span>Link mua hàng</span>
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Nội dung chi tiết SP */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {/* Cột trái: Ảnh & Kịch bản */}
                                                <div className="space-y-3">
                                                    {/* Gallery ảnh */}
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                                            <ImageIcon className="h-3.5 w-3.5 text-primary-600" />
                                                            Hình ảnh sản phẩm ({images.length})
                                                        </p>
                                                        {images.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2.5 items-center">
                                                                {images.map((img, imgIdx) => (
                                                                    <div
                                                                        key={imgIdx}
                                                                        className="group relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer"
                                                                        onClick={() => setPreviewModalImage({ url: img.url, name: img.name })}
                                                                    >
                                                                        <img
                                                                            src={img.url}
                                                                            alt={img.name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        {imgIdx === 0 && (
                                                                            <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary-600 text-white shadow-xs">
                                                                                Bìa
                                                                            </span>
                                                                        )}
                                                                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <Eye className="h-4 w-4 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 italic">Chưa tải lên ảnh sản phẩm.</p>
                                                        )}
                                                    </div>

                                                    {/* Kịch bản USP */}
                                                    {p.brief_content && (
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 mb-1">
                                                                Kịch bản / USP nổi bật:
                                                            </p>
                                                            <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                                                                {p.brief_content}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Hashtags & Mẫu */}
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        {p.hashtags && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px]">
                                                                <Tag className="h-3 w-3 text-slate-400" />
                                                                {p.hashtags}
                                                            </span>
                                                        )}
                                                        {p.sample_requirement && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                                                                Mẫu: {p.sample_requirement}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Cột phải: Danh sách file brief đính kèm */}
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                                                        Tài liệu kịch bản & Brief ({briefFiles.length})
                                                    </p>
                                                    {briefFiles.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {briefFiles.map((f, fIdx) => (
                                                                <div
                                                                    key={fIdx}
                                                                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs hover:border-primary-200 transition-colors shadow-2xs"
                                                                >
                                                                    <div className="flex items-center gap-2 truncate pr-2">
                                                                        <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                                                                        <span className="font-semibold text-slate-800 truncate" title={f.name}>
                                                                            {f.name}
                                                                        </span>
                                                                    </div>
                                                                    <a
                                                                        href={f.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        download
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 shrink-0 transition-colors"
                                                                    >
                                                                        <Download className="h-3 w-3" />
                                                                        <span>Tải file</span>
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 italic">Chưa có tài liệu brief đính kèm.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL GÁN CREATOR MỚI VÀO CHIẾN DỊCH */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                        onClick={() => setIsAddModalOpen(false)}
                    />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div
                            className={`relative w-full ${
                                modalTab === 'import_file' && importStep === 'review'
                                    ? 'max-w-3xl'
                                    : 'max-w-xl'
                            } rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 transition-all`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Gán KOC Vào Chiến Dịch [{campaign.name}]
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Thêm KOC từ kho dữ liệu CRM hoặc Import nhanh từ file mẫu Excel đa kênh.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* BỘ CHUYỂN ĐỔI 3 CHẾ ĐỘ: CHỌN TỪNG KOC | CHỌN TOÀN BỘ KHO | IMPORT FILE MẪU */}
                            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs mb-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalTab('specific');
                                        setSelectAllInDb(false);
                                        addForm.setData('select_all_in_db', false);
                                    }}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                        modalTab === 'specific'
                                            ? 'bg-white text-primary-700 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    <span className="truncate">Chọn KOC ({addForm.data.creator_ids.length})</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalTab('all_db');
                                        setSelectAllInDb(true);
                                        addForm.setData('select_all_in_db', true);
                                    }}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                        modalTab === 'all_db'
                                            ? 'bg-primary-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Database className="h-3.5 w-3.5" />
                                    <span className="truncate">Cả kho ({totalAvailableCount})</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalTab('import_file');
                                        setSelectAllInDb(false);
                                        addForm.setData('select_all_in_db', false);
                                    }}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                        modalTab === 'import_file'
                                            ? 'bg-indigo-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <FileSpreadsheet className="h-3.5 w-3.5" />
                                    <span className="truncate">Import File Mẫu</span>
                                </button>
                            </div>

                            {/* NỘI DUNG THEO TAB ĐANG CHỌN */}
                            {modalTab === 'import_file' ? (
                                <div className="space-y-4">
                                    {importError && (
                                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in">
                                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                            <div className="flex-1 font-medium leading-relaxed">{importError}</div>
                                            <button
                                                type="button"
                                                onClick={() => setImportError(null)}
                                                className="text-rose-400 hover:text-rose-700"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    {importStep === 'upload' ? (
                                        <form onSubmit={handlePreviewImport} className="space-y-4">
                                            {/* Card Tải File Mẫu Chuẩn */}
                                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100/90 text-xs text-indigo-950">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs shrink-0">
                                                        <FileSpreadsheet className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">
                                                            File mẫu Excel có Dropdown & Hỗ trợ Đa Kênh
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            Chọn nhanh nền tảng, nhập 1 KOC nhiều kênh (TikTok, Shopee, FB...)
                                                        </p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={route('campaigns.creators.import-template', campaign.id)}
                                                    download
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs shadow-2xs transition-all shrink-0 cursor-pointer"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    <span>Tải File Mẫu (.xlsx)</span>
                                                </a>
                                            </div>

                                            {/* Khu Vực Tải Lên Danh Sách File */}
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Tải lên danh sách KOC (.xlsx, .xls, .csv) <span className="text-rose-500">*</span>
                                                </label>
                                                <div
                                                    onClick={() => document.getElementById('koc-import-file-input')?.click()}
                                                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                                                        importFile
                                                            ? 'border-indigo-400 bg-indigo-50/30'
                                                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                                                    }`}
                                                >
                                                    <input
                                                        id="koc-import-file-input"
                                                        type="file"
                                                        accept=".xlsx,.xls,.csv"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                setImportFile(e.target.files[0]);
                                                                setImportError(null);
                                                            }
                                                        }}
                                                    />
                                                    {importFile ? (
                                                        <div className="flex items-center justify-center gap-3 text-left">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                                                                <CheckCircle2 className="h-5 w-5" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold text-slate-900 truncate">
                                                                    {importFile.name}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    {(importFile.size / 1024).toFixed(1)} KB • Sẵn sàng kiểm tra đối soát
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setImportFile(null);
                                                                }}
                                                                className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                                                            >
                                                                Đổi file khác
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1 text-slate-500">
                                                            <Upload className="h-6 w-6 mx-auto text-slate-400 mb-1" />
                                                            <p className="text-xs font-semibold text-slate-700">
                                                                Kéo & thả file Excel/CSV vào đây hoặc{' '}
                                                                <span className="text-indigo-600">bấm để chọn</span>
                                                            </p>
                                                            <p className="text-[11px] text-slate-400">
                                                                Hỗ trợ định dạng .xlsx, .xls, .csv (tối đa 15MB)
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Cài Đặt Mặc Định (Áp dụng khi trong file KOC để trống) */}
                                            <div className="space-y-3 pt-1 border-t border-slate-100">
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                    Cài đặt mặc định (nếu dòng trong file để trống)
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormField label="Phí booking mặc định (VND)">
                                                        <TextInput
                                                            type="number"
                                                            value={importDefaultBookingFee}
                                                            onChange={(e) => setImportDefaultBookingFee(e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </FormField>

                                                    <FormField label="Nhân viên phụ trách">
                                                        <Select
                                                            value={importAssignedTo}
                                                            onChange={(e) => setImportAssignedTo(e.target.value)}
                                                            placeholder="Chọn nhân viên..."
                                                            options={staffUsers.map((u) => ({ value: u.id, label: u.name }))}
                                                        />
                                                    </FormField>
                                                </div>

                                                <FormField
                                                    label="Nền tảng giao KOC thực hiện mặc định"
                                                    hint="Nếu KOC trong file không ghi nền tảng, sẽ áp dụng các kênh này"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                        {(['tiktok', 'shopee', 'facebook', 'youtube', 'instagram'] as const).map((plat) => {
                                                            const isSelected = importPlatforms.includes(plat);
                                                            return (
                                                                <button
                                                                    key={plat}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isSelected) {
                                                                            if (importPlatforms.length <= 1) return;
                                                                            setImportPlatforms(importPlatforms.filter((p) => p !== plat));
                                                                        } else {
                                                                            setImportPlatforms([...importPlatforms, plat]);
                                                                        }
                                                                    }}
                                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none ${
                                                                        isSelected
                                                                            ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-indigo-500/30'
                                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    <PlatformLogo platform={plat} size="xs" />
                                                                    <span>{getPlatformDisplayName(plat)}</span>
                                                                    {isSelected && (
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-0.5" />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </FormField>
                                            </div>

                                            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => setIsAddModalOpen(false)}
                                                >
                                                    Hủy bỏ
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    variant="primary"
                                                    disabled={!importFile || importLoading}
                                                    loading={importLoading}
                                                    loadingText="Đang quét file..."
                                                    iconLeft={<Search className="h-4 w-4" />}
                                                >
                                                    Kiểm Tra & Xem Trước File
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        /* BƯỚC 2: REVIEW & XÁC NHẬN ĐỐI SOÁT TRÙNG */
                                        <div className="space-y-4">
                                            {/* Thanh Tóm Tắt Quét File */}
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-700">Tổng KOC tìm thấy:</span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                                                        🟢 {importPreviewData?.summary.new_count || 0} mới
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                                        🟡 {importPreviewData?.summary.crm_duplicate_count || 0} trùng CRM
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                                                        🔴 {importPreviewData?.summary.campaign_duplicate_count || 0} đã có trong CD
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                                                    Sẽ gán: {totalKocsToAssign} KOC
                                                </div>
                                            </div>

                                            <div className="max-h-96 overflow-y-auto space-y-4 pr-1 divide-y divide-slate-100">
                                                {/* KHỐI 1: KOC TRÙNG KHO CRM (CẦN XÁC NHẬN) */}
                                                {(importPreviewData?.crm_duplicates || []).length > 0 && (
                                                    <div className="space-y-2 pt-2">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                                                    KOC đã có trong kho CRM ({importPreviewData?.crm_duplicates.length})
                                                                </h4>
                                                                <p className="text-[11px] text-slate-500">
                                                                    Đã có hồ sơ trong CRM, file có thêm kênh hoặc thông tin mới.
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px]">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = { ...importResolutions };
                                                                        importPreviewData?.crm_duplicates.forEach((c) => {
                                                                            next[c.key] = 'update_and_assign';
                                                                        });
                                                                        setImportResolutions(next);
                                                                    }}
                                                                    className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold cursor-pointer"
                                                                >
                                                                    Cập nhật tất cả
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = { ...importResolutions };
                                                                        importPreviewData?.crm_duplicates.forEach((c) => {
                                                                            next[c.key] = 'skip';
                                                                        });
                                                                        setImportResolutions(next);
                                                                    }}
                                                                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer"
                                                                >
                                                                    Bỏ qua tất cả
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {importPreviewData?.crm_duplicates.map((dup) => {
                                                                const action = importResolutions[dup.key] || 'update_and_assign';
                                                                return (
                                                                    <div
                                                                        key={dup.key}
                                                                        className={`p-3 rounded-xl border text-xs transition-all ${
                                                                            action === 'skip'
                                                                                ? 'bg-slate-50/70 border-slate-200 opacity-60'
                                                                                : 'bg-amber-50/30 border-amber-200'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-bold text-slate-900">{dup.name}</span>
                                                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                                                                        Đã có trong CRM
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                                                    SĐT: {dup.phone || 'Chưa có'} • Kênh cũ:{' '}
                                                                                    {dup.existing_accounts.map((a) => `${a.platform} (@${a.handle})`).join(', ') || 'Chưa có'}
                                                                                </p>
                                                                            </div>

                                                                            <select
                                                                                value={action}
                                                                                onChange={(e) => {
                                                                                    setImportResolutions({
                                                                                        ...importResolutions,
                                                                                        [dup.key]: e.target.value,
                                                                                    });
                                                                                }}
                                                                                className="text-xs rounded-lg border-slate-300 py-1 pl-2.5 pr-7 focus:ring-amber-500 font-medium bg-white"
                                                                            >
                                                                                <option value="update_and_assign">
                                                                                    Cập nhật kênh mới & Gán vào CD
                                                                                </option>
                                                                                <option value="assign_only">
                                                                                    Chỉ gán, giữ nguyên hồ sơ CRM
                                                                                </option>
                                                                                <option value="skip">Bỏ qua KOC này</option>
                                                                            </select>
                                                                        </div>

                                                                        {dup.new_accounts.length > 0 && (
                                                                            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-amber-100/60 text-[11px] text-slate-600">
                                                                                <span className="text-slate-400">Kênh mới từ file:</span>
                                                                                {dup.new_accounts.map((acc, i) => (
                                                                                    <span
                                                                                        key={i}
                                                                                        className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium"
                                                                                    >
                                                                                        <PlatformLogo platform={acc.platform} size="xs" />
                                                                                        <span>@{acc.handle}</span>
                                                                                        {acc.followers > 0 && (
                                                                                            <span className="text-[10px] text-slate-400">
                                                                                                ({acc.followers.toLocaleString()} flw)
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* KHỐI 2: KOC ĐÃ CÓ SẴN TRONG CHIẾN DỊCH */}
                                                {(importPreviewData?.campaign_duplicates || []).length > 0 && (
                                                    <div className="space-y-2 pt-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                                                    <X className="h-3.5 w-3.5 text-rose-600" />
                                                                    KOC đã có sẵn trong chiến dịch này ({importPreviewData?.campaign_duplicates.length})
                                                                </h4>
                                                                <p className="text-[11px] text-slate-500">
                                                                    Mặc định bỏ qua để giữ nguyên trạng thái và tiến độ video đang làm.
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px]">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = { ...importResolutions };
                                                                        importPreviewData?.campaign_duplicates.forEach((c) => {
                                                                            next[c.key] = 'skip';
                                                                        });
                                                                        setImportResolutions(next);
                                                                    }}
                                                                    className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold cursor-pointer"
                                                                >
                                                                    Bỏ qua tất cả
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = { ...importResolutions };
                                                                        importPreviewData?.campaign_duplicates.forEach((c) => {
                                                                            next[c.key] = 'override_campaign';
                                                                        });
                                                                        setImportResolutions(next);
                                                                    }}
                                                                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer"
                                                                >
                                                                    Cập nhật phí tất cả
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {importPreviewData?.campaign_duplicates.map((dup) => {
                                                                const action = importResolutions[dup.key] || 'skip';
                                                                return (
                                                                    <div
                                                                        key={dup.key}
                                                                        className="p-3 rounded-xl border border-rose-100 bg-rose-50/20 text-xs flex items-center justify-between gap-3"
                                                                    >
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-bold text-slate-900">{dup.name}</span>
                                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                                                                                    Đã có trong CD ({dup.current_status})
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                                                SĐT: {dup.phone || 'Chưa có'} • Phí hiện tại: {Number(dup.current_fee).toLocaleString()}đ
                                                                            </p>
                                                                        </div>

                                                                        <select
                                                                            value={action}
                                                                            onChange={(e) => {
                                                                                setImportResolutions({
                                                                                    ...importResolutions,
                                                                                    [dup.key]: e.target.value,
                                                                                });
                                                                            }}
                                                                            className="text-xs rounded-lg border-slate-300 py-1 pl-2.5 pr-7 focus:ring-rose-500 font-medium bg-white"
                                                                        >
                                                                            <option value="skip">Bỏ qua (Giữ nguyên tiến độ)</option>
                                                                            <option value="override_campaign">
                                                                                Cập nhật lại phí booking
                                                                            </option>
                                                                        </select>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* KHỐI 3: KOC MỚI HOÀN TOÀN */}
                                                {(importPreviewData?.new_kocs || []).length > 0 && (
                                                    <div className="space-y-2 pt-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                                    KOC mới hoàn toàn ({importPreviewData?.new_kocs.length})
                                                                </h4>
                                                                <p className="text-[11px] text-slate-500">
                                                                    Sẽ tự động tạo vào kho CRM và gán vào chiến dịch này.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {importPreviewData?.new_kocs.map((k) => (
                                                                <div
                                                                    key={k.key}
                                                                    className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs text-xs space-y-1"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="font-bold text-slate-900 truncate">
                                                                            {k.name}
                                                                        </span>
                                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold shrink-0 uppercase">
                                                                            {k.tier}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
                                                                        <span>{k.phone || 'Chưa có SĐT'}</span>
                                                                        <span>•</span>
                                                                        <span>{k.niche}</span>
                                                                        {k.accounts.length > 0 && (
                                                                            <div className="flex items-center gap-1 ml-auto">
                                                                                {k.accounts.map((a, i) => (
                                                                                    <PlatformLogo key={i} platform={a.platform} size="xs" />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nút Hành Động Xác Nhận Import */}
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => setImportStep('upload')}
                                                    iconLeft={<ArrowLeft className="h-4 w-4" />}
                                                >
                                                    Chọn lại file khác
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    disabled={totalKocsToAssign === 0 || importLoading}
                                                    loading={importLoading}
                                                    loadingText="Đang import & gán..."
                                                    onClick={handleConfirmImport}
                                                    iconLeft={<FileSpreadsheet className="h-4 w-4" />}
                                                >
                                                    Xác Nhận Import ({totalKocsToAssign} KOC)
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* FORM CHỌN TỪNG KOC HOẶC CHỌN TOÀN BỘ KHO TRUYỀN THỐNG */
                                <form onSubmit={handleAddCreatorsSubmit} className="space-y-4">
                                    {/* NỘI DUNG THEO CHẾ ĐỘ */}
                                    {selectAllInDb ? (
                                        <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 space-y-3 animate-in fade-in">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
                                                    <Database className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold text-slate-900">
                                                            Đã chọn toàn bộ KOC trong kho dữ liệu
                                                        </h4>
                                                        <Badge variant="success" size="sm">
                                                            {totalAvailableCount} KOC khả dụng
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                                        Hệ thống sẽ tự động gán toàn bộ{' '}
                                                        <strong className="text-slate-900">{totalAvailableCount} KOC</strong>{' '}
                                                        khả dụng trong kho CRM (chưa có trong chiến dịch này) vào quy trình làm việc.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary-100 text-xs">
                                                <div className="p-2.5 rounded-lg bg-white/80 border border-primary-100">
                                                    <span className="text-[11px] text-slate-500 block">Đã có trong chiến dịch</span>
                                                    <span className="text-sm font-bold text-slate-800">
                                                        {campaign.campaign_creators.length} KOC
                                                    </span>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-white/80 border border-primary-100">
                                                    <span className="text-[11px] text-slate-500 block">Sẽ gán mới đợt này</span>
                                                    <span className="text-sm font-bold text-primary-600">
                                                        +{totalAvailableCount} KOC
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-slate-500 italic flex items-center gap-1.5">
                                                <Info className="h-3.5 w-3.5 text-primary-500 shrink-0" />
                                                Mỗi KOC sẽ được cấp sẵn token bảo mật Cổng KOC Portal (hạn 14 ngày) để điền địa chỉ nhận hàng.
                                            </p>
                                        </div>
                                    ) : (
                                        <FormField
                                            label="Chọn KOC từ kho CRM"
                                            required
                                            error={addForm.errors.creator_ids}
                                        >
                                            {/* Ô tìm kiếm nhanh trong danh sách khả dụng */}
                                            <div className="relative mb-2">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={modalSearch}
                                                    onChange={(e) => setModalSearch(e.target.value)}
                                                    placeholder="Gõ tên, SĐT hoặc handle (@kênh) để lọc nhanh..."
                                                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
                                                />
                                            </div>

                                            {/* Thanh Lọc Nền Tảng Kênh Của KOC (TikTok, Shopee, FB, YT, Insta) */}
                                            <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setModalPlatformFilter('all')}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                        modalPlatformFilter === 'all'
                                                            ? 'bg-slate-900 text-white shadow-2xs'
                                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span>Tất cả kênh</span>
                                                    <span
                                                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                            modalPlatformFilter === 'all'
                                                                ? 'bg-slate-700 text-white'
                                                                : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                    >
                                                        {platformCounts.all || 0}
                                                    </span>
                                                </button>

                                                {['tiktok', 'shopee', 'facebook', 'youtube', 'instagram'].map((plat) => {
                                                    const count = platformCounts[plat] || 0;
                                                    const isTarget = campaign.target_platforms?.includes(plat);
                                                    const isSelected = modalPlatformFilter === plat;

                                                    return (
                                                        <button
                                                            key={plat}
                                                            type="button"
                                                            onClick={() => setModalPlatformFilter(plat)}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-primary-600 text-white shadow-2xs'
                                                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                                            }`}
                                                            title={`Lọc KOC có kênh ${getPlatformDisplayName(plat)}`}
                                                        >
                                                            <PlatformLogo platform={plat} size="xs" />
                                                            <span>{getPlatformDisplayName(plat)}</span>
                                                            <span
                                                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                                    isSelected
                                                                        ? 'bg-primary-700 text-white'
                                                                        : count > 0
                                                                        ? 'bg-slate-100 text-slate-700'
                                                                        : 'bg-slate-50 text-slate-400'
                                                                }`}
                                                            >
                                                                {count}
                                                            </span>
                                                            {isTarget && !isSelected && (
                                                                <span
                                                                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                                                    title="Nền tảng mục tiêu chiến dịch"
                                                                />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Thanh Chọn Tất Cả / Thao Tác Hàng Loạt */}
                                            {availableCreators.length > 0 && (
                                                <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllFilteredSelected}
                                                            ref={(el) => {
                                                                if (el) {
                                                                    el.indeterminate = isSomeFilteredSelected;
                                                                }
                                                            }}
                                                            onChange={handleToggleSelectAll}
                                                            disabled={filteredAvailableCreators.length === 0}
                                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4 disabled:opacity-50 cursor-pointer"
                                                        />
                                                        <span>
                                                            {modalSearch || modalPlatformFilter !== 'all'
                                                                ? `Chọn kết quả lọc (${filteredAvailableCreators.length} KOC)`
                                                                : `Chọn danh sách hiển thị (${availableCreators.length} KOC)`}
                                                        </span>
                                                    </label>

                                                    <div className="flex items-center gap-2.5 text-[11px]">
                                                        {addForm.data.creator_ids.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={handleDeselectAll}
                                                                className="text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                                                            >
                                                                Bỏ chọn hết
                                                            </button>
                                                        )}
                                                        {totalAvailableCount > addForm.data.creator_ids.length && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectAllInDb(true);
                                                                    addForm.setData('select_all_in_db', true);
                                                                }}
                                                                className="text-primary-600 hover:text-primary-700 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Database className="h-3 w-3" />
                                                                Chọn toàn bộ kho ({totalAvailableCount})
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-2 divide-y divide-slate-100 space-y-1 bg-slate-50/50">
                                                {filteredAvailableCreators.length > 0 ? (
                                                    filteredAvailableCreators.map((cr) => (
                                                        <label
                                                            key={cr.id}
                                                            className="flex items-center gap-2.5 p-2 hover:bg-white rounded-lg cursor-pointer text-xs transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={addForm.data.creator_ids.includes(cr.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        addForm.setData('creator_ids', [
                                                                            ...addForm.data.creator_ids,
                                                                            cr.id,
                                                                        ]);
                                                                    } else {
                                                                        addForm.setData(
                                                                            'creator_ids',
                                                                            addForm.data.creator_ids.filter((id) => id !== cr.id)
                                                                        );
                                                                    }
                                                                }}
                                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <span className="font-bold text-slate-900 truncate">
                                                                            {cr.name}
                                                                        </span>
                                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-slate-600 shrink-0">
                                                                            {cr.tier.toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <KocPlatformCluster accounts={cr.accounts} size="xs" />
                                                                </div>
                                                                <div className="text-[11px] text-slate-500">
                                                                    {cr.phone || 'Chưa có SĐT'} • Niche: {cr.niche}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic p-4 text-center">
                                                        {modalSearch || modalPlatformFilter !== 'all'
                                                            ? 'Không tìm thấy KOC nào phù hợp bộ lọc kênh này.'
                                                            : 'Tất cả KOC khả dụng đã được gán vào chiến dịch này.'}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                                                <span>
                                                    Đã chọn:{' '}
                                                    <strong className="text-primary-600">
                                                        {addForm.data.creator_ids.length}
                                                    </strong>{' '}
                                                    / {totalAvailableCount} KOC khả dụng
                                                </span>
                                                {(modalSearch || modalPlatformFilter !== 'all') && (
                                                    <span className="text-slate-400">
                                                        (Đang lọc: {filteredAvailableCreators.length} KOC phù hợp)
                                                    </span>
                                                )}
                                            </div>
                                        </FormField>
                                    )}

                                    {/* Chọn nền tảng KOC sẽ làm trong chiến dịch này */}
                                    <FormField
                                        label="Nền tảng giao KOC thực hiện"
                                        hint="Chiến dịch có thể đa nền tảng, chọn các kênh KOC này sẽ làm video"
                                    >
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            {(campaign.target_platforms && campaign.target_platforms.length > 0
                                                ? campaign.target_platforms
                                                : (['tiktok', 'shopee', 'facebook', 'youtube', 'instagram'] as const)
                                            ).map((plat) => {
                                                const isSelected = addForm.data.booking_platforms.includes(plat);
                                                return (
                                                    <button
                                                        key={plat}
                                                        type="button"
                                                        onClick={() => {
                                                            const cur = addForm.data.booking_platforms;
                                                            let next: string[];
                                                            if (isSelected) {
                                                                if (cur.length <= 1) return; // Giữ ít nhất 1
                                                                next = cur.filter((p) => p !== plat);
                                                            } else {
                                                                next = [...cur, plat];
                                                            }
                                                            addForm.setData('booking_platforms', next);
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none ${
                                                            isSelected
                                                                ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-primary-500/30'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <PlatformLogo platform={plat} size="xs" />
                                                        <span>{getPlatformDisplayName(plat)}</span>
                                                        {isSelected && (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-0.5" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </FormField>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <FormField label="Phí booking dự kiến (VND)" error={addForm.errors.booking_fee}>
                                            <TextInput
                                                type="number"
                                                value={addForm.data.booking_fee}
                                                onChange={(e) => addForm.setData('booking_fee', e.target.value)}
                                                placeholder="0"
                                            />
                                        </FormField>

                                        <FormField label="Nhân viên phụ trách" error={addForm.errors.assigned_to}>
                                            <Select
                                                value={addForm.data.assigned_to}
                                                onChange={(e) => addForm.setData('assigned_to', e.target.value)}
                                                placeholder="Chọn nhân viên..."
                                                options={staffUsers.map((u) => ({ value: u.id, label: u.name }))}
                                            />
                                        </FormField>
                                    </div>

                                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setIsAddModalOpen(false)}
                                        >
                                            Hủy bỏ
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={
                                                selectAllInDb
                                                    ? totalAvailableCount === 0
                                                    : addForm.data.creator_ids.length === 0
                                            }
                                            loading={addForm.processing}
                                            loadingText="Đang gán..."
                                            iconLeft={selectAllInDb ? <Database className="h-4 w-4" /> : undefined}
                                        >
                                            {selectAllInDb
                                                ? `Xác Nhận Gán Toàn Bộ (${totalAvailableCount} KOC)`
                                                : `Xác Nhận Gán (${addForm.data.creator_ids.length})`}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* LIGHTBOX MODAL XEM TRƯỚC ẢNH PHÓNG TO */}
            {previewModalImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setPreviewModalImage(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                            <span className="text-xs font-bold text-slate-800 truncate max-w-md">
                                {previewModalImage.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewModalImage(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-2 flex items-center justify-center bg-slate-900/5 overflow-auto max-h-[80vh]">
                            <img
                                src={previewModalImage.url}
                                alt={previewModalImage.name}
                                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
