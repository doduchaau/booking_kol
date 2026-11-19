import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, ExternalLink } from 'lucide-react';
import PlatformLogo, { getPlatformDisplayName, normalizePlatformName } from './PlatformLogo';
import { formatFollowers } from './PlatformBadge';

export interface CreatorAccountItem {
    id?: number;
    platform: string;
    handle: string;
    followers_count?: number | null;
    url?: string | null;
}

interface Props {
    accounts?: CreatorAccountItem[] | null;
    bookedPlatforms?: string[] | null;
    size?: 'xs' | 'sm' | 'md';
    emptyText?: string;
    className?: string;
}

interface Coords {
    top: number;
    left: number;
    placeBelow: boolean;
}

/**
 * Component hiển thị Cụm Huy Hiệu Đa Nền Tảng của KOC (KOC Platform Badges Cluster)
 * Sử dụng Logo thương hiệu Vector chính thức.
 * Hover chuột mở Popover chi tiết (ID/Handle, số follower, copy, mở kênh) qua React Portal
 * không bị che khuất hoặc cắt xén bởi overflow của bảng.
 */
export default function KocPlatformCluster({
    accounts = [],
    bookedPlatforms,
    size = 'sm',
    emptyText = 'Chưa liên kết kênh',
    className = '',
}: Props) {
    const [activeAccount, setActiveAccount] = useState<CreatorAccountItem | null>(null);
    const [coords, setCoords] = useState<Coords | null>(null);
    const [copiedHandle, setCopiedHandle] = useState<string | null>(null);

    const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

    const safeAccounts = Array.isArray(accounts) ? accounts : [];

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        };
    }, []);

    if (safeAccounts.length === 0) {
        return (
            <span className="text-[11px] text-slate-400 italic">
                {emptyText}
            </span>
        );
    }

    const handleMouseEnter = (acc: CreatorAccountItem, el: HTMLElement) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        const rect = el.getBoundingClientRect();
        // Nếu gần đỉnh màn hình hoặc table header (< 220px), đẩy popover xuống dưới
        const placeBelow = rect.top < 220;

        setCoords({
            top: placeBelow ? rect.bottom + 8 : rect.top - 8,
            left: rect.left + rect.width / 2,
            placeBelow,
        });
        setActiveAccount(acc);
    };

    const handleMouseLeave = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
            setActiveAccount(null);
            setCoords(null);
        }, 150);
    };

    const handlePopoverMouseEnter = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const handleCopy = (handle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const clean = handle.startsWith('@') ? handle : `@${handle}`;
        navigator.clipboard.writeText(clean);
        setCopiedHandle(handle);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => {
            setCopiedHandle(null);
        }, 2000);
    };

    return (
        <>
            <div className={`relative inline-flex items-center gap-1.5 flex-wrap ${className}`}>
                {safeAccounts.map((acc, idx) => {
                    const norm = normalizePlatformName(acc.platform);
                    const isBooked = bookedPlatforms ? bookedPlatforms.some(bp => normalizePlatformName(bp) === norm) : false;

                    return (
                        <div
                            key={acc.id || `${acc.platform}-${idx}`}
                            className="relative inline-flex items-center"
                            onMouseEnter={(e) => handleMouseEnter(acc, e.currentTarget)}
                            onMouseLeave={handleMouseLeave}
                        >
                            {/* Huy hiệu Logo chính hãng */}
                            <div
                                className={`cursor-pointer transition-transform duration-150 hover:scale-110 active:scale-95 relative ${
                                    isBooked ? 'ring-2 ring-emerald-500 rounded-full ring-offset-1' : ''
                                }`}
                            >
                                <PlatformLogo platform={acc.platform} size={size} />

                                {/* Dấu chấm xanh nếu kênh này đang được book trong chiến dịch */}
                                {isBooked && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-white"
                                        title="Nền tảng được book trong chiến dịch này"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Popover Chi Tiết Render Qua React Portal (Tránh triệt để bị che bởi overflow của bảng) */}
            {activeAccount && coords && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed z-[9999] w-60 rounded-xl bg-slate-900 text-white p-3 shadow-2xl border border-slate-700/80 text-xs animate-in fade-in zoom-in-95 duration-100 select-text"
                    style={{
                        top: coords.placeBelow ? `${coords.top}px` : undefined,
                        bottom: coords.placeBelow ? undefined : `${window.innerHeight - coords.top}px`,
                        left: `${Math.max(130, Math.min(window.innerWidth - 130, coords.left))}px`,
                        transform: 'translateX(-50%)',
                    }}
                    onMouseEnter={handlePopoverMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700/60">
                        <div className="flex items-center gap-2 min-w-0">
                            <PlatformLogo platform={activeAccount.platform} size="xs" />
                            <span className="font-bold text-slate-100 truncate">
                                {getPlatformDisplayName(activeAccount.platform)}
                            </span>
                        </div>
                        {bookedPlatforms && bookedPlatforms.some(bp => normalizePlatformName(bp) === normalizePlatformName(activeAccount.platform)) && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                                Được book
                            </span>
                        )}
                    </div>

                    <div className="mt-2 space-y-1.5">
                        {/* Handle / ID */}
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="text-slate-400">ID / Handle:</span>
                            <span className="font-mono font-semibold text-white truncate max-w-[130px]" title={activeAccount.handle}>
                                {activeAccount.handle.startsWith('@') ? activeAccount.handle : `@${activeAccount.handle}`}
                            </span>
                        </div>

                        {/* Followers */}
                        {activeAccount.followers_count !== undefined && activeAccount.followers_count !== null && (
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Người theo dõi:</span>
                                <span className="font-semibold text-slate-200">
                                    {formatFollowers(activeAccount.followers_count) || activeAccount.followers_count}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Nút thao tác nhanh */}
                    <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={(e) => handleCopy(activeAccount.handle, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition-colors cursor-pointer"
                        >
                            {copiedHandle === activeAccount.handle ? (
                                <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">Đã chép</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3 w-3 text-slate-400" />
                                    <span>Sao chép ID</span>
                                </>
                            )}
                        </button>

                        {activeAccount.url && (
                            <a
                                href={activeAccount.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary-600 hover:bg-primary-500 text-[11px] text-white font-medium transition-colors cursor-pointer"
                            >
                                <span>Mở kênh</span>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>

                    {/* Mũi tên chỉ hướng */}
                    {coords.placeBelow ? (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-slate-900" />
                    ) : (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900" />
                    )}
                </div>,
                document.body
            )}
        </>
    );
}
