import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Sparkles,
    MapPin,
    PackageCheck,
    Video,
    CheckCircle2,
    Calendar,
    AlertCircle,
    Send,
    Truck,
    Hash,
    Copy,
    Check,
    ExternalLink,
    FileText,
    Download,
    Paperclip,
    Clock,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Select from '@/Components/Form/Select';
import Textarea from '@/Components/Form/Textarea';
import Toast from '@/Components/Common/Toast';

export interface CampaignFileItem {
    type: string;
    title: string;
    file_name: string;
    url: string;
}

interface CampaignInfo {
    id: number;
    name: string;
    product_name: string;
    product_sku: string | null;
    sample_requirement: string | null;
    content_guidelines: string | null;
    key_messages?: string | null;
    hashtags?: string | null;
    dos_and_donts?: string | null;
    discount_code?: string | null;
    affiliate_link?: string | null;
    content_guidelines_file_url?: string | null;
    content_guidelines_file_name?: string | null;
    sample_requirement_file_url?: string | null;
    sample_requirement_file_name?: string | null;
    files?: CampaignFileItem[];
}

interface CreatorInfo {
    id: number;
    name: string;
    phone: string | null;
    shipping_address: string | null;
    city_province: string | null;
    district: string | null;
}

interface PipelineInfo {
    status: string;
    status_label: string;
    sample_sent_at?: string;
    sample_received_at?: string;
    posted_at?: string;
}

interface Props {
    token: string;
    campaign: CampaignInfo;
    creator: CreatorInfo;
    pipeline: PipelineInfo;
}

