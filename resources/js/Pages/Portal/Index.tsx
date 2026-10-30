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
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Select from '@/Components/Form/Select';
import Textarea from '@/Components/Form/Textarea';
import Toast from '@/Components/Common/Toast';

interface CampaignInfo {
    id: number;
    name: string;
    product_name: string;
    product_sku: string | null;
    sample_requirement: string | null;
    content_guidelines: string | null;
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
                                    disabled={!isAddressDone}
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
                </div>

                {/* Hướng Dẫn Kịch Bản Tham Khảo */}
                {campaign.content_guidelines && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Quy Định Kịch Bản Cần Lưu Ý
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {campaign.content_guidelines}
                        </p>
                    </div>
                )}

                {/* Footer Chân Trang */}
                <div className="text-center text-xs text-slate-400 pt-2 pb-6">
                    KOL Booking System • Cổng bảo mật thông tin KOC
                </div>
            </div>
        </div>
    );
}
