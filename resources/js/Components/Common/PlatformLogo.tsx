import React from 'react';

export interface PlatformLogoProps {
    platform: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showTooltip?: boolean;
}

export function normalizePlatformName(platform: string): string {
    if (!platform) return 'unknown';
    const clean = platform.trim().toLowerCase();
    if (clean.includes('tiktok')) return 'tiktok';
    if (clean.includes('shopee')) return 'shopee';
    if (clean.includes('facebook') || clean.includes('fb')) return 'facebook';
    if (clean.includes('youtube') || clean.includes('yt')) return 'youtube';
    if (clean.includes('instagram') || clean.includes('insta') || clean === 'ig') return 'instagram';
    if (clean.includes('zalo')) return 'zalo';
    return clean;
}

export function getPlatformDisplayName(platform: string): string {
    const norm = normalizePlatformName(platform);
    switch (norm) {
        case 'tiktok':
            return 'TikTok';
        case 'shopee':
            return 'Shopee';
        case 'facebook':
            return 'Facebook';
        case 'youtube':
            return 'YouTube';
        case 'instagram':
            return 'Instagram';
        case 'zalo':
            return 'Zalo';
        default:
            return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Mạng Xã Hội';
    }
}

/**
 * Component hiển thị Logo chính xác, chuẩn bộ nhận diện thương hiệu (Official Brand Vector Logo)
 * của từng mạng xã hội (TikTok, Shopee, Facebook, YouTube, Instagram, Zalo)
 */
export default function PlatformLogo({
    platform,
    size = 'sm',
    className = '',
}: PlatformLogoProps) {
    const norm = normalizePlatformName(platform);
    const label = getPlatformDisplayName(platform);

    const sizeDimensions: Record<string, { container: string; icon: string }> = {
        xs: { container: 'h-4 w-4 min-w-[16px]', icon: 'h-2.5 w-2.5' },
        sm: { container: 'h-5 w-5 min-w-[20px]', icon: 'h-3.5 w-3.5' },
        md: { container: 'h-6 w-6 min-w-[24px]', icon: 'h-4 w-4' },
        lg: { container: 'h-8 w-8 min-w-[32px]', icon: 'h-5 w-5' },
        xl: { container: 'h-10 w-10 min-w-[40px]', icon: 'h-6 w-6' },
    };

    const dims = sizeDimensions[size] || sizeDimensions.sm;

    switch (norm) {
        case 'tiktok':
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-full bg-black shadow-xs shrink-0 select-none ${dims.container} ${className}`}
                    title={label}
                >
                    <svg viewBox="0 0 24 24" className={dims.icon} fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.889 2.894 2.894 0 0 1-2.889-2.889 2.895 2.895 0 0 1 2.889-2.89c.31 0 .607.052.886.142V9.375a6.326 6.326 0 0 0-.886-.062 6.34 6.34 0 0 0-6.335 6.335 6.34 6.34 0 0 0 6.335 6.335 6.34 6.34 0 0 0 6.335-6.335V8.41a8.212 8.212 0 0 0 4.765 1.522V6.48a4.83 4.83 0 0 1-.99-.214z"
                            fill="#FFFFFF"
                        />
                        <path
                            d="M16.5 2.45v2.99a4.83 4.83 0 0 0 3.09 1.04v-.99a3.83 3.83 0 0 1-3.09-3.04z"
                            fill="#25F4EE"
                        />
                        <path
                            d="M9.47 12.43a2.895 2.895 0 0 0-2.89 2.89 2.894 2.894 0 0 0 2.89 2.89 2.896 2.896 0 0 0 2.89-2.89v-.99a3.896 3.896 0 0 1-2.89-1.9z"
                            fill="#FE2C55"
                        />
                    </svg>
                </div>
            );

        case 'facebook':
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-full bg-[#1877F2] shadow-xs shrink-0 select-none ${dims.container} ${className}`}
                    title={label}
                >
                    <svg viewBox="0 0 24 24" className={dims.icon} fill="currentColor">
                        <path
                            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                            fill="#FFFFFF"
                        />
                    </svg>
                </div>
            );

        case 'shopee':
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-full bg-[#EE4D2D] shadow-xs shrink-0 select-none ${dims.container} ${className}`}
                    title={label}
                >
                    <svg viewBox="0 0 24 24" className={dims.icon} fill="currentColor">
                        <path
                            d="M19.5 7h-2.6A5 5 0 0 0 12 2.5a5 5 0 0 0-4.9 4.5H4.5A1.5 1.5 0 0 0 3 8.5l1.4 11.2A3 3 0 0 0 7.4 22.5h9.2a3 3 0 0 0 3-2.8L21 8.5A1.5 1.5 0 0 0 19.5 7zM12 4.5a3 3 0 0 1 2.9 2.5H9.1a3 3 0 0 1 2.9-2.5zm1.5 11.2c-.3.6-.9.9-1.6.9-.9 0-1.5-.5-1.6-1.2h-.9c.1 1.1 1 1.9 2.2 2 0 .5.4.8.9.8s.9-.3.9-.8c1.1-.2 2-1 2-2.1 0-1.4-1.1-2-2.2-2.3-.9-.2-1.3-.5-1.3-.9 0-.4.4-.7 1-.7.7 0 1.2.3 1.4.8h.9c-.2-.9-.9-1.5-1.9-1.6v-.6c0-.5-.4-.8-.9-.8s-.9.3-.9.8v.6c-1.1.2-1.9.9-1.9 1.9 0 1.3 1 1.9 2.1 2.2.9.3 1.4.6 1.4 1z"
                            fill="#FFFFFF"
                        />
                    </svg>
                </div>
            );

        case 'youtube':
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-full bg-[#FF0000] shadow-xs shrink-0 select-none ${dims.container} ${className}`}
                    title={label}
                >
                    <svg viewBox="0 0 24 24" className={dims.icon} fill="currentColor">
                        <path
                            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                            fill="#FFFFFF"
                        />
                    </svg>
                </div>
            );

        case 'instagram':
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] shadow-xs shrink-0 select-none ${dims.container} ${className}`}
                    title={label}
                >
                    <svg viewBox="0 0 24 24" className={dims.icon} fill="currentColor">
                        <path
                            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                            fill="#FFFFFF"
                        />
                    </svg>
                </div>
            );

        case 'zalo':
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-full bg-[#0068FF] shadow-xs shrink-0 select-none ${dims.container} ${className}`}
                    title={label}
                >
                    <span className="font-black text-white text-[9px] leading-none tracking-tight">Zalo</span>
                </div>
            );

        default:
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-full bg-slate-600 shadow-xs shrink-0 select-none ${dims.container} ${className}`}
                    title={label}
                >
                    <span className="font-bold text-white text-[9px]">{platform.slice(0, 2).toUpperCase()}</span>
                </div>
            );
    }
}
