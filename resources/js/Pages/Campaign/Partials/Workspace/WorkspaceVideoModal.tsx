import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Button from '@/Components/Common/Button';
import PlatformIcon from '@/Components/Common/PlatformIcon';
import { Video, X, Link as LinkIcon, AlertCircle, Calendar, Sparkles, CheckCircle2, RefreshCw, AlertTriangle, Copy, Check, MessageCircle } from 'lucide-react';
import { WorkspaceKocItem } from '@/Pages/Campaign/Workspace';

interface WorkspaceVideoModalProps {
    item: WorkspaceKocItem | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export default function WorkspaceVideoModal({
    item,
    onClose,
    onSuccess,
}: WorkspaceVideoModalProps) {
    if (!item) return null;

    const [platform, setPlatform] = useState('tiktok');
    const [postUrl, setPostUrl] = useState('');
    const [videoTitle, setVideoTitle] = useState('');
    const [postedAt, setPostedAt] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [precheckResult, setPrecheckResult] = useState<any>(null);
    const [isPrechecking, setIsPrechecking] = useState(false);
    const [copiedRevisionZalo, setCopiedRevisionZalo] = useState(false);

    useEffect(() => {
        // Tự động nhận diện platform từ tài khoản đầu tiên của KOC
        const primaryPlatform = item.creator?.accounts?.[0]?.platform || 'tiktok';
        setPlatform(primaryPlatform);
        setPostUrl('');
        setVideoTitle('');
        setPostedAt(new Date().toISOString().split('T')[0]);
        setError(null);
        setPrecheckResult(null);
    }, [item]);

    // Tự phát hiện platform khi dán URL
    const handleUrlChange = (url: string) => {
        setPostUrl(url);
        let detected = platform;
        if (url.includes('tiktok.com')) detected = 'tiktok';
        else if (url.includes('shopee.vn') || url.includes('vn.shp.ee')) detected = 'shopee';
        else if (url.includes('facebook.com') || url.includes('fb.watch')) detected = 'facebook';
        else if (url.includes('youtube.com') || url.includes('youtu.be')) detected = 'youtube';
        else if (url.includes('instagram.com')) detected = 'instagram';
        setPlatform(detected);
    };

    const runPrecheck = async (urlToScan?: string) => {
        const targetUrl = urlToScan || postUrl;
        if (!targetUrl || !targetUrl.startsWith('http')) {
            setPrecheckResult(null);
            return;
        }

        setIsPrechecking(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const resp = await fetch('/contents/precheck', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    post_url: targetUrl.trim(),
                    platform: platform,
                    campaign_creator_id: item.id,
                }),
            });

