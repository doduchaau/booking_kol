import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { X, SlidersHorizontal, Eye, Heart, MessageSquare, DollarSign, ExternalLink, Check } from 'lucide-react';
import Button from '@/Components/Common/Button';
import PlatformBadge from '@/Components/Common/PlatformBadge';

export interface KocVideoDetailItem {
    post_id: number;
    creator_name: string;
    handle: string;
    tier: string;
    staff_name: string | null;
    platform: string;
    video_title: string;
    post_url: string | null;
    posted_at: string;
    deadline: string;
    delivery_status: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    gmv_amount: number;
    total_cost: number;
    booking_fee: number;
    sample_cost: number;
    cpv: number;
    roi_percentage: number;
}

interface EditVideoMetricsModalProps {
    isOpen: boolean;
    onClose: () => void;
    video: KocVideoDetailItem | null;
}

export default function EditVideoMetricsModal({
    isOpen,
    onClose,
    video,
}: EditVideoMetricsModalProps) {
    if (!isOpen || !video) return null;

    const [views, setViews] = useState<number>(video.views_count || 0);
    const [likes, setLikes] = useState<number>(video.likes_count || 0);
    const [comments, setComments] = useState<number>(video.comments_count || 0);
    const [gmv, setGmv] = useState<number>(video.gmv_amount || 0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (video) {
            setViews(video.views_count || 0);
            setLikes(video.likes_count || 0);
            setComments(video.comments_count || 0);
            setGmv(video.gmv_amount || 0);
        }
    }, [video]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(
            // @ts-ignore
            route('content.sync', video.post_id),
            {
                views_count: views,
                likes_count: likes,
                comments_count: comments,
                gmv_amount: gmv,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/75">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-primary-100 text-primary-700">
                            <SlidersHorizontal className="h-5 w-5" />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Cập Nhật Chỉ Số Video Thực Tế
                            </h3>
                            <p className="text-xs text-slate-500">
                                Nhập số liệu đối soát chính xác cho video #{video.post_id}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Video Info Summary */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                    <div>
                        <div className="font-bold text-slate-800">{video.creator_name} ({video.handle})</div>
                        <div className="text-slate-500 line-clamp-1 max-w-[280px] mt-0.5" title={video.video_title}>
                            {video.video_title}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <PlatformBadge platform={video.platform.toLowerCase()} size="xs" />
                        {video.post_url && (
                            <a
                                href={video.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-800"
                                title="Mở video"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Views Count */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5 text-blue-600" /> Lượt Xem (Views) *
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={views}
                            onChange={(e) => setViews(Math.max(0, parseInt(e.target.value) || 0))}
                            required
                            className="w-full text-sm rounded-xl border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-medium"
                            placeholder="Ví dụ: 25000"
                        />
                    </div>

                    {/* Likes & Comments Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Heart className="h-3.5 w-3.5 text-rose-500" /> Lượt Thích (Likes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={likes}
                                onChange={(e) => setLikes(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full text-sm rounded-xl border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Bình Luận
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={comments}
                                onChange={(e) => setComments(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full text-sm rounded-xl border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* GMV Amount */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Doanh Thu Đối Soát (GMV)
                            </span>
                            <span className="text-[11px] font-normal text-slate-400">Đơn vị: VND</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            value={gmv}
                            onChange={(e) => setGmv(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full text-sm rounded-xl border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-semibold text-emerald-700"
                            placeholder="0 (Nếu chưa đối soát)"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Để 0 đ nếu sàn chưa có kỳ đối soát doanh thu.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5"
                        >
                            <Check className="h-3.5 w-3.5" />
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
