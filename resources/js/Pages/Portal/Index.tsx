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
    BadgePercent,
    ShieldCheck,
    AlertTriangle,
    RefreshCw,
    Radio,
    Layers,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Select from '@/Components/Form/Select';
import Textarea from '@/Components/Form/Textarea';
import Toast from '@/Components/Common/Toast';
import ConfirmDialog from '@/Components/Common/ConfirmDialog';
import PlatformIcon from '@/Components/Common/PlatformIcon';

export interface CampaignFileItem {
    type: string;
    title: string;
    file_name: string;
    url: string;
}

export interface CampaignProductItem {
    id: number;
    product_name: string;
    product_sku?: string | null;
    product_url?: string | null;
    retail_price?: number;
    brief_content?: string | null;
    brief_file_url?: string | null;
    brief_file_name?: string | null;
    hashtags?: string | null;
    sample_requirement?: string | null;
}

export interface CreatorProductItem {
    id: number;
    campaign_product_id: number;
    product_name: string;
    product_sku?: string | null;
    product_url?: string | null;
    retail_price?: number;
    brief_content?: string | null;
    brief_file_url?: string | null;
    brief_file_name?: string | null;
    hashtags?: string | null;
    sample_requirement?: string | null;
    sample_variant?: string | null;
    quantity_assigned: number;
    quantity_sent: number;
    sample_status: string;
    sample_status_label: string;
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
    brand_tag?: string | null;
    dos_and_donts?: string | null;
    discount_code?: string | null;
    affiliate_link?: string | null;
    commission_rate?: string | number | null;
    ads_commission_rate?: string | number | null;
    content_guidelines_file_url?: string | null;
    content_guidelines_file_name?: string | null;
    sample_requirement_file_url?: string | null;
    sample_requirement_file_name?: string | null;
    products?: CampaignProductItem[];
    files?: CampaignFileItem[];
}

interface CreatorInfo {
    id: number;
    name: string;
    phone: string | null;
    shipping_address: string | null;
    city_province: string | null;
    district: string | null;
    ward: string | null;
}