            if (resp.ok) {
                const data = await resp.json();
                setPrecheckResult(data);
                if (data.metadata?.caption && !videoTitle) {
                    setVideoTitle(data.metadata.caption.slice(0, 200));
                }
            }
        } catch (e) {
            console.error('Lỗi quét tuân thủ video:', e);
        } finally {
            setIsPrechecking(false);
        }
    };

    const handleCopyRevisionZalo = async () => {
        if (!precheckResult?.revision_message) return;
        await navigator.clipboard.writeText(precheckResult.revision_message);
        setCopiedRevisionZalo(true);
        setTimeout(() => setCopiedRevisionZalo(false), 2500);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!postUrl.trim()) {
            setError('Vui lòng nhập đường link video của KOC.');
            return;
        }

        setIsSubmitting(true);

        // @ts-ignore
        const url = typeof route === 'function'
            ? route('campaigns.creators.videos.store', { id: item.campaign_id, pivotId: item.id })
            : `/campaigns/${item.campaign_id}/creators/${item.id}/videos`;

        router.post(
            url,
            {
                platform,
                post_url: postUrl.trim(),
                video_title: videoTitle.trim() || undefined,
                posted_at: postedAt || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onSuccess(`Đã ghi nhận video nghiệm thu cho KOC ${item.creator?.name || ''} thành công!`);
                    onClose();
                },
                onError: (errs) => {
                    const firstErr = Object.values(errs)[0];
                    setError(typeof firstErr === 'string' ? firstErr : 'Không thể lưu video. Vui lòng kiểm tra lại đường link.');
                },
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                            <Video className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Ghi Nhận Video Nghiệm Thu
                            </h3>
                            <p className="text-xs text-slate-500">
                                KOC: <strong className="text-slate-800">{item.creator?.name}</strong> • Chiến dịch: <strong className="text-slate-800">{item.campaign?.name}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Platform Selector */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">
                            Nền tảng xuất bản video
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {[
                                { key: 'tiktok', label: 'TikTok' },
                                { key: 'youtube', label: 'YouTube' },
                                { key: 'facebook', label: 'Facebook' },
                                { key: 'instagram', label: 'Instagram' },
                                { key: 'shopee', label: 'Shopee' },
                            ].map((p) => {
                                const isActive = platform === p.key;
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => setPlatform(p.key)}
                                        className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                                            isActive
                                                ? 'bg-primary-600 text-white border-primary-600 shadow-xs ring-2 ring-primary-600/20'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <PlatformIcon
                                            platform={p.key}
                                            className="h-4 w-4"
                                            colorMode={isActive ? 'current' : 'brand'}
                                        />
                                        <span>{p.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* URL link */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <LinkIcon className="h-4 w-4 text-primary-600" />
                                <span>Đường dẫn link video (TikTok / Shopee Video / Facebook Reels)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Tự động kiểm tra brief</span>
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="url"
                                    value={postUrl}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    onBlur={() => runPrecheck()}
                                    placeholder="https://www.tiktok.com/@creator/video/..."
                                    className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                    required
                                />
                                {isPrechecking && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        <span>Đang quét...</span>
                                    </div>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                loading={isPrechecking}
                                onClick={() => runPrecheck()}
                                iconLeft={<RefreshCw className="h-3.5 w-3.5 text-indigo-600" />}
                            >
                                Quét
                            </Button>
                        </div>

                        {/* Thẻ Kết Quả Kiểm Tra Tuân Thủ Nhanh Cho Nhân Viên */}
                        {precheckResult && (
                            <div
                                className={`p-3 rounded-xl border text-xs space-y-2.5 transition-all animate-in fade-in duration-150 ${
                                    precheckResult.status === 'passed'
                                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                        : precheckResult.status === 'warning'
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        {precheckResult.status === 'passed' ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        ) : precheckResult.status === 'warning' ? (
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-rose-600" />
                                        )}
                                        <span>
                                            {precheckResult.status === 'passed'
                                                ? '✓ Video đạt chuẩn 100% brief'
                                                : precheckResult.status === 'warning'
                                                ? '⚠️ Cần kiểm tra lại một số điểm brief'
                                                : '❌ Video không tồn tại hoặc riêng tư'}
                                        </span>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
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

                                {/* Chi tiết checklist gọn */}
                                {precheckResult.checklist && (
                                    <div className="grid grid-cols-1 gap-1 pt-1 border-t border-black/5">
                                        {precheckResult.checklist.map((c: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                                                <span className="flex items-center gap-1">
                                                    {c.status === 'passed' ? (
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                    ) : (
                                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                    )}
                                                    <span>{c.label}:</span>
                                                </span>
                                                <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                                                    {c.missing && c.missing.length > 0
                                                        ? `Thiếu ${c.missing.join(', ')}`
                                                        : c.status === 'passed'
                                                        ? '✓ Đạt'
                                                        : c.message}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Nút Copy Tin Nhắn Zalo Yêu Cầu Sửa Nhanh */}
                                {precheckResult.status !== 'passed' && precheckResult.revision_message && (
                                    <div className="pt-1.5 flex items-center justify-between border-t border-black/5">
                                        <span className="text-[10px] text-slate-500 italic">
                                            KOC chưa làm đúng brief?
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyRevisionZalo}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
                                        >
                                            {copiedRevisionZalo ? (
                                                <>
                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                    <span className="text-emerald-700">Đã copy tin nhắn Zalo</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3 w-3 text-indigo-600" />
                                                    <span>Copy tin Zalo nhắc sửa</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tiêu đề video */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-slate-500" />
                            <span>Tiêu đề bài đăng hoặc mô tả ngắn (Tùy chọn)</span>
                        </label>
                        <input
                            type="text"
                            value={videoTitle}
                            onChange={(e) => setVideoTitle(e.target.value)}
                            placeholder="Ví dụ: Review Serum trắng da thực tế sau 14 ngày..."
                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                        />
                    </div>

                    {/* Ngày đăng */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span>Ngày xuất bản</span>
                        </label>
                        <input
                            type="date"
                            value={postedAt}
                            onChange={(e) => setPostedAt(e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            iconLeft={<CheckCircle2 className="h-4 w-4" />}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Video Nghiệm Thu'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

