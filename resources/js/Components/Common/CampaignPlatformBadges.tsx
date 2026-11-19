import React from 'react';
import PlatformLogo, { getPlatformDisplayName, normalizePlatformName } from './PlatformLogo';
import { Check, Clock, AlertCircle } from 'lucide-react';

export interface PlatformDeliverableItem {
    platform: string;
    has_post: boolean;
    is_completed: boolean;
    posts_count: number;
    latest_post?: {
        id: number;
        post_url: string;
        video_title?: string;
        status: string;
        views_count?: number;
        posted_at?: string;
    } | null;
}

export interface PlatformDeliverablesInfo {
    total_platforms: number;
    completed_platforms: number;
    is_all_completed: boolean;
    items: PlatformDeliverableItem[];
}

interface Props {
    platforms?: string[] | null;
    deliverables?: PlatformDeliverablesInfo | null;
    size?: 'xs' | 'sm' | 'md';
    showLabel?: boolean;
    showStatus?: boolean;
    interactive?: boolean;
    onTogglePlatform?: (platform: string) => void;
    className?: string;
}

/**
 * Component hiển thị huy hiệu các nền tảng KOC cam kết làm trong chiến dịch
 * Dùng đúng Logo nhận diện thương hiệu chính xác của từng mạng xã hội.
 */
export default function CampaignPlatformBadges({
    platforms = ['tiktok'],
    deliverables,
    size = 'sm',
    showLabel = true,
    showStatus = true,
    interactive = false,
    onTogglePlatform,
    className = '',
}: Props) {
    const safePlatforms = Array.isArray(platforms) && platforms.length > 0 ? platforms : ['tiktok'];

    const deliverableMap = React.useMemo(() => {
        const map = new Map<string, PlatformDeliverableItem>();
        if (deliverables?.items) {
            for (const item of deliverables.items) {
                map.set(normalizePlatformName(item.platform), item);
            }
        }
        return map;
    }, [deliverables]);

    return (
        <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
            {safePlatforms.map((p) => {
                const norm = normalizePlatformName(p);
                const label = getPlatformDisplayName(p);
                const info = deliverableMap.get(norm);

                const isCompleted = info?.is_completed ?? false;
                const hasPost = info?.has_post ?? false;

                return (
                    <div
                        key={p}
                        onClick={() => interactive && onTogglePlatform?.(p)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all ${
                            interactive ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''
                        } ${
                            isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : hasPost
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                        title={
                            info
                                ? `${label}: ${
                                      isCompleted
                                          ? 'Đã duyệt video'
                                          : hasPost
                                          ? 'Đã nộp video (chờ duyệt)'
                                          : 'Chưa nộp video'
                                  }`
                                : label
                        }
                    >
                        <PlatformLogo platform={p} size={size === 'md' ? 'sm' : 'xs'} />
                        {showLabel && <span className="font-medium text-[11px]">{label}</span>}

                        {showStatus && deliverables && (
                            <span className="shrink-0">
                                {isCompleted ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                                ) : hasPost ? (
                                    <Clock className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                                ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Chưa nộp video" />
                                )}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