export default function Index({ token, campaign, creator, pipeline }: Props) {
    // @ts-ignore
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };

    // Form cập nhật địa chỉ
    const addressForm = useForm({
        phone: creator.phone || '',
        shipping_address: creator.shipping_address || '',
        city_province: creator.city_province || '',
        district: creator.district || '',
    });

    // Form xác nhận nhận hàng
    const receiptForm = useForm({});

    // Form nộp link video
    const videoForm = useForm({
        platform: 'tiktok',
        post_url: '',
        video_title: '',
    });

    const [copiedHashtags, setCopiedHashtags] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showBrief, setShowBrief] = useState(true);

    const handleCopyHashtags = async () => {
        if (!campaign.hashtags) return;
        await navigator.clipboard.writeText(campaign.hashtags);
        setCopiedHashtags(true);
        setTimeout(() => setCopiedHashtags(false), 2500);
    };

    const handleCopyDiscountCode = async () => {
        if (!campaign.discount_code) return;
        await navigator.clipboard.writeText(campaign.discount_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
    };

    const handleAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addressForm.post(route('portal.address', token));
    };

    const handleReceiptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        receiptForm.post(route('portal.confirm-received', token));
    };

    const handleVideoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        videoForm.post(route('portal.submit-video', token), {
            onSuccess: () => {
                videoForm.reset('post_url', 'video_title');
            },
        });
    };

    // Xác định bước hiện tại
    const isAddressDone = ['address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed'].includes(pipeline.status);
    const isSampleSent = ['sample_sent', 'sample_received', 'posted', 'completed'].includes(pipeline.status) || Boolean(pipeline.sample_sent_at);
    const isSampleReceivedDone = ['sample_received', 'posted', 'completed'].includes(pipeline.status);
    const isPostedDone = ['posted', 'completed'].includes(pipeline.status);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 antialiased py-6 px-4 sm:px-6">
            <Head title={`Cổng Hợp Tác KOC - ${campaign.name}`} />

            {/* Flash Toast */}
            {flash?.success && (
                <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50">
                    <Toast type="success" message={flash.success} />
                </div>
            )}

            <div className="max-w-md mx-auto space-y-6">
                {/* Brand Header */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md shadow-primary-500/20">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                            Cổng Tiếp Nhận Dành Cho KOC / KOL
                        </span>
                        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                            {campaign.name}
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Sản phẩm trải nghiệm: <span className="font-semibold text-slate-800">{campaign.product_name}</span>
                        </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
                        Xin chào <span className="font-bold text-slate-900">{creator.name}</span>! Vui lòng hoàn tất các bước bên dưới để nhận mẫu sản phẩm.
                    </div>
                </div>

                {/* Thanh Chỉ Báo Tiến Trình 3 Bước */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className={`p-2 rounded-lg font-semibold ${isAddressDone ? 'bg-emerald-50 text-emerald-700' : 'bg-primary-50 text-primary-700'}`}>
                            1. Địa chỉ
                        </div>
                        <div className={`p-2 rounded-lg font-semibold ${isSampleReceivedDone ? 'bg-emerald-50 text-emerald-700' : isAddressDone ? 'bg-primary-50 text-primary-700' : 'bg-slate-50 text-slate-400'}`}>
                            2. Nhận hàng
                        </div>
                        <div className={`p-2 rounded-lg font-semibold ${isPostedDone ? 'bg-emerald-50 text-emerald-700' : isSampleReceivedDone ? 'bg-primary-50 text-primary-700' : 'bg-slate-50 text-slate-400'}`}>
                            3. Lên video
                        </div>
                    </div>
                </div>

                {/* Khối Brief Hợp Tác & Yêu Cầu Kịch Bản Dành Cho KOC */}
                {(campaign.key_messages || campaign.hashtags || campaign.dos_and_donts || campaign.discount_code || (campaign.files && campaign.files.length > 0) || campaign.content_guidelines_file_url || campaign.sample_requirement_file_url) && (
                    <div className="rounded-2xl border border-primary-200/80 bg-white p-5 shadow-sm space-y-3.5">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary-600" />
                                <h2 className="text-sm font-bold text-slate-900">
                                    Brief Hướng Dẫn & Yêu Cầu Kịch Bản
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBrief(!showBrief)}
                                className="text-xs text-primary-600 font-semibold hover:underline"
                            >
                                {showBrief ? 'Thu gọn' : 'Xem chi tiết'}
                            </button>
                        </div>

                        {showBrief && (
                            <div className="space-y-3 text-xs">
                                {/* Thông điệp chính */}
                                {campaign.key_messages && (
                                    <div className="rounded-xl bg-amber-50/60 border border-amber-200/60 p-3">
                                        <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                            <span>Thông điệp chính nhãn hàng cần nhấn mạnh:</span>
                                        </div>
                                        <p className="text-amber-900/90 leading-relaxed whitespace-pre-line">
                                            {campaign.key_messages}
                                        </p>
                                    </div>
                                )}

                                {/* Hashtags bắt buộc */}
                                {campaign.hashtags && (
                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-slate-800 flex items-center gap-1">
                                                <Hash className="h-3.5 w-3.5 text-primary-600" />
                                                Hashtags bắt buộc khi đăng bài:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCopyHashtags}
                                                className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 text-[11px]"
                                            >
                                                {copiedHashtags ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                                <span>{copiedHashtags ? 'Đã sao chép' : 'Sao chép'}</span>
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1 font-mono text-[11px] text-primary-700 font-medium">
                                            {campaign.hashtags}
                                        </div>
                                    </div>
                                )}

                                {/* Lưu ý Do's and Don'ts */}
                                {campaign.dos_and_donts && (
                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
                                            <span>Lưu ý khi quay (Do's & Don'ts):</span>
                                        </div>
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                            {campaign.dos_and_donts}
                                        </p>
                                    </div>
                                )}

                                {/* Mã giảm giá & Link giỏ hàng */}
                                {(campaign.discount_code || campaign.affiliate_link) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {campaign.discount_code && (
                                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                                                        Mã giảm giá cho bạn:
                                                    </span>
                                                    <code className="text-xs font-bold text-emerald-900">
                                                        {campaign.discount_code}
                                                    </code>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyDiscountCode}
                                                    className="p-1 text-emerald-700 hover:text-emerald-900"
                                                    title="Sao chép mã"
                                                >
                                                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                        )}

                                        {campaign.affiliate_link && (
                                            <a
                                                href={campaign.affiliate_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-lg bg-primary-50 border border-primary-200 p-2.5 flex items-center justify-between text-primary-700 hover:bg-primary-100/70"
                                            >
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-primary-700 block">
                                                        Link gắn giỏ hàng:
                                                    </span>
                                                    <span className="text-xs font-semibold truncate block max-w-[140px]">
                                                        Mở link sản phẩm
                                                    </span>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Danh sách tệp đính kèm người dùng đã tải lên */}
                                {((campaign.files && campaign.files.length > 0) || campaign.content_guidelines_file_url || campaign.sample_requirement_file_url) && (
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                            <Paperclip className="h-3.5 w-3.5 text-primary-600" />
                                            Tệp đính kèm & tài liệu do nhãn hàng tải lên:
                                        </span>
                                        <div className="space-y-2">
                                            {campaign.files && campaign.files.length > 0 ? (
                                                campaign.files.map((file, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        download
                                                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-primary-50/50 hover:border-primary-200 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="p-2 rounded-lg bg-white border border-slate-200 text-primary-600 shadow-2xs shrink-0">
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-xs font-bold text-slate-800 block truncate">
                                                                    {file.title}
                                                                </span>
                                                                <span className="text-[11px] text-slate-500 font-mono block truncate">
                                                                    {file.file_name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                                                            <Download className="h-3.5 w-3.5" />
                                                            <span>Tải về</span>
                                                        </span>
                                                    </a>
                                                ))
                                            ) : (
                                                <>
                                                    {campaign.content_guidelines_file_url && (
                                                        <a
                                                            href={campaign.content_guidelines_file_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            download
                                                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-primary-50/50 hover:border-primary-200 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="p-2 rounded-lg bg-white border border-slate-200 text-primary-600 shadow-2xs shrink-0">
                                                                    <FileText className="h-4 w-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-xs font-bold text-slate-800 block truncate">
                                                                        Tài liệu Hướng dẫn Kịch bản
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-500 font-mono block truncate">
                                                                        {campaign.content_guidelines_file_name || 'Tệp đính kèm kịch bản'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                                                                <Download className="h-3.5 w-3.5" />
                                                                <span>Tải về</span>
                                                            </span>
                                                        </a>
                                                    )}

                                                    {campaign.sample_requirement_file_url && (
                                                        <a
                                                            href={campaign.sample_requirement_file_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            download
                                                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-primary-50/50 hover:border-primary-200 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="p-2 rounded-lg bg-white border border-slate-200 text-amber-600 shadow-2xs shrink-0">
                                                                    <PackageCheck className="h-4 w-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-xs font-bold text-slate-800 block truncate">
                                                                        Quy định & Danh mục Sản phẩm Mẫu
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-500 font-mono block truncate">
                                                                        {campaign.sample_requirement_file_name || 'Tệp quy định mẫu'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                                                                <Download className="h-3.5 w-3.5" />
                                                                <span>Tải về</span>
                                                            </span>
                                                        </a>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Bước 1: Xác Nhận Địa Chỉ Nhận Hàng */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary-600" />
                            <h2 className="text-base font-bold text-slate-900">
                                1. Địa Chỉ Nhận Mẫu Trải Nghiệm
                            </h2>
                        </div>
                        {isAddressDone && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Đã chốt
                            </span>
                        )}
                    </div>

                    {/* Quy định về mẫu sản phẩm trải nghiệm kèm tệp đính kèm */}
                    {(campaign.sample_requirement || campaign.sample_requirement_file_url) && (
                        <div className="rounded-xl bg-amber-50/70 border border-amber-200/70 p-3.5 text-xs space-y-2">
                            <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                <PackageCheck className="h-4 w-4 text-amber-600" />
                                Quy định mẫu sản phẩm trải nghiệm:
                            </span>
                            {campaign.sample_requirement && (
                                <p className="text-amber-900/90 leading-relaxed whitespace-pre-wrap">
                                    {campaign.sample_requirement}
                                </p>
                            )}
                            {campaign.sample_requirement_file_url && (
                                <div className="pt-1">
                                    <a
                                        href={campaign.sample_requirement_file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        className="inline-flex items-center gap-1.5 font-semibold text-amber-900 bg-white border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100/60 shadow-2xs transition-colors"
                                    >
                                        <Download className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Tải file quy định / danh mục mẫu ({campaign.sample_requirement_file_name || 'Tài liệu đính kèm'})</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleAddressSubmit} className="space-y-3.5">
                        <FormField label="Số điện thoại nhận hàng" error={addressForm.errors.phone}>
                            <TextInput
                                type="tel"
                                value={addressForm.data.phone}
                                onChange={(e) => addressForm.setData('phone', e.target.value)}
                                placeholder="0912345678"
                            />
                        </FormField>

                        <FormField
                            label="Địa chỉ chi tiết (Số nhà, ngõ/ngách, tên đường)"
                            required
                            error={addressForm.errors.shipping_address}
                        >
                            <TextInput
                                value={addressForm.data.shipping_address}
                                onChange={(e) => addressForm.setData('shipping_address', e.target.value)}
                                placeholder="Ví dụ: 45A Đường Lê Lợi, Phường Bến Nghé"
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Tỉnh / Thành phố" error={addressForm.errors.city_province}>
                                <TextInput
                                    value={addressForm.data.city_province}
                                    onChange={(e) => addressForm.setData('city_province', e.target.value)}
                                    placeholder="TP. HCM"
                                />
                            </FormField>

                            <FormField label="Quận / Huyện" error={addressForm.errors.district}>
                                <TextInput
                                    value={addressForm.data.district}
                                    onChange={(e) => addressForm.setData('district', e.target.value)}
                                    placeholder="Quận 1"
                                />
                            </FormField>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            loading={addressForm.processing}
                            loadingText="Đang lưu địa chỉ..."
                            iconLeft={<Send className="h-4 w-4" />}
                            className="w-full"
                        >
                            {isAddressDone ? 'Cập Nhật Lại Địa Chỉ' : 'Xác Nhận Địa Chỉ Giao Hàng'}
                        </Button>
                    </form>
                </div>

                {/* Bước 2: Nút 1-Chạm Báo Đã Nhận Hàng */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-amber-600" />
                            <h2 className="text-base font-bold text-slate-900">
                                2. Tình Trạng Gói Hàng Mẫu
                            </h2>
                        </div>
                        {isSampleReceivedDone && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Đã nhận
                            </span>
                        )}
                    </div>

                    {isSampleReceivedDone ? (
                        <div className="rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-800 leading-relaxed border border-emerald-100">
                            ✓ Bạn đã xác nhận nhận hàng vào ngày <strong>{pipeline.sample_received_at || 'hôm nay'}</strong>. Thời hạn lên video là 7 ngày kể từ ngày nhận hàng.
                        </div>
                    ) : !isSampleSent ? (
                        <div className="space-y-3">
                            <div className="rounded-lg bg-amber-50 p-3.5 text-xs text-amber-800 leading-relaxed border border-amber-200 flex items-start gap-2.5">
                                <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                    <strong>Gói hàng mẫu đang được chuẩn bị:</strong> Bộ phận vận hành đang xử lý xuất kho gửi sản phẩm trải nghiệm cho bạn. Khi nhận được hàng thực tế từ shipper, bạn hãy quay lại xác nhận tại đây nhé!
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={true}
                                iconLeft={<PackageCheck className="h-4 w-4 text-slate-400" />}
                                className="w-full text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed"
                            >
                                Đang Chờ Gửi Hàng Trải Nghiệm...
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Khi nhận được kiện hàng từ shipper của GHN/GHTK, bạn vui lòng kiểm tra sản phẩm và bấm nút bên dưới để hệ thống kích hoạt mốc thời gian lên video.
                            </p>
                            <form onSubmit={handleReceiptSubmit}>
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    loading={receiptForm.processing}
                                    loadingText="Đang xác nhận..."
                                    iconLeft={<PackageCheck className="h-4 w-4 text-emerald-600" />}
                                    className="w-full text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                >
                                    Tôi Đã Nhận Được Gói Hàng Trải Nghiệm
                                </Button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Bước 3: Nộp Link Video */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-primary-600" />
                            <h2 className="text-base font-bold text-slate-900">
                                3. Nộp Link Video Đã Xuất Bản
                            </h2>
                        </div>
                        {isPostedDone && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Đã nộp
                            </span>
                        )}
                    </div>

                    {!isSampleReceivedDone ? (
                        <div className="rounded-lg bg-slate-50 p-3.5 text-xs text-slate-600 leading-relaxed border border-slate-200 flex items-start gap-2.5">
                            <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                Vui lòng nhận kiện hàng trải nghiệm và xác nhận ở <strong>Bước 2</strong> trước khi nộp đường link video đã xuất bản.
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleVideoSubmit} className="space-y-3.5">
                            <FormField label="Nền tảng xuất bản" required error={videoForm.errors.platform}>
                                <Select
                                    value={videoForm.data.platform}
                                    onChange={(e) => videoForm.setData('platform', e.target.value)}
                                    options={[
                                        { value: 'tiktok', label: 'TikTok Video' },
                                        { value: 'facebook', label: 'Facebook / Reels' },
                                        { value: 'instagram', label: 'Instagram Reels' },
                                        { value: 'youtube', label: 'YouTube Shorts / Video' },
                                        { value: 'shopee', label: 'Shopee Video' },
                                    ]}
                                />
                            </FormField>

                            <FormField
                                label="Đường link video trực tiếp (URL)"
                                required
                                hint="Dán đường link chia sẻ từ ứng dụng TikTok hoặc Facebook"
                                error={videoForm.errors.post_url}
                            >
                                <TextInput
                                    type="url"
                                    value={videoForm.data.post_url}
                                    onChange={(e) => videoForm.setData('post_url', e.target.value)}
                                    placeholder="https://www.tiktok.com/@user/video/..."
                                />
                            </FormField>

                            <FormField label="Tiêu đề / Caption ngắn gọn" error={videoForm.errors.video_title}>
                                <TextInput
                                    value={videoForm.data.video_title}
                                    onChange={(e) => videoForm.setData('video_title', e.target.value)}
                                    placeholder="Ví dụ: Đập hộp son kem lì siêu mịn..."
                                />
                            </FormField>

                            <Button
                                type="submit"
                                variant="primary"
                                loading={videoForm.processing}
                                loadingText="Đang nộp link..."
                                iconLeft={<Send className="h-4 w-4" />}
                                className="w-full"
                            >
                                {isPostedDone ? 'Nộp Thêm / Cập Nhật Link Video' : 'Gửi Link Video Nghiệm Thu'}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Footer Chân Trang */}
                <div className="text-center text-xs text-slate-400 pt-2 pb-6">
                    KOL Booking System • Cổng bảo mật thông tin KOC
                </div>
            </div>
        </div>
    );
}
