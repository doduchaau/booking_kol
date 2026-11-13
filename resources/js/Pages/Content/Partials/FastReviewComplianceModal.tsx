import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ShieldCheck,
    ExternalLink,
    RefreshCw,
    Send,
    Copy,
    Check,
    X,
    MessageCircle,
    Activity,
    AlertOctagon,
    Tag,
    Ticket,
    UserCheck,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import PlatformBadge from '@/Components/Common/PlatformBadge';

export interface ComplianceItem {
    key: string;
    label: string;
    status: 'passed' | 'warning' | 'failed';
    score: number;
    max_score: number;
    message: string;
    missing?: string[];
    expected?: any;
    found?: any;
}

export interface ReviewPost {
    id: number;
    platform: 'tiktok' | 'facebook' | 'youtube' | 'instagram' | 'shopee';
    post_url: string;
    video_title?: string;
    raw_caption?: string;
    status: 'pending_approval' | 'approved' | 'changes_requested';
    compliance_status?: 'passed' | 'warning' | 'failed' | 'not_checked';
    compliance_score?: number;
    compliance_checklist?: ComplianceItem[];
    compliance_checked_at?: string;
    health_status?: 'healthy' | 'warning' | 'unavailable' | 'unknown';
    health_error_message?: string;
    health_last_checked_at?: string;
    campaign_creator?: {
        id: number;
        creator?: {
            id: number;
            name: string;
            phone?: string;
        };
        campaign?: {
            id: number;
            name: string;
            hashtags?: string;
            discount_code?: string;
        };
    };
}

interface Props {
    post: ReviewPost | null;
    onClose: () => void;
    onStatusUpdated?: () => void;
}

