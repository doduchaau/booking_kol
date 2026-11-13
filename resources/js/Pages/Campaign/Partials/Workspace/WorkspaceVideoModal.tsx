import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Button from '@/Components/Common/Button';
import PlatformIcon from '@/Components/Common/PlatformIcon';
import { Video, X, Link as LinkIcon, AlertCircle, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
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

    useEffect(() => {
        // Tự động nhận diện platform từ tài khoản đầu tiên của KOC
        const primaryPlatform = item.creator?.accounts?.[0]?.platform || 'tiktok';
        setPlatform(primaryPlatform);
        setPostUrl('');
        setVideoTitle('');
        setPostedAt(new Date().toISOString().split('T')[0]);
        setError(null);
    }, [item]);

    // Tự phát hiện platform khi dán URL
    const handleUrlChange = (url: string) => {
        setPostUrl(url);
        if (url.includes('tiktok.com')) setPlatform('tiktok');
        else if (url.includes('youtube.com') || url.includes('youtu.be')) setPlatform('youtube');
        else if (url.includes('facebook.com') || url.includes('fb.watch')) setPlatform('facebook');
        else if (url.includes('instagram.com')) setPlatform('instagram');
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
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <LinkIcon className="h-4 w-4 text-primary-600" />
                            <span>Đường dẫn link video (TikTok / YouTube / FB / Reels)</span>
                        </label>
                        <input
                            type="url"
                            value={postUrl}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            placeholder="https://www.tiktok.com/@creator/video/..."
                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                            required
                        />
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

