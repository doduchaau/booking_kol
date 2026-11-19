import React, { useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FolderKanban, Save, Calendar, DollarSign, Target, Sparkles, Paperclip, FileText, X, Users, Database } from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Select from '@/Components/Form/Select';
import Textarea from '@/Components/Form/Textarea';
import PlatformLogo, { getPlatformDisplayName } from '@/Components/Common/PlatformLogo';
import CampaignProductsBuilder, { CampaignProductFormItem } from './Partials/CampaignProductsBuilder';

interface Props {
    statuses: { value: string; label: string }[];
    totalCreatorsCount?: number;
}

export default function Create({ statuses, totalCreatorsCount = 0 }: Props) {
    const guidelineFileInputRef = useRef<HTMLInputElement>(null);
    const sampleFileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        product_name: '',
        product_sku: '',
        target_platforms: ['tiktok'] as string[],
        products: [
            {
                name: '',
                sku: '',
                product_url: '',
                retail_price: '',
                brief_content: '',
                brief_file: null,
                hashtags: '',
                sample_requirement: '',
            },
        ] as CampaignProductFormItem[],
        budget: '',
        target_creators_count: 10,
        assign_all_creators: false,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        content_guidelines: '',
        content_guidelines_file: null as File | null,
        sample_requirement: '',
        sample_requirement_file: null as File | null,
        key_messages: '',
        hashtags: '',
        brand_tag: '',
        dos_and_donts: '',
        discount_code: '',
        affiliate_link: '',
        video_deadline_days: 7,
        commission_rate: '0',
        ads_commission_rate: '0',
        status: 'active',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('campaigns.store'));
    };

    return (
        <AppLayout title="Tạo Chiến Dịch Mới">
            <PageHeader
                title="Tạo Chiến Dịch Mới"
                description="Thiết lập mục tiêu số lượng Creator, ngân sách dự kiến và quy định kịch bản nội dung"
                backHref={route('campaigns.index')}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Chiến dịch', href: route('campaigns.index') },
                    { label: 'Tạo mới' },
                ]}
            />

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cột Trái: Thông Tin Chiến Dịch & Kịch Bản (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Khối 1: Thông tin cơ bản */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <FolderKanban className="h-5 w-5 text-primary-600" />
                                1. Thông Tin Chiến Dịch & Sản Phẩm
                            </h2>

                            <FormField label="Tên chiến dịch booking" required error={errors.name}>
                                <TextInput
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ví dụ: Chiến Dịch Ra Mắt Son Môi Mùa Hè 2026"
                                    error={!!errors.name}
                                />
                            </FormField>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Tên sản phẩm đại diện" required error={errors.product_name} hint="Tên hiển thị chung của chiến dịch (tự đồng bộ từ SP đầu tiên)">
                                    <TextInput
                                        value={data.product_name}
                                        onChange={(e) => setData('product_name', e.target.value)}
                                        placeholder="Ví dụ: Combo Skincare Phục Hồi B5"
                                        error={!!errors.product_name}
                                    />
                                </FormField>

                                <FormField label="Mã SKU đại diện" error={errors.product_sku}>
                                    <TextInput
                                        value={data.product_sku}
                                        onChange={(e) => setData('product_sku', e.target.value)}
                                        placeholder="Ví dụ: SKU-COMBO-001"
                                        error={!!errors.product_sku}
                                    />
                                </FormField>
                            </div>

                            {/* Nền tảng mục tiêu chiến dịch */}
                            <FormField
                                label="Nền tảng mục tiêu chiến dịch"
                                required
                                hint="Chọn các mạng xã hội nhãn hàng muốn phủ sóng video trong chiến dịch này"
                                error={(errors as any).target_platforms}
                            >
                                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                    {(['tiktok', 'shopee', 'facebook', 'youtube', 'instagram'] as const).map((plat) => {
                                        const isSelected = data.target_platforms.includes(plat);
                                        return (
                                            <button
                                                key={plat}
                                                type="button"
                                                onClick={() => {
                                                    const cur = data.target_platforms;
                                                    let next: string[];
                                                    if (isSelected) {
                                                        if (cur.length <= 1) return; // Luôn giữ ít nhất 1 nền tảng
                                                        next = cur.filter((p) => p !== plat);
                                                    } else {
                                                        next = [...cur, plat];
                                                    }
                                                    setData('target_platforms', next);
                                                }}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none ${
                                                    isSelected
                                                        ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-primary-500/30'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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

                        {/* Khối Sản phẩm & Brief độc lập từng món */}
                        <CampaignProductsBuilder
                            products={data.products}
                            onChange={(newProds) => {
                                setData((prev) => ({
                                    ...prev,
                                    products: newProds,
                                    product_name: prev.product_name || newProds[0]?.name || '',
                                    product_sku: prev.product_sku || newProds[0]?.sku || '',
                                }));
                            }}
                            errors={errors}
                        />

                        {/* Khối 2: Guideline & Mẫu sản phẩm */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary-600" />
                                2. Kịch Bản & Quy Định Gửi Mẫu
                            </h2>

                            {/* Mục 1: Kịch bản & Guideline */}
                            <div className="space-y-2">
                                <FormField
                                    label="Hướng dẫn kịch bản / Guideline nội dung"
                                    hint="Quy định thông điệp bắt buộc, hashtag, góc quay và các từ cấm kỵ (claim quá đà, vi phạm chính sách MXH)"
                                    error={errors.content_guidelines}
                                >
                                    <Textarea
                                        value={data.content_guidelines}
                                        onChange={(e) => setData('content_guidelines', e.target.value)}
                                        rows={4}
                                        placeholder="Ví dụ: Nhấn mạnh độ bám màu 8 tiếng, gắn hashtag #SonKemLi #BeautyReview, không nói chữa dứt điểm..."
                                    />
                                </FormField>

                                {/* File đính kèm kịch bản */}
                                <div>
                                    <input
                                        type="file"
                                        ref={guidelineFileInputRef}
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setData('content_guidelines_file', file);
                                        }}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
                                    />
                                    {data.content_guidelines_file ? (
                                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary-200 bg-primary-50/50 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                                                <span className="font-semibold text-slate-800 truncate">
                                                    {data.content_guidelines_file.name}
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
                                                title="Hủy chọn file"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
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
                                        placeholder="Ví dụ: Mỗi KOC nhận 2 màu son tự chọn + 1 gương mini cầm tay..."
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
                                        }}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
                                    />
                                    {data.sample_requirement_file ? (
                                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary-200 bg-primary-50/50 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                                                <span className="font-semibold text-slate-800 truncate">
                                                    {data.sample_requirement_file.name}
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
                                                title="Hủy chọn file"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
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

                        {/* Khối 3: Brief Hợp Tác & Yêu Cầu Kịch Bản Tương Tác */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary-600" />
                                3. Thông Điệp USP & Brief Dành Cho KOC
                            </h2>

                            <FormField
                                label="Thông điệp chính / Điểm nhấn USP sản phẩm"
                                hint="Những điểm đặc biệt nhất mà KOC phải nhắc trong video review"
                                error={errors.key_messages}
                            >
                                <Textarea
                                    value={data.key_messages}
                                    onChange={(e) => setData('key_messages', e.target.value)}
                                    rows={3}
                                    placeholder="Ví dụ: 1. Thành phần 100% tự nhiên; 2. Bền màu suốt 8 tiếng không lem; 3. Không chứa chì..."
                                />
                            </FormField>

                            <FormField
                                label="Hashtags bắt buộc"
                                hint="Cách nhau bằng khoảng trắng hoặc dấu phẩy"
                                error={errors.hashtags}
                            >
                                <TextInput
                                    value={data.hashtags}
                                    onChange={(e) => setData('hashtags', e.target.value)}
                                    placeholder="#SonKemLi #BeautyReview #ReviewMỹPhẩm #BookingKOL"
                                />
                            </FormField>

                            <FormField
                                label="Tài khoản mạng xã hội của Brand cần tag (@mention)"
                                hint="Ví dụ: @official_brand_vn (hệ thống sẽ tự động quét và kiểm tra xem KOC có tag tài khoản này khi nộp video không)"
                                error={errors.brand_tag}
                            >
                                <TextInput
                                    value={data.brand_tag}
                                    onChange={(e) => setData('brand_tag', e.target.value)}
                                    placeholder="@official_brand_vn"
                                />
                            </FormField>

                            <FormField
                                label="Những việc nên làm & Điều cấm kỵ (Do's & Don'ts)"
                                hint="Quy định cấm kỵ giúp bảo vệ nhãn hàng khi KOC lên video"
                                error={errors.dos_and_donts}
                            >
                                <Textarea
                                    value={data.dos_and_donts}
                                    onChange={(e) => setData('dos_and_donts', e.target.value)}
                                    rows={3}
                                    placeholder="Nên làm: Quay cận cảnh chất son trên môi tự nhiên.&#10;Cấm: Không so sánh dìm hàng nhãn hàng khác, không dính logo nhãn hiệu khác..."
                                />
                            </FormField>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    label="Mã giảm giá độc quyền cho KOC"
                                    hint="Mã voucher riêng để KOC chia sẻ cho follower"
                                    error={errors.discount_code}
                                >
                                    <TextInput
                                        value={data.discount_code}
                                        onChange={(e) => setData('discount_code', e.target.value)}
                                        placeholder="Ví dụ: BEAUTY20K"
                                    />
                                </FormField>

                                <FormField
                                    label="Link giỏ hàng / Sản phẩm liên kết"
                                    hint="Link TikTok Shop Showcase hoặc Shopee"
                                    error={errors.affiliate_link}
                                >
                                    <TextInput
                                        type="url"
                                        value={data.affiliate_link}
                                        onChange={(e) => setData('affiliate_link', e.target.value)}
                                        placeholder="https://..."
                                    />
                                </FormField>
                            </div>
                        </div>
                    </div>

                    {/* Cột Phải: Ngân Sách, Thời Gian & Mục Tiêu (1/3) */}
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
                                    placeholder="50000000"
                                    error={!!errors.budget}
                                />
                            </FormField>

                            <FormField
                                label="Mục tiêu số lượng Creator cần book"
                                required
                                error={errors.target_creators_count}
                            >
                                <TextInput
                                    type="number"
                                    value={data.target_creators_count}
                                    onChange={(e) => setData('target_creators_count', parseInt(e.target.value) || 0)}
                                    placeholder="10"
                                    error={!!errors.target_creators_count}
                                />
                                {totalCreatorsCount > 0 && (
                                    <div className="mt-2.5 p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 transition-colors">
                                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={data.assign_all_creators}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setData((prev) => ({
                                                        ...prev,
                                                        assign_all_creators: checked,
                                                        target_creators_count: checked && totalCreatorsCount > prev.target_creators_count
                                                            ? totalCreatorsCount
                                                            : prev.target_creators_count,
                                                    }));
                                                }}
                                                className="mt-0.5 rounded border-indigo-300 text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                                        <Database className="h-3.5 w-3.5 text-primary-600" />
                                                        Chọn toàn bộ KOC trong kho dữ liệu ({totalCreatorsCount} KOC)
                                                    </span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-200/70 text-indigo-800">
                                                        Toàn bộ kho CRM
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Tự động gán toàn bộ {totalCreatorsCount} KOC khả dụng trong kho CRM vào chiến dịch này ngay khi tạo, không cần gán thủ công từng người.
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                )}
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
                                    placeholder="7"
                                    error={!!errors.video_deadline_days}
                                />
                            </FormField>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField
                                    label="Hoa hồng Affiliate (%)"
                                    hint="Đơn hàng tự nhiên qua giỏ hàng / bio"
                                    error={errors.commission_rate}
                                >
                                    <TextInput
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={data.commission_rate}
                                        onChange={(e) => setData('commission_rate', e.target.value)}
                                        placeholder="15"
                                        error={!!errors.commission_rate}
                                    />
                                </FormField>

                                <FormField
                                    label="Hoa hồng ADS (%)"
                                    hint="Đơn hàng phát sinh khi chạy quảng cáo"
                                    error={errors.ads_commission_rate}
                                >
                                    <TextInput
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={data.ads_commission_rate}
                                        onChange={(e) => setData('ads_commission_rate', e.target.value)}
                                        placeholder="5"
                                        error={!!errors.ads_commission_rate}
                                    />
                                </FormField>
                            </div>

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

                            <FormField label="Trạng thái ban đầu" required error={errors.status}>
                                <Select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value as any)}
                                    options={statuses}
                                />
                            </FormField>

                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    loading={processing}
                                    loadingText="Đang lưu chiến dịch..."
                                    iconLeft={<Save className="h-4 w-4" />}
                                    className="w-full"
                                >
                                    Khởi Tạo Chiến Dịch
                                </Button>
                                <Link href={route('campaigns.index')} className="w-full">
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
