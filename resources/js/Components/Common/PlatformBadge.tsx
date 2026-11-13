import React from 'react';
import { ExternalLink } from 'lucide-react';
import PlatformIcon, { normalizePlatform, getPlatformLabel } from './PlatformIcon';

export interface PlatformBadgeProps {
    platform: string;
    handle?: string | null;
    followersCount?: number | null;
    url?: string | null;
    size?: 'xs' | 'sm' | 'md';
    showIcon?: boolean;
    showLabel?: boolean;
    variant?: 'soft' | 'solid';
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export function formatFollowers(count?: number | null): string {
    if (!count || count <= 0) return '';
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    }
    return String(count);
}

export default function PlatformBadge({
    platform,
    handle,
    followersCount,
    url,
    size = 'sm',
    showIcon = true,
    showLabel = true,
    variant = 'soft',
    className = '',
    onClick,
}: PlatformBadgeProps) {
    const norm = normalizePlatform(platform);
    const label = getPlatformLabel(platform);

    // Kích thước font, padding và icon
    const sizeConfig = {
        xs: {
            container: 'px-1.5 py-0.5 text-[10px] gap-1 rounded',
            icon: 'h-3 w-3',
            extIcon: 'h-2.5 w-2.5',
        },
        sm: {
            container: 'px-2 py-0.5 text-xs gap-1.5 rounded-md font-medium',
            icon: 'h-3.5 w-3.5',
            extIcon: 'h-3 w-3',
        },
        md: {
            container: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg font-semibold',
            icon: 'h-4 w-4',
            extIcon: 'h-3.5 w-3.5',
        },
    }[size];

    // Bảng màu cho Soft variant (mặc định)
    const softClasses: Record<string, string> = {
        tiktok:
            'bg-slate-900 text-white border-slate-950 shadow-2xs hover:bg-black hover:border-black',
        facebook:
            'bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/90 hover:border-blue-300 hover:text-blue-800',
        youtube:
            'bg-red-50 text-red-700 border-red-200/90 hover:bg-red-100/90 hover:border-red-300 hover:text-red-800',
        instagram:
            'bg-pink-50 text-pink-700 border-pink-200/90 hover:bg-pink-100/90 hover:border-pink-300 hover:text-pink-800',
        shopee:
            'bg-orange-50 text-orange-700 border-orange-200/90 hover:bg-orange-100/90 hover:border-orange-300 hover:text-orange-800',
        zalo:
            'bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100/90 hover:border-sky-300 hover:text-sky-800',
    };

    // Bảng màu cho Solid variant (dùng khi cần nổi bật)
    const solidClasses: Record<string, string> = {
        tiktok: 'bg-black text-white border-black shadow-xs',
        facebook: 'bg-[#1877F2] text-white border-[#1877F2] shadow-xs',
        youtube: 'bg-[#FF0000] text-white border-[#FF0000] shadow-xs',
        instagram: 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white border-transparent shadow-xs',
        shopee: 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-xs',
        zalo: 'bg-[#0068FF] text-white border-[#0068FF] shadow-xs',
    };

    const colorClass =
        variant === 'solid'
            ? solidClasses[norm] || 'bg-slate-800 text-white border-slate-800'
            : softClasses[norm] || 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';

    const formattedFollowers = formatFollowers(followersCount);
    const cleanHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : null;

    // Màu icon: nếu là solid hoặc tiktok soft thì dùng current (trắng), ngược lại dùng màu thương hiệu
    const iconColorMode = variant === 'solid' || norm === 'tiktok' ? 'current' : 'brand';

    const content = (
        <>
            {showIcon && (
                <PlatformIcon
                    platform={norm}
                    className={sizeConfig.icon}
                    colorMode={iconColorMode}
                />
            )}

            {showLabel && (
                <span className="font-semibold tracking-tight">
                    {label}
                </span>
            )}

            {cleanHandle && (
                <span className={`font-mono ${norm === 'tiktok' || variant === 'solid' ? 'opacity-95' : 'text-slate-800 font-medium'}`}>
                    {showLabel && ': '}
                    {cleanHandle}
                </span>
            )}

            {formattedFollowers && (
                <span
                    className={`text-[10px] ${
                        norm === 'tiktok' || variant === 'solid'
                            ? 'opacity-80'
                            : 'text-slate-400 font-medium'
                    }`}
                >
                    ({formattedFollowers})
                </span>
            )}

            {url && (
                <ExternalLink
                    className={`${sizeConfig.extIcon} shrink-0 ${
                        norm === 'tiktok' || variant === 'solid' ? 'opacity-70' : 'text-slate-400'
                    }`}
                />
            )}
        </>
    );

    if (url) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={onClick}
                className={`inline-flex items-center border transition-all duration-150 cursor-pointer ${sizeConfig.container} ${colorClass} ${className}`}
                title={`Mở trang ${label}${cleanHandle ? ` (${cleanHandle})` : ''}`}
            >
                {content}
            </a>
        );
    }

    return (
        <span
            onClick={onClick}
            className={`inline-flex items-center border transition-colors ${sizeConfig.container} ${colorClass} ${className}`}
        >
            {content}
        </span>
    );
}

