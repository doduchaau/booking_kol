import React, { useState, useEffect } from 'react';
import {
    X,
    MessageCircle,
    Copy,
    Check,
    ExternalLink,
    Send,
    Clock,
    AlertTriangle,
    Sparkles,
    Calendar,
    Phone,
    ShieldAlert,
    CheckCircle2,
    RefreshCw,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';

export interface QuickZaloTemplate {
    type: string;
    title: string;
    badge: string;
    is_recommended: boolean;
    content: string;
}

export interface QuickZaloData {
    creator: {
        id: number;
        name: string;
        phone: string;
        zalo_link: string;
    };
    campaign: {
        id: number;
        name: string;
        product_name: string;
    };
    pipeline: {
        id: number;
        status: string;
        status_label: string;
        deadline_info?: {
            status: 'safe' | 'warning' | 'overdue';
            days: number;
            text: string;
            date: string;
        } | null;
        portal_link: string;
    };
    templates: QuickZaloTemplate[];
}

interface Props {
    isOpen: boolean;
    campaignCreatorId: number | null;
    onClose: () => void;
    onSuccess?: (message: string) => void;
}

export default function QuickZaloReminderModal({
    isOpen,
    campaignCreatorId,
    onClose,
    onSuccess,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [data, setData] = useState<QuickZaloData | null>(null);
    const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
    const [messageContent, setMessageContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch dữ liệu preview khi modal mở
    useEffect(() => {
        if (!isOpen || !campaignCreatorId) {
            setData(null);
            setMessageContent('');
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        // @ts-ignore
        const url = typeof route === 'function'
            ? route('outreach.quick-followup.preview', campaignCreatorId)
            : `/outreach/quick-followup/${campaignCreatorId}`;

        fetch(url, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('Không thể tải dữ liệu mẫu tin nhắn.');
                }
                return res.json();
            })
            .then((result: QuickZaloData) => {
                setData(result);
                // Chọn template được khuyến nghị trước tiên
                const recommendedIdx = result.templates.findIndex((t) => t.is_recommended);
                const defaultIdx = recommendedIdx !== -1 ? recommendedIdx : 0;
                setSelectedTemplateIndex(defaultIdx);
                setMessageContent(result.templates[defaultIdx]?.content || '');
            })
            .catch((err) => {
                setError(err.message || 'Lỗi khi tải thông tin nhắc việc.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isOpen, campaignCreatorId]);

    if (!isOpen) return null;

    const handleSelectTemplate = (index: number) => {
        setSelectedTemplateIndex(index);
        if (data?.templates[index]) {
            setMessageContent(data.templates[index].content);
        }
    };

    // 1-Click: Sao chép nội dung & Mở Zalo Desktop / Web
    const handleCopyAndOpenZalo = async () => {
        if (!data || !campaignCreatorId) return;

        setSending(true);
        try {
            // 1. Copy vào clipboard
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);

            // 2. Ghi log tương tác vào backend
            // @ts-ignore
            const logUrl = typeof route === 'function'
                ? route('outreach.quick-followup.log', campaignCreatorId)
                : `/outreach/quick-followup/${campaignCreatorId}`;

            // Lấy CSRF token từ thẻ meta
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            await fetch(logUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ content: messageContent }),
            });

            // 3. Mở deep-link Zalo
            window.open(data.creator.zalo_link, '_blank');

            if (onSuccess) {
                onSuccess(`Đã sao chép tin nhắn và mở Zalo cho ${data.creator.name}.`);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Không thể thực hiện sao chép hoặc mở Zalo.');
        } finally {
            setSending(false);
        }
    };

    // Chỉ sao chép nội dung
    const handleCopyOnly = async () => {
        try {
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            // ignore
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs">
                            <MessageCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Nhắc Việc Zalo 1-Chạm Thông Minh
                            </h3>
                            <p className="text-xs text-slate-500">
                                Tin nhắn cá nhân hóa chuẩn ngữ cảnh giúp đôn đốc KOC nhanh chóng
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="py-12 text-center">
                            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-600" />
                            <p className="mt-3 text-sm font-medium text-slate-600">
                                Đang tổng hợp ngữ cảnh và tạo mẫu tin nhắn...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertTriangle className="h-4 w-4" />
                                Đã xảy ra lỗi
                            </div>
                            <p className="mt-1 text-xs">{error}</p>
                            <div className="mt-3">
                                <Button size="sm" variant="secondary" onClick={onClose}>
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    ) : data ? (
                        <div className="space-y-4">
                            {/* Khối thông tin tóm tắt KOC & Chiến dịch */}
                            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div>
                                    <span className="text-slate-500">KOC:</span>{' '}
                                    <strong className="text-slate-900 text-sm">{data.creator.name}</strong>
                                    {data.creator.phone && (
                                        <span className="ml-2 font-mono text-slate-600">
                                            ({data.creator.phone})
                                        </span>
                                    )}
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        Chiến dịch: <span className="font-semibold text-slate-700">{data.campaign.name}</span> ({data.campaign.product_name})
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="default">{data.pipeline.status_label}</Badge>
                                    {data.pipeline.deadline_info && (
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                                data.pipeline.deadline_info.status === 'overdue'
                                                    ? 'bg-rose-100 text-rose-700 font-bold'
                                                    : data.pipeline.deadline_info.status === 'warning'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-emerald-50 text-emerald-700'
                                            }`}
                                        >
                                            <Clock className="h-3.5 w-3.5" />
                                            {data.pipeline.deadline_info.text}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Danh sách Mẫu Tin Nhắn gợi ý */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Chọn mẫu tin nhắn gợi ý theo ngữ cảnh:
                                    </label>
                                    <a
                                        href="/outreach"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                                        title="Chỉnh sửa hoặc thêm mẫu tin nhắn tập trung trong hệ thống"
                                    >
                                        <span>Cài đặt mẫu tin tập trung</span>
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {data.templates.map((tpl, idx) => {
                                        const isSelected = selectedTemplateIndex === idx;
                                        return (
                                            <button
                                                key={tpl.type}
                                                type="button"
                                                onClick={() => handleSelectTemplate(idx)}
                                                className={`flex flex-col text-left rounded-xl p-3 border transition-all ${
                                                    isSelected
                                                        ? 'border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20 shadow-xs'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={`text-xs font-bold ${isSelected ? 'text-primary-900' : 'text-slate-800'}`}>
                                                        {tpl.title}
                                                    </span>
                                                    {tpl.is_recommended && (
                                                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                                            Gợi ý
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                                                    {tpl.content.split('\n')[0]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Khung Soạn Thảo & Xem Trước Tin Nhắn */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                        <span>Nội dung gửi KOC (Có thể chỉnh sửa):</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleCopyOnly}
                                        className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                <span className="text-emerald-600">Đã chép</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                <span>Sao chép văn bản</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={messageContent}
                                        onChange={(e) => setMessageContent(e.target.value)}
                                        rows={6}
                                        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-800 shadow-xs focus:border-primary-500 focus:ring-primary-500 focus:ring-1 font-sans leading-relaxed"
                                        placeholder="Nhập nội dung tin nhắn trao đổi với KOC..."
                                    />
                                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/90 px-1.5 py-0.5 rounded">
                                        <span>{messageContent.length} ký tự</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Link cổng Portal tự động được chèn kèm token bảo mật của riêng KOC này.
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                    <Button variant="secondary" onClick={onClose} disabled={sending}>
                        Hủy bỏ
                    </Button>

                    <div className="flex items-center gap-2.5">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCopyOnly}
                            disabled={!data || sending}
                            iconLeft={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        >
                            {copied ? 'Đã sao chép' : 'Chỉ sao chép'}
                        </Button>

                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleCopyAndOpenZalo}
                            disabled={!data || sending || !messageContent.trim()}
                            loading={sending}
                            iconLeft={<MessageCircle className="h-4 w-4" />}
                        >
                            Sao chép & Mở Zalo
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