interface PipelineInfo {
    status: string;
    status_label: string;
    collaboration_type?: string;
    collaboration_type_label?: string;
    total_samples_assigned?: number;
    total_samples_sent?: number;
    sample_sent_at?: string;
    sample_received_at?: string;
    posted_at?: string;
    creator_products?: CreatorProductItem[];
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
        ward: creator.ward || '',
    });

    // Form xác nhận nhận hàng
    const receiptForm = useForm({});

    // Form nộp link video
    const videoForm = useForm({
        platform: 'tiktok',
        post_url: '',
        video_title: '',
    });

    // State Pre-check kiểm tra tự động tuân thủ video cho KOC
    const [precheckResult, setPrecheckResult] = useState<any>(null);
    const [isPrechecking, setIsPrechecking] = useState(false);

    const runPrecheck = async (url: string, platform: string) => {
        if (!url || !url.startsWith('http')) {
            setPrecheckResult(null);
            return;
        }
        setIsPrechecking(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const resp = await fetch(route('portal.precheck-video', token), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    post_url: url,
                    platform: platform,
                }),
            });
            if (resp.ok) {
                const data = await resp.json();
                setPrecheckResult(data);
                if (data.metadata?.caption && !videoForm.data.video_title) {
                    videoForm.setData('video_title', data.metadata.caption.slice(0, 200));
                }
            }
        } catch (e) {
            console.error('Lỗi pre-check:', e);
        } finally {
            setIsPrechecking(false);
        }
    };

    const [copiedHashtags, setCopiedHashtags] = useState(false);
    const [copiedBrandTag, setCopiedBrandTag] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showBrief, setShowBrief] = useState(true);
    const [copiedProductHashtagId, setCopiedProductHashtagId] = useState<number | null>(null);
    const [expandedProductBriefId, setExpandedProductBriefId] = useState<number | null>(null);
    const [showWarningConfirmModal, setShowWarningConfirmModal] = useState(false);

    const handleCopyHashtags = async () => {
        if (!campaign.hashtags) return;
        await navigator.clipboard.writeText(campaign.hashtags);
        setCopiedHashtags(true);
        setTimeout(() => setCopiedHashtags(false), 2500);
    };

    const handleCopyBrandTag = async () => {
        if (!campaign.brand_tag) return;
        await navigator.clipboard.writeText(campaign.brand_tag);
        setCopiedBrandTag(true);
        setTimeout(() => setCopiedBrandTag(false), 2500);
    };

    const handleCopyProductHashtags = async (prodId: number, hashtags: string) => {
        if (!hashtags) return;
        await navigator.clipboard.writeText(hashtags);
        setCopiedProductHashtagId(prodId);
        setTimeout(() => setCopiedProductHashtagId(null), 2500);
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
        if (precheckResult && (precheckResult.status === 'warning' || precheckResult.status === 'failed')) {
            setShowWarningConfirmModal(true);
            return;
        }
        executeSubmitVideo();
    };

    const executeSubmitVideo = () => {
        videoForm.post(route('portal.submit-video', token), {
            onSuccess: () => {
                videoForm.reset('post_url', 'video_title');
                setShowWarningConfirmModal(false);
            },
        });
    };

    // Xác định bước hiện tại
    const isAddressDone = ['address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed'].includes(pipeline.status);
    const isSampleSent = ['sample_sent', 'sample_received', 'posted', 'completed'].includes(pipeline.status) || Boolean(pipeline.sample_sent_at);
    const isSampleReceivedDone = ['sample_received', 'posted', 'completed'].includes(pipeline.status);
    const isPostedDone = ['posted', 'completed'].includes(pipeline.status);

    // Danh sách sản phẩm hiển thị (Ưu tiên creator_products được gán riêng, fallback sang campaign.products)
    const assignedProducts = pipeline.creator_products && pipeline.creator_products.length > 0
        ? pipeline.creator_products
        : [];
    const campaignProducts = campaign.products && campaign.products.length > 0
        ? campaign.products
        : [];

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
                        <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                                Cổng Tiếp Nhận Dành Cho KOC / KOL
                            </span>
                            {pipeline.collaboration_type === 'livestream' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                                    <Radio className="h-3 w-3 text-amber-600" /> Livestream
                                </span>
                            )}
                            {pipeline.collaboration_type === 'both' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                                    <Sparkles className="h-3 w-3 text-purple-600" /> Video + Live
                                </span>
                            )}
                            {(!pipeline.collaboration_type || pipeline.collaboration_type === 'video') && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-800 border border-primary-200 shadow-2xs">
                                    <Video className="h-3 w-3 text-primary-600" /> Lên Video
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
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

                {/* Khối Quyền Lợi & Chính Sách Hoa Hồng Dành Cho KOC - Luôn hiển thị độc lập & nổi bật */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs shrink-0">
                            <BadgePercent className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Chính Sách Hoa Hồng Dành Cho Bạn
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Quyền lợi doanh thu áp dụng cho tài khoản của bạn trong chiến dịch
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* 1. Hoa hồng Affiliate */}
                        <div className="rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 border border-indigo-200/70 p-3.5 space-y-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                Hoa Hồng Affiliate
                            </span>
                            <div className="text-2xl font-black text-primary-600 tracking-tight">
                                {Number(campaign.commission_rate || 0)}%
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                                Đơn tự nhiên qua link bio / giỏ hàng video của bạn.
                            </p>
                        </div>

                        {/* 2. Hoa hồng ADS */}
                        <div className="rounded-xl bg-gradient-to-br from-purple-50/70 via-white to-pink-50/40 border border-purple-200/70 p-3.5 space-y-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-purple-950 uppercase tracking-wider block">
                                Hoa Hồng Chạy ADS
                            </span>
                            <div className="text-2xl font-black text-purple-600 tracking-tight">
                                {Number(campaign.ads_commission_rate || 0)}%
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                                Đơn phát sinh khi nhãn hàng sử dụng video chạy quảng cáo.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Khối Danh Sách Sản Phẩm & Mẫu Trải Nghiệm Của Bạn */}
                {(assignedProducts.length > 0 || campaignProducts.length > 0) && (
                    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm space-y-3.5">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shrink-0">
                                    <Layers className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">
                                        {assignedProducts.length > 0 ? 'Sản Phẩm Mẫu Phân Bổ Cho Bạn' : 'Danh Sách Sản Phẩm Chiến Dịch'}
                                    </h2>
                                    <p className="text-[11px] text-slate-500">
                                        {assignedProducts.length > 0
                                            ? `Tổng cộng ${pipeline.total_samples_sent || pipeline.total_samples_assigned || assignedProducts.length} sản phẩm mẫu được gửi tới bạn`
                                            : `${campaignProducts.length} sản phẩm áp dụng trong chiến dịch này`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {assignedProducts.length > 0 ? (
                                assignedProducts.map((p) => {
                                    const isExpanded = expandedProductBriefId === p.id;
                                    const qty = isSampleSent ? (p.quantity_sent || p.quantity_assigned || 1) : (p.quantity_assigned || 1);
                                    const hasCustomBrief = Boolean(p.brief_content || p.brief_file_url || p.hashtags);

                                    return (
                                        <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-xs font-bold text-slate-900 block">
                                                            {p.product_name}
                                                        </span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary-100 text-primary-800">
                                                            SL: {qty} món
                                                        </span>
                                                    </div>
                                                    {p.sample_variant && (
                                                        <span className="text-[11px] text-slate-500 block mt-0.5">
                                                            Phân loại: <strong className="text-slate-700">{p.sample_variant}</strong>
                                                        </span>
                                                    )}
                                                    {p.retail_price ? (
                                                        <span className="text-[11px] text-slate-500 block">
                                                            Giá bán: {p.retail_price.toLocaleString('vi-VN')} đ
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {p.product_url && (
                                                    <a
                                                        href={p.product_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 bg-white border border-slate-200 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors shrink-0 shadow-2xs"
                                                    >
                                                        <span>Link SP</span>
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Nút Xem Brief Riêng của từng sản phẩm nếu có */}
                                            {hasCustomBrief && (
                                                <div className="pt-2 border-t border-slate-200/80">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedProductBriefId(isExpanded ? null : p.id)}
                                                        className="flex items-center justify-between w-full text-xs font-semibold text-primary-700 hover:text-primary-800"
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="h-3.5 w-3.5 text-primary-600" />
                                                            {isExpanded ? 'Đóng Brief riêng của sản phẩm này' : 'Xem Brief riêng cho sản phẩm này'}
                                                        </span>
                                                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-2.5 p-3 rounded-lg bg-white border border-primary-100 space-y-2.5 text-xs animate-in fade-in duration-150">
                                                            {p.brief_content && (
                                                                <div>
                                                                    <div className="font-bold text-slate-800 mb-1">
                                                                        Yêu cầu kịch bản & điểm nổi bật:
                                                                    </div>
                                                                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-[11px]">
                                                                        {p.brief_content}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {p.hashtags && (
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                                                                            <Hash className="h-3 w-3 text-primary-600" />
                                                                            Hashtags riêng của sản phẩm:
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCopyProductHashtags(p.id, p.hashtags!)}
                                                                            className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 text-[10px]"
                                                                        >
                                                                            {copiedProductHashtagId === p.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                                                            <span>{copiedProductHashtagId === p.id ? 'Đã sao chép' : 'Sao chép'}</span>
                                                                        </button>
                                                                    </div>
                                                                    <div className="font-mono text-[11px] text-primary-700 bg-slate-50 p-1.5 rounded border border-slate-200">
                                                                        {p.hashtags}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {p.brief_file_url && (
                                                                <div className="pt-1">
                                                                    <a
                                                                        href={p.brief_file_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        download
                                                                        className="inline-flex items-center gap-1.5 font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-1.5 rounded-lg hover:bg-primary-100 shadow-2xs text-[11px] transition-colors"
                                                                    >
                                                                        <Download className="h-3.5 w-3.5 text-primary-600" />
                                                                        <span>Tải file Brief: {p.brief_file_name || 'Tệp đính kèm'}</span>
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                campaignProducts.map((p) => {
                                    const isExpanded = expandedProductBriefId === p.id;
                                    const hasCustomBrief = Boolean(p.brief_content || p.brief_file_url || p.hashtags);

                                    return (
                                        <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-xs font-bold text-slate-900 block">
                                                        {p.product_name}
                                                    </span>
                                                    {p.retail_price ? (
                                                        <span className="text-[11px] text-slate-500 block">
                                                            Giá bán: {p.retail_price.toLocaleString('vi-VN')} đ
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {p.product_url && (
                                                    <a
                                                        href={p.product_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 bg-white border border-slate-200 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors shrink-0 shadow-2xs"
                                                    >
                                                        <span>Link SP</span>
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>

                                            {hasCustomBrief && (
                                                <div className="pt-2 border-t border-slate-200/80">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedProductBriefId(isExpanded ? null : p.id)}
                                                        className="flex items-center justify-between w-full text-xs font-semibold text-primary-700 hover:text-primary-800"
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="h-3.5 w-3.5 text-primary-600" />
                                                            {isExpanded ? 'Đóng Brief sản phẩm' : 'Xem Brief riêng sản phẩm'}
                                                        </span>
                                                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-2.5 p-3 rounded-lg bg-white border border-primary-100 space-y-2 text-xs">
                                                            {p.brief_content && (
                                                                <p className="text-slate-700 leading-relaxed whitespace-pre-line text-[11px]">
                                                                    {p.brief_content}
                                                                </p>
                                                            )}
                                                            {p.hashtags && (
                                                                <div className="font-mono text-[11px] text-primary-700 bg-slate-50 p-1.5 rounded border border-slate-200">
                                                                    {p.hashtags}
                                                                </div>
                                                            )}
                                                            {p.brief_file_url && (
                                                                <a
                                                                    href={p.brief_file_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    download
                                                                    className="inline-flex items-center gap-1.5 font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-1.5 rounded-lg hover:bg-primary-100 text-[11px]"
                                                                >
                                                                    <Download className="h-3.5 w-3.5 text-primary-600" />
                                                                    <span>Tải Brief ({p.brief_file_name || 'Tệp'})</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

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
                {(campaign.key_messages || campaign.hashtags || campaign.dos_and_donts || campaign.content_guidelines || campaign.discount_code || campaign.affiliate_link || (campaign.files && campaign.files.length > 0) || campaign.content_guidelines_file_url || campaign.sample_requirement_file_url) && (
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
                                {/* Hướng dẫn nội dung & Kịch bản */}
                                {campaign.content_guidelines && (
                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5 text-primary-600" />
                                            <span>Hướng dẫn nội dung & kịch bản:</span>
                                        </div>
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                            {campaign.content_guidelines}
                                        </p>
                                    </div>
                                )}

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

                                {/* Tag tài khoản thương hiệu bắt buộc */}
                                {campaign.brand_tag && (
                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-slate-800 flex items-center gap-1">
                                                <Radio className="h-3.5 w-3.5 text-indigo-600" />
                                                Tài khoản Brand cần tag (@mention):
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCopyBrandTag}
                                                className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 text-[11px]"
                                            >
                                                {copiedBrandTag ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                                <span>{copiedBrandTag ? 'Đã sao chép' : 'Sao chép'}</span>
                                            </button>
                                        </div>
                                        <div className="font-mono text-xs text-indigo-700 font-semibold bg-white px-2.5 py-1 rounded-md border border-slate-200 inline-block shadow-2xs">
                                            {campaign.brand_tag.startsWith('@') ? campaign.brand_tag : `@${campaign.brand_tag}`}
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
                        <FormField label="Số điện thoại nhận hàng" required error={addressForm.errors.phone}>
                            <TextInput
                                type="tel"
                                value={addressForm.data.phone}
                                onChange={(e) => addressForm.setData('phone', e.target.value)}
                                placeholder="0912345678"
                                required
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
                                placeholder="Ví dụ: 45A Đường Lê Lợi"
                                required
                            />
                        </FormField>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormField label="Tỉnh / Thành phố" required error={addressForm.errors.city_province}>
                                <TextInput
                                    value={addressForm.data.city_province}
                                    onChange={(e) => addressForm.setData('city_province', e.target.value)}
                                    placeholder="TP. HCM"
                                    required
                                />
                            </FormField>

                            <FormField label="Quận / Huyện" error={addressForm.errors.district}>
                                <TextInput
                                    value={addressForm.data.district}
                                    onChange={(e) => addressForm.setData('district', e.target.value)}
                                    placeholder="Quận 1"
                                />
                            </FormField>

                            <FormField label="Phường / Xã" required error={addressForm.errors.ward}>
                                <TextInput
                                    value={addressForm.data.ward}
                                    onChange={(e) => addressForm.setData('ward', e.target.value)}
                                    placeholder="Phường Bến Nghé"
                                    required
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

                    {/* Bảng kê danh mục món hàng mẫu trong kiện hàng */}
                    {assignedProducts.length > 0 && (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                                <PackageCheck className="h-4 w-4 text-primary-600" />
                                {isSampleSent ? 'Kiện hàng gửi tới bạn gồm có:' : 'Danh mục mẫu dự kiến chuẩn bị gửi:'}
                            </span>
                            <div className="space-y-1.5 pt-1">
                                {assignedProducts.map((p) => {
                                    const qty = isSampleSent ? (p.quantity_sent || p.quantity_assigned || 1) : (p.quantity_assigned || 1);
                                    return (
                                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                                            <div className="min-w-0 pr-2">
                                                <span className="font-semibold text-slate-800 truncate block">
                                                    {p.product_name}
                                                </span>
                                                {p.sample_variant && (
                                                    <span className="text-[11px] text-slate-500 block">
                                                        Phân loại: {p.sample_variant}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-[11px] shrink-0 border border-primary-200/60">
                                                SL: {qty} món
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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
                                Khi nhận được kiện hàng từ shipper giao tới, bạn vui lòng kiểm tra sản phẩm và bấm nút bên dưới để hệ thống kích hoạt mốc thời gian lên video.
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
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center">
                                        <PlatformIcon platform={videoForm.data.platform} className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
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
                                    </div>
                                </div>
                            </FormField>

                            <FormField
                                label="Đường link video trực tiếp (URL)"
                                required
                                hint="Dán đường link chia sẻ từ ứng dụng TikTok, Shopee Video hoặc Facebook Reels (Hệ thống sẽ tự động kiểm tra hashtag & brief)"
                                error={videoForm.errors.post_url}
                            >
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <TextInput
                                                type="url"
                                                value={videoForm.data.post_url}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    let detected = videoForm.data.platform;
                                                    if (val.includes('tiktok.com')) detected = 'tiktok';
                                                    else if (val.includes('shopee.vn') || val.includes('vn.shp.ee')) detected = 'shopee';
                                                    else if (val.includes('facebook.com') || val.includes('fb.watch')) detected = 'facebook';
                                                    else if (val.includes('youtube.com') || val.includes('youtu.be')) detected = 'youtube';
                                                    else if (val.includes('instagram.com')) detected = 'instagram';

                                                    videoForm.setData({
                                                        ...videoForm.data,
                                                        post_url: val,
                                                        platform: detected,
                                                    });
                                                }}
                                                onBlur={() => {
                                                    runPrecheck(videoForm.data.post_url, videoForm.data.platform);
                                                }}
                                                placeholder="https://www.tiktok.com/... hoặc https://shopee.vn/universal-link/video/... hoặc https://www.facebook.com/reel/..."
                                            />
                                            {isPrechecking && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-indigo-600 bg-white px-2 py-1 rounded-md border border-indigo-100 shadow-xs">
                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                    <span>Đang quét...</span>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            loading={isPrechecking}
                                            onClick={() => runPrecheck(videoForm.data.post_url, videoForm.data.platform)}
                                            iconLeft={<RefreshCw className="h-3.5 w-3.5 text-indigo-600" />}
                                            className="shrink-0"
                                        >
                                            Kiểm tra
                                        </Button>
                                    </div>

                                    {/* Hộp Bảng Kiểm Tra Tuân Thủ Tự Động Chi Tiết (Pre-Check Checklist) */}
                                    {precheckResult && (
                                        <div
                                            className={`p-3.5 rounded-2xl border text-xs space-y-3 transition-all animate-in fade-in duration-200 ${
                                                precheckResult.status === 'passed'
                                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                                    : precheckResult.status === 'warning'
                                                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                                            }`}
                                        >
                                            {/* Header trạng thái & Điểm số */}
                                            <div className="flex items-center justify-between pb-2 border-b border-black/5">
                                                <div className="flex items-center gap-2 font-bold">
                                                    {precheckResult.status === 'passed' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                    ) : precheckResult.status === 'warning' ? (
                                                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                                    )}
                                                    <span>
                                                        {precheckResult.status === 'passed'
                                                            ? '✓ Đạt chuẩn 100% theo Brief'
                                                            : precheckResult.status === 'warning'
                                                            ? `⚠️ Cần lưu ý (${precheckResult.issues?.length || 0} điểm chưa khớp)`
                                                            : '❌ Video không hợp lệ hoặc riêng tư'}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                                        precheckResult.status === 'passed'
                                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                            : precheckResult.status === 'warning'
                                                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                            : 'bg-rose-100 text-rose-800 border-rose-300'
                                                    }`}
                                                >
                                                    {precheckResult.score ?? 0}/100đ
                                                </span>
                                            </div>

                                            {/* Danh sách tiêu chí tuân thủ (Checklist breakdown) */}
                                            {precheckResult.checklist && precheckResult.checklist.length > 0 && (
                                                <div className="space-y-2 pt-1">
                                                    {precheckResult.checklist.map((item: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className="p-2.5 rounded-xl bg-white/90 border border-black/5 shadow-2xs space-y-1"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                                                    {item.status === 'passed' ? (
                                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                                    ) : item.status === 'warning' ? (
                                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                                    ) : (
                                                                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                                                    )}
                                                                    <span>{item.label}</span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-500 font-mono">
                                                                    {item.score}/{item.max_score}đ
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 pl-5">
                                                                {item.message}
                                                            </p>

                                                            {/* Chi tiết hashtag còn thiếu hoặc đã khớp */}
                                                            {item.key === 'hashtags' && (
                                                                <div className="pl-5 pt-1 flex flex-wrap gap-1">
                                                                    {item.found && item.found.map((tag: string, tIdx: number) => (
                                                                        <span key={tIdx} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono font-medium border border-emerald-200">
                                                                            ✓ {tag}
                                                                        </span>
                                                                    ))}
                                                                    {item.missing && item.missing.map((tag: string, mIdx: number) => (
                                                                        <span key={mIdx} className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-mono font-bold border border-rose-300">
                                                                            Thiếu: {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Chi tiết tag thương hiệu */}
                                                            {item.key === 'brand_tag' && item.expected && (
                                                                <div className="pl-5 pt-1">
                                                                    {item.status === 'passed' ? (
                                                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
                                                                            ✓ Đã tag {item.found || item.expected}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-mono font-bold border border-rose-300">
                                                                            Chưa tag {item.expected}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {precheckResult.status === 'warning' && (
                                                <div className="p-2.5 rounded-xl bg-amber-100/60 border border-amber-300 text-amber-900 text-[11px] leading-relaxed">
                                                    💡 <strong>Mẹo dành cho bạn:</strong> Bạn có thể vào TikTok/MXH chỉnh sửa lại caption cho đúng brief rồi bấm nút <strong>"Kiểm tra lại"</strong> để video được duyệt nghiệm thu và đối soát thù lao nhanh nhất nhé!
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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

                {/* Hộp thoại cảnh báo khi nộp video chưa đạt chuẩn 100% */}
                <ConfirmDialog
                    isOpen={showWarningConfirmModal}
                    onClose={() => setShowWarningConfirmModal(false)}
                    onConfirm={executeSubmitVideo}
                    title="Video Chưa Khớp Hoàn Toàn Yêu Cầu Brief"
                    message="Hệ thống phát hiện video của bạn đang thiếu một số yêu cầu bắt buộc theo brief (như hashtag hoặc tag tài khoản thương hiệu). Việc nộp video không đúng brief có thể làm chậm quá trình nghiệm thu và chuyển thù lao."
                    confirmText="Tôi hiểu và vẫn muốn nộp"
                    cancelText="Để tôi sửa caption trên TikTok"
                    variant="warning"
                    loading={videoForm.processing}
                >
                    {precheckResult?.issues && precheckResult.issues.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            <strong className="block mb-1">Các điểm cần lưu ý:</strong>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                {precheckResult.issues.map((issue: string, idx: number) => (
                                    <li key={idx}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </ConfirmDialog>

                {/* Footer Chân Trang */}
                <div className="text-center text-xs text-slate-400 pt-2 pb-6">
                    KOL Booking System • Cổng bảo mật thông tin KOC
                </div>
            </div>
        </div>
    );
}