export default function FastReviewComplianceModal({ post, onClose, onStatusUpdated }: Props) {
    if (!post) return null;

    const [isRechecking, setIsRechecking] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [copiedZalo, setCopiedZalo] = useState(false);

    const creatorName = post.campaign_creator?.creator?.name || 'KOC';
    const creatorPhone = post.campaign_creator?.creator?.phone?.replace(/\D/g, '') || '';
    const campaignName = post.campaign_creator?.campaign?.name || 'Chiến dịch';

    // Tạo nội dung tin nhắn Zalo soạn sẵn
    const missingItems: string[] = [];
    post.compliance_checklist?.forEach((item) => {
        if (item.status !== 'passed') {
            if (item.missing && item.missing.length > 0) {
                missingItems.push(`hashtag [${item.missing.join(', ')}]`);
            } else if (item.key === 'discount_code') {
                missingItems.push(`mã giảm giá [${post.campaign_creator?.campaign?.discount_code || ''}]`);
            } else {
                missingItems.push(item.label.toLowerCase());
            }
        }
    });

    const defaultZaloMessage = `Chào ${creatorName} ơi, bên mình đã nhận được video bài đăng của bạn trong ${campaignName}. Video lên rất đẹp tuy nhiên hệ thống kiểm tra thấy đang có lưu ý: [thiếu ${missingItems.length > 0 ? missingItems.join(', ') : 'thông tin theo brief'}]. Bạn vui lòng cập nhật lại caption trên mạng xã hội giúp bên mình để hoàn tất nghiệm thu và đối soát gửi phí hợp tác sớm nhất nhé! Cảm ơn bạn rất nhiều ạ ❤️`;

    const [customZaloMessage, setCustomZaloMessage] = useState(defaultZaloMessage);

    const handleRecheck = () => {
        setIsRechecking(true);
        router.post(
            route('content.compliance', post.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsRechecking(false),
            }
        );
    };

    const handleApprove = () => {
        setIsApproving(true);
        router.patch(
            route('content.status', post.id),
            { status: 'approved' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    onStatusUpdated?.();
                },
                onFinish: () => setIsApproving(false),
            }
        );
    };

    const handleRequestChanges = () => {
        router.patch(
            route('content.status', post.id),
            { status: 'changes_requested' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    onStatusUpdated?.();
                },
            }
        );
    };

    const handleOpenZalo = () => {
        // Sao chép nội dung vào Clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(customZaloMessage);
            setCopiedZalo(true);
            setTimeout(() => setCopiedZalo(false), 3000);
        }

        // Mở deep link Zalo
        if (creatorPhone) {
            const zaloUrl = `https://zalo.me/${creatorPhone}`;
            window.open(zaloUrl, '_blank');
        } else {
            alert('Creator này chưa có số điện thoại để mở Zalo.');
        }
    };

    const score = post.compliance_score ?? 0;
    const isPassed = post.compliance_status === 'passed';
    const isWarning = post.compliance_status === 'warning';
    const isFailed = post.compliance_status === 'failed';
    const isHealthy = post.health_status !== 'unavailable';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">
                                    Nghiệm Thu & Kiểm Tra Tuân Thủ Video #{post.id}
                                </h3>
                                <PlatformBadge platform={post.platform} size="xs" />
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                KOC: <strong className="text-slate-800">{creatorName}</strong> • Chiến dịch: <strong className="text-slate-800">{campaignName}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 2. Content Body (Scrollable) */}
                <div className="p-6 overflow-y-auto space-y-5 text-sm">
                    {/* Hộp Thông Tin Video & Link */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Tiêu đề / Caption bài đăng
                                </span>
                                <p className="text-xs font-medium text-slate-900 line-clamp-2">
                                    {post.raw_caption || post.video_title || '(Không có caption)'}
                                </p>
                            </div>
                            <a
                                href={post.post_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 shadow-xs"
                            >
                                <span>Mở xem video</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>

                    {/* Cảnh báo Sức Khỏe Video (Nếu bị xóa/ẩn) */}
                    {!isHealthy && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-xs uppercase tracking-wider text-rose-900">
                                    Cảnh báo: Video không thể truy cập
                                </h4>
                                <p className="text-xs text-rose-700 mt-1">
                                    {post.health_error_message || 'Video này bị phát hiện đã bị xóa, ẩn hoặc chuyển sang chế độ riêng tư.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Khung Tổng Quan Tuân Thủ (Score Card) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                            isPassed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : isWarning ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        }`}>
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                                isPassed ? 'bg-emerald-100 text-emerald-700'
                                : isWarning ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                                {isPassed ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold opacity-75 uppercase">Điểm Tuân Thủ</span>
                                <div className="text-2xl font-black">
                                    {score}<span className="text-xs font-normal">/100</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                                <Activity className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Sức Khỏe Video</span>
                                <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                                    <span className={`h-2.5 w-2.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
                                    <span>{isHealthy ? 'Hoạt động bình thường' : 'Bị xóa / Ẩn'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Kiểm Tra Lại</span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {post.compliance_checked_at
                                        ? new Date(post.compliance_checked_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                        : 'Chưa quét'}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                loading={isRechecking}
                                onClick={handleRecheck}
                                iconLeft={<RefreshCw className="h-3.5 w-3.5 text-indigo-600" />}
                            >
                                Quét lại
                            </Button>
                        </div>
                    </div>

                    {/* Danh Sách Tiêu Chí Tuân Thủ (Checklist) */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            Chi Tiết 4 Tiêu Chí Kịch Bản & Brief
                        </span>
                        <div className="space-y-2">
                            {post.compliance_checklist && post.compliance_checklist.length > 0 ? (
                                post.compliance_checklist.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                                            item.status === 'passed'
                                                ? 'bg-slate-50/60 border-slate-200'
                                                : item.status === 'warning'
                                                ? 'bg-amber-50/50 border-amber-200'
                                                : 'bg-rose-50/50 border-rose-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {item.status === 'passed' ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                            ) : item.status === 'warning' ? (
                                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                                                    <span className="text-[11px] text-slate-400">
                                                        ({item.score}/{item.max_score}đ)
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 mt-0.5">{item.message}</p>
                                                {item.missing && item.missing.length > 0 && (
                                                    <p className="text-xs text-amber-700 font-semibold mt-1">
                                                        Hashtag còn thiếu: {item.missing.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                item.status === 'passed' ? 'success' : item.status === 'warning' ? 'warning' : 'danger'
                                            }
                                            size="sm"
                                        >
                                            {item.status === 'passed' ? 'Đạt' : item.status === 'warning' ? 'Cảnh báo' : 'Lỗi'}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                                    Chưa có dữ liệu kiểm tra. Bấm "Quét lại" ở trên để hệ thống tự động bóc tách caption và chấm điểm.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hộp Thoại Soạn Tin Nhắn Zalo Yêu Cầu Sửa (Nếu có lỗi/cảnh báo) */}
                    {missingItems.length > 0 && (
                        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-indigo-600" />
                                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                                        Nội Dung Soạn Sẵn Yêu Cầu KOC Chỉnh Sửa Qua Zalo
                                    </span>
                                </div>
                                <span className="text-xs text-indigo-600 font-medium">
                                    SĐT KOC: {creatorPhone || 'Chưa cập nhật'}
                                </span>
                            </div>

                            <textarea
                                rows={3}
                                value={customZaloMessage}
                                onChange={(e) => setCustomZaloMessage(e.target.value)}
                                className="w-full text-xs text-slate-800 bg-white border border-indigo-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />

                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-indigo-700">
                                    Bấm nút bên dưới sẽ tự động sao chép tin nhắn và mở cửa sổ chat Zalo với KOC.
                                </span>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleOpenZalo}
                                    iconLeft={copiedZalo ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Send className="h-3.5 w-3.5" />}
                                >
                                    {copiedZalo ? 'Đã sao chép! Đang mở Zalo...' : 'Mở Zalo nhắn KOC'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Action Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/80">
                    <Button variant="secondary" onClick={onClose}>
                        Đóng
                    </Button>

                    <div className="flex items-center gap-2">
                        {post.status !== 'changes_requested' && (
                            <Button
                                variant="danger"
                                onClick={handleRequestChanges}
                                iconLeft={<X className="h-4 w-4" />}
                            >
                                Yêu cầu sửa
                            </Button>
                        )}

                        {post.status !== 'approved' && (
                            <Button
                                variant="primary"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
                                loading={isApproving}
                                onClick={handleApprove}
                                iconLeft={<Check className="h-4 w-4" />}
                            >
                                Phê duyệt nghiệm thu
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
