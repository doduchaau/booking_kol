import React from 'react';

export interface PlatformIconProps {
    platform: string;
    className?: string;
    colorMode?: 'brand' | 'current';
}

/**
 * Chuẩn hóa tên nền tảng (chuyển về lowercase và bỏ ký tự thừa)
 */
export function normalizePlatform(platform: string): string {
    if (!platform) return 'unknown';
    const clean = platform.trim().toLowerCase();
    if (clean.includes('tiktok')) return 'tiktok';
    if (clean.includes('youtube') || clean.includes('yt')) return 'youtube';
    if (clean.includes('facebook') || clean.includes('fb')) return 'facebook';
    if (clean.includes('instagram') || clean.includes('insta') || clean === 'ig') return 'instagram';
    if (clean.includes('shopee')) return 'shopee';
    if (clean.includes('zalo')) return 'zalo';
    return clean;
}

/**
 * Trả về tên hiển thị chuẩn đẹp của nền tảng
 */
export function getPlatformLabel(platform: string): string {
    const norm = normalizePlatform(platform);
    switch (norm) {
        case 'tiktok':
            return 'TikTok';
        case 'youtube':
            return 'YouTube';
        case 'facebook':
            return 'Facebook';
        case 'instagram':
            return 'Instagram';
        case 'shopee':
            return 'Shopee';
        case 'zalo':
            return 'Zalo';
        default:
            return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'MXH';
    }
}

/**
 * Component hiển thị SVG Icon sắc nét chuẩn thương hiệu cho từng mạng xã hội
 */
export default function PlatformIcon({
    platform,
    className = 'h-4 w-4',
    colorMode = 'brand',
}: PlatformIconProps) {
    const norm = normalizePlatform(platform);

    const brandColors: Record<string, string> = {
        tiktok: 'text-slate-900',
        facebook: 'text-[#1877F2]',
        youtube: 'text-[#FF0000]',
        instagram: 'text-[#E1306C]',
        shopee: 'text-[#EE4D2D]',
        zalo: 'text-[#0068FF]',
    };

    const colorClass = colorMode === 'brand' ? (brandColors[norm] || 'text-slate-600') : '';

    switch (norm) {
        case 'tiktok':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`${className} ${colorClass} shrink-0`}
                    aria-label="TikTok"
                >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74l-.07-.1a2.89 2.89 0 0 1 2.37-4.54c.31 0 .61.05.89.14V9.37a6.34 6.34 0 0 0-.89-.06 6.34 6.34 0 1 0 6.34 6.34V8.41a8.23 8.23 0 0 0 4.77 1.52V6.48a4.8 4.8 0 0 1-.99-.21z" />
                </svg>
            );

        case 'facebook':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`${className} ${colorClass} shrink-0`}
                    aria-label="Facebook"
                >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            );

        case 'youtube':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`${className} ${colorClass} shrink-0`}
                    aria-label="YouTube"
                >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            );

        case 'instagram':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`${className} ${colorClass} shrink-0`}
                    aria-label="Instagram"
                >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
            );

        case 'shopee':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`${className} ${colorClass} shrink-0`}
                    aria-label="Shopee"
                >
                    <path d="M19.5 7h-2.6A5 5 0 0 0 12 2.5a5 5 0 0 0-4.9 4.5H4.5A1.5 1.5 0 0 0 3 8.5l1.4 11.2A3 3 0 0 0 7.4 22.5h9.2a3 3 0 0 0 3-2.8L21 8.5A1.5 1.5 0 0 0 19.5 7zM12 4.5a3 3 0 0 1 2.9 2.5H9.1a3 3 0 0 1 2.9-2.5zm1.5 11.2c-.3.6-.9.9-1.6.9-.9 0-1.5-.5-1.6-1.2h-.9c.1 1.1 1 1.9 2.2 2 0 .5.4.8.9.8s.9-.3.9-.8c1.1-.2 2-1 2-2.1 0-1.4-1.1-2-2.2-2.3-.9-.2-1.3-.5-1.3-.9 0-.4.4-.7 1-.7.7 0 1.2.3 1.4.8h.9c-.2-.9-.9-1.5-1.9-1.6v-.6c0-.5-.4-.8-.9-.8s-.9.3-.9.8v.6c-1.1.2-1.9.9-1.9 1.9 0 1.3 1 1.9 2.1 2.2.9.3 1.4.6 1.4 1z" />
                </svg>
            );

        case 'zalo':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`${className} ${colorClass} shrink-0`}
                    aria-label="Zalo"
                >
                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.04-.15.89-.64 2.65-.7 2.88-.08.31.11.58.4.58.15 0 .3-.06.42-.18.96-.92 2.76-2.58 3.52-3.15.8.22 1.64.33 2.5.33 5.52 0 10-4.03 10-9S17.52 2 12 2zm-1.8 12.5h-4.4v-1.6l2.8-3.4H6.2V8h4v1.6l-2.8 3.4h3v1.5zm6.8 0h-4v-6.5h1.6v5h2.4v1.5z" />
                </svg>
            );

        default:
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${className} ${colorClass} shrink-0`}
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
            );
    }
}

