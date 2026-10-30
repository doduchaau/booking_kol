import React, { useState, useMemo } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
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
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import FormField from '@/Components/Form/FormField';
import Select from '@/Components/Form/Select';
import TextInput from '@/Components/Form/TextInput';
import KocMatrixTable, {
    CampaignCreatorPivot,
    Creator,
} from './Partials/KocMatrixTable';

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
    video_deadline_days?: number;
    commission_rate: string | number;
    status: 'draft' | 'active' | 'completed' | 'paused';
    campaign_creators: CampaignCreatorPivot[];
}

interface Props {
    campaign: Campaign;
    stats: CampaignStats;
    stageCounts?: Record<string, number>;
    availableCreators: Creator[];
    staffUsers: { id: number; name: string; email: string }[];
}

export default function Show({
    campaign,
    stats,
    availableCreators,
    staffUsers,
}: Props) {
    const [activeTab, setActiveTab] = useState<'matrix' | 'guidelines'>('matrix');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');

    // Form gán Creator mới
    const addForm = useForm({
        creator_ids: [] as number[],
        assigned_to: '',
        booking_fee: '0',
    });

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
        if (!modalSearch.trim()) return availableCreators;
        const q = modalSearch.toLowerCase().trim();
        return availableCreators.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.phone && c.phone.includes(q)) ||
                (c.niche && c.niche.toLowerCase().includes(q))
        );
    }, [availableCreators, modalSearch]);

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
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            Gán KOC Vào Chiến Dịch
                        </Button>
                    </div>
                }
            />

            {/* 4 Thẻ KPI Tóm Tắt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        Tiến độ lên video
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {stats.completed_videos} / {stats.target_count}
                        </span>
                        <span className="text-xs font-semibold text-primary-600">
                            ({stats.video_progress_percent}%)
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary-600 transition-all duration-500"
                            style={{ width: `${stats.video_progress_percent}%` }}
                        />
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        KOC Đã Gán
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {stats.total_assigned}
                        </span>
                        <span className="text-xs text-slate-400">
                            mục tiêu: {campaign.target_creators_count}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Đang trong tiến trình booking</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        Ngân Sách Dự Kiến
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {formatCurrency(campaign.budget)}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        Đã cam kết: {formatCurrency(stats.total_committed_budget)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        Hoa Hồng Affiliate
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {campaign.commission_rate}%
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Chia sẻ doanh số bán lẻ</p>
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
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                />
            )}

            {/* TAB GUIDELINES & HƯỚNG DẪN */}
            {activeTab === 'guidelines' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary-600" />
                            Hướng Dẫn Kịch Bản & Quy Định Cấm Kỵ
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
            )}

            {/* MODAL GÁN CREATOR MỚI VÀO CHIẾN DỊCH */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                        onClick={() => setIsAddModalOpen(false)}
                    />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                            <h2 className="text-lg font-bold text-slate-900 mb-1">
                                Gán KOC Vào Chiến Dịch [{campaign.name}]
                            </h2>
                            <p className="text-xs text-slate-500 mb-4">
                                Chọn KOC từ kho dữ liệu CRM để thêm vào quy trình làm việc của chiến dịch.
                            </p>

                            <form onSubmit={handleAddCreatorsSubmit} className="space-y-4">
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
                                            placeholder="Gõ tên hoặc SĐT để lọc nhanh..."
                                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400"
                                        />
                                    </div>

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
                                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-900">{cr.name}</span>
                                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-slate-600">
                                                                {cr.tier.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {cr.phone || 'Chưa có SĐT'} • Niche: {cr.niche}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic p-4 text-center">
                                                {modalSearch ? 'Không tìm thấy KOC nào.' : 'Tất cả KOC khả dụng đã được gán vào chiến dịch này.'}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1.5">
                                        Đã chọn: <span className="font-bold text-primary-600">{addForm.data.creator_ids.length}</span> KOC
                                    </p>
                                </FormField>

                                <div className="grid grid-cols-2 gap-3">
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
                                        disabled={addForm.data.creator_ids.length === 0}
                                        loading={addForm.processing}
                                        loadingText="Đang gán..."
                                    >
                                        Xác Nhận Gán ({addForm.data.creator_ids.length})
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
