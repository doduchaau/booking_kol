import React, { useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FolderKanban, Save, Calendar, Target, Sparkles, Paperclip, FileText, X, ExternalLink, Trash2 } from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Select from '@/Components/Form/Select';
import Textarea from '@/Components/Form/Textarea';

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
    content_guidelines_file?: string | null;
    content_guidelines_file_url?: string | null;
    sample_requirement: string | null;
    sample_requirement_file?: string | null;
    sample_requirement_file_url?: string | null;
    video_deadline_days?: number;
    commission_rate: string | number;
    status: string;
}

interface Props {
    campaign: Campaign;
    statuses: { value: string; label: string }[];
}

export default function Edit({ campaign, statuses }: Props) {
    const guidelineFileInputRef = useRef<HTMLInputElement>(null);
    const sampleFileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: campaign.name,
        product_name: campaign.product_name,
        product_sku: campaign.product_sku || '',
        budget: campaign.budget.toString(),
        target_creators_count: campaign.target_creators_count,
        start_date: campaign.start_date.split('T')[0],
        end_date: campaign.end_date.split('T')[0],
        content_guidelines: campaign.content_guidelines || '',
        content_guidelines_file: null as File | null,
        remove_content_guidelines_file: false,
        sample_requirement: campaign.sample_requirement || '',
        sample_requirement_file: null as File | null,
        remove_sample_requirement_file: false,
        video_deadline_days: campaign.video_deadline_days || 7,
        commission_rate: campaign.commission_rate ? campaign.commission_rate.toString() : '0',
        status: campaign.status,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('campaigns.update', campaign.id));
    };

    return (
        <AppLayout title={`Chỉnh Sửa Chiến Dịch - ${campaign.name}`}>
            <PageHeader
                title="Chỉnh Sửa Chiến Dịch"
                description={`Cập nhật thông tin chiến dịch [${campaign.name}]`}
                backHref={route('campaigns.show', campaign.id)}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Chiến dịch', href: route('campaigns.index') },
                    { label: campaign.name, href: route('campaigns.show', campaign.id) },
                    { label: 'Chỉnh sửa' },
                ]}
            />

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cột Trái (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <FolderKanban className="h-5 w-5 text-primary-600" />
                                1. Thông Tin Chiến Dịch & Sản Phẩm
                            </h2>

                            <FormField label="Tên chiến dịch booking" required error={errors.name}>
                                <TextInput
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={!!errors.name}
                                />
                            </FormField>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Tên sản phẩm chính" required error={errors.product_name}>
                                    <TextInput
                                        value={data.product_name}
                                        onChange={(e) => setData('product_name', e.target.value)}
                                        error={!!errors.product_name}
                                    />
                                </FormField>

                                <FormField label="Mã SKU sản phẩm" error={errors.product_sku}>
                                    <TextInput
                                        value={data.product_sku}
                                        onChange={(e) => setData('product_sku', e.target.value)}
                                        error={!!errors.product_sku}
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* Khối 2: Guideline & Mẫu sản phẩm */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary-600" />
                                2. Kịch Bản & Quy Định Gửi Mẫu
                            </h2>

                            {/* Mục 1: Kịch bản */}
                            <div className="space-y-2">
                                <FormField
                                    label="Hướng dẫn kịch bản / Guideline nội dung"
                                    hint="Quy định thông điệp bắt buộc, hashtag, góc quay và các từ cấm kỵ"
                                    error={errors.content_guidelines}
                                >
                                    <Textarea
                                        value={data.content_guidelines}
                                        onChange={(e) => setData('content_guidelines', e.target.value)}
                                        rows={4}
                                    />
                                </FormField>

                                {/* File đính kèm kịch bản hiện tại / tải lên mới */}
                                <div>
                                    <input
                                        type="file"
                                        ref={guidelineFileInputRef}
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setData('content_guidelines_file', file);
                                            setData('remove_content_guidelines_file', false);
                                        }}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
                                    />

                                    {/* Nếu vừa chọn file mới */}
                                    {data.content_guidelines_file ? (
                                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary-200 bg-primary-50/50 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                                                <span className="font-semibold text-slate-800 truncate">
                                                    File mới: {data.content_guidelines_file.name}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    ({(data.content_guidelines_file.size / 1024 / 1024).toFixed(2)} MB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setData('content_guidelines_file', null);
                                                    if (guidelineFileInputRef.current) guidelineFileInputRef.current.value = '';
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white"
                                                title="Hủy chọn file mới"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : campaign.content_guidelines_file_url && !data.remove_content_guidelines_file ? (
                                        /* File đã lưu từ trước */
                                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-slate-600 shrink-0" />
                                                <span className="font-medium text-slate-700 truncate">
                                                    Tài liệu kịch bản hiện tại
                                                </span>
                                                <a
                                                    href={campaign.content_guidelines_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-0.5 text-[11px] text-primary-600 hover:underline font-semibold"
                                                >
                                                    <span>Xem/Tải file</span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => guidelineFileInputRef.current?.click()}
                                                    className="px-2 py-1 rounded text-[11px] bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                                >
                                                    Thay file
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setData('remove_content_guidelines_file', true)}
                                                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                                                    title="Xóa file đính kèm"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Chưa có file */
                                        <button
                                            type="button"
                                            onClick={() => guidelineFileInputRef.current?.click()}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-primary-500 hover:bg-primary-50/30 text-xs text-slate-600 transition-colors"
                                        >
                                            <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Đính kèm file tài liệu / kịch bản (PDF, Word, PPTX, Ảnh...)</span>
                                        </button>
                                    )}
                                    {errors.content_guidelines_file && (
                                        <p className="text-xs text-rose-600 mt-1">{errors.content_guidelines_file}</p>
                                    )}
                                </div>
                            </div>

                            {/* Mục 2: Quy định gửi mẫu */}
                            <div className="space-y-2 pt-3 border-t border-slate-100">
                                <FormField
                                    label="Quy định về mẫu sản phẩm gửi trải nghiệm"
                                    hint="Số lượng thỏi son, màu sắc, quà tặng kèm nếu có"
                                    error={errors.sample_requirement}
                                >
                                    <Textarea
                                        value={data.sample_requirement}
                                        onChange={(e) => setData('sample_requirement', e.target.value)}
                                        rows={3}
                                    />
                                </FormField>

                                {/* File đính kèm quy định gửi mẫu */}
                                <div>
                                    <input
                                        type="file"
                                        ref={sampleFileInputRef}
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setData('sample_requirement_file', file);
                                            setData('remove_sample_requirement_file', false);
                                        }}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
                                    />

                                    {/* Nếu vừa chọn file mới */}
                                    {data.sample_requirement_file ? (
                                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary-200 bg-primary-50/50 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                                                <span className="font-semibold text-slate-800 truncate">
                                                    File mới: {data.sample_requirement_file.name}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    ({(data.sample_requirement_file.size / 1024 / 1024).toFixed(2)} MB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setData('sample_requirement_file', null);
                                                    if (sampleFileInputRef.current) sampleFileInputRef.current.value = '';
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white"
                                                title="Hủy chọn file mới"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : campaign.sample_requirement_file_url && !data.remove_sample_requirement_file ? (
                                        /* File đã lưu từ trước */
                                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-slate-600 shrink-0" />
                                                <span className="font-medium text-slate-700 truncate">
                                                    Tài liệu quy định mẫu hiện tại
                                                </span>
                                                <a
                                                    href={campaign.sample_requirement_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-0.5 text-[11px] text-primary-600 hover:underline font-semibold"
                                                >
                                                    <span>Xem/Tải file</span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => sampleFileInputRef.current?.click()}
                                                    className="px-2 py-1 rounded text-[11px] bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                                >
                                                    Thay file
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setData('remove_sample_requirement_file', true)}
                                                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                                                    title="Xóa file đính kèm"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Chưa có file */
                                        <button
                                            type="button"
                                            onClick={() => sampleFileInputRef.current?.click()}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-primary-500 hover:bg-primary-50/30 text-xs text-slate-600 transition-colors"
                                        >
                                            <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Đính kèm file danh mục / quy định mẫu sản phẩm</span>
                                        </button>
                                    )}
                                    {errors.sample_requirement_file && (
                                        <p className="text-xs text-rose-600 mt-1">{errors.sample_requirement_file}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cột Phải (1/3) */}
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary-600" />
                                Ngân Sách & Mục Tiêu
                            </h2>

                            <FormField
                                label="Tổng ngân sách dự kiến (VND)"
                                required
                                error={errors.budget}
                            >
                                <TextInput
                                    type="number"
                                    value={data.budget}
                                    onChange={(e) => setData('budget', e.target.value)}
                                    error={!!errors.budget}
                                />
                            </FormField>

                            <FormField
                                label="Mục tiêu số lượng Creator"
                                required
                                error={errors.target_creators_count}
                            >
                                <TextInput
                                    type="number"
                                    value={data.target_creators_count}
                                    onChange={(e) => setData('target_creators_count', parseInt(e.target.value) || 0)}
                                    error={!!errors.target_creators_count}
                                />
                            </FormField>

                            <FormField
                                label="Hạn lên video (số ngày sau khi nhận mẫu)"
                                hint="Số ngày tối đa KOC phải lên video kể từ ngày nhận hàng (mặc định 7 ngày)"
                                required
                                error={errors.video_deadline_days}
                            >
                                <TextInput
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={data.video_deadline_days}
                                    onChange={(e) => setData('video_deadline_days', parseInt(e.target.value) || 0)}
                                    error={!!errors.video_deadline_days}
                                />
                            </FormField>

                            <FormField label="Hoa hồng Affiliate (%)" error={errors.commission_rate}>
                                <TextInput
                                    type="number"
                                    step="0.1"
                                    value={data.commission_rate}
                                    onChange={(e) => setData('commission_rate', e.target.value)}
                                    error={!!errors.commission_rate}
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Bắt đầu" required error={errors.start_date}>
                                    <TextInput
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        error={!!errors.start_date}
                                    />
                                </FormField>

                                <FormField label="Kết thúc" required error={errors.end_date}>
                                    <TextInput
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        error={!!errors.end_date}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Trạng thái" required error={errors.status}>
                                <Select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    options={statuses}
                                />
                            </FormField>

                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    loading={processing}
                                    loadingText="Đang lưu..."
                                    iconLeft={<Save className="h-4 w-4" />}
                                    className="w-full"
                                >
                                    Lưu Thay Đổi
                                </Button>
                                <Link href={route('campaigns.show', campaign.id)} className="w-full">
                                    <Button type="button" variant="secondary" className="w-full">
                                        Hủy bỏ
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
