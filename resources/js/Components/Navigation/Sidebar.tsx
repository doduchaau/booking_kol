import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Video,
    MessageSquare,
    BarChart3,
    Settings,
    Upload,
    X,
    Sparkles,
} from 'lucide-react';

export interface SidebarProps {
    isOpenMobile: boolean;
    onCloseMobile: () => void;
}

interface NavItem {
    label: string;
    routeName?: string;
    fallbackUrl?: string;
    icon: React.ElementType;
    badge?: string;
    activeRule?: (currentRoute: string) => boolean;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
    const { url } = usePage();

    // Helper an toàn kiểm tra active route mà không gây crash nếu route chưa đăng ký trong Ziggy
    const isCurrent = (routeName?: string, fallbackUrl?: string) => {
        if (!routeName) {
            return fallbackUrl ? url.startsWith(fallbackUrl) : false;
        }
        try {
            // @ts-ignore
            if (typeof route === 'function') {
                // @ts-ignore
                return route().current(routeName);
            }
        } catch (e) {
            // Fallback khi route chưa tồn tại
        }
        return fallbackUrl ? url.startsWith(fallbackUrl) : false;
    };

    const getHref = (routeName?: string, fallbackUrl?: string) => {
        if (routeName) {
            try {
                // @ts-ignore
                if (typeof route === 'function' && route().has(routeName)) {
                    // @ts-ignore
                    return route(routeName);
                }
            } catch (e) {
                // ignore
            }
        }
        return fallbackUrl || '#';
    };

    const navGroups: NavGroup[] = [
        {
            title: 'TỔNG QUAN',
            items: [
                {
                    label: 'Bảng điều khiển',
                    routeName: 'dashboard',
                    fallbackUrl: '/dashboard',
                    icon: LayoutDashboard,
                },
            ],
        },
        {
            title: 'CREATOR CRM',
            items: [
                {
                    label: 'Danh sách Creator',
                    routeName: 'creators.index',
                    fallbackUrl: '/creators',
                    icon: Users,
                    activeRule: () => url.startsWith('/creators') && !url.includes('/import') && !url.includes('/extension'),
                },
                {
                    label: 'Nhập từ Excel / CSV',
                    routeName: 'creators.import.view',
                    fallbackUrl: '/creators/import',
                    icon: Upload,
                },
                {
                    label: 'Tiện ích Extension',
                    routeName: 'creators.extension.index',
                    fallbackUrl: '/creators/extension',
                    icon: Sparkles,
                    badge: 'Mới',
                },
            ],
        },
        {
            title: 'CHIẾN DỊCH & KOC',
            items: [
                {
                    label: 'Quản lý Chiến dịch',
                    routeName: 'campaigns.index',
                    fallbackUrl: '/campaigns',
                    icon: FolderKanban,
                    activeRule: () => url.startsWith('/campaigns'),
                },
            ],
        },
        {
            title: 'VẬN HÀNH & NỘI DUNG',
            items: [
                {
                    label: 'Tiếp cận Zalo (Outreach)',
                    routeName: 'outreach.index',
                    fallbackUrl: '/outreach',
                    icon: MessageSquare,
                },
                {
                    label: 'Duyệt Video & Bài đăng',
                    routeName: 'content.index',
                    fallbackUrl: '/content',
                    icon: Video,
                },
            ],
        },
        {
            title: 'BÁO CÁO & HỆ THỐNG',
            items: [
                {
                    label: 'Báo cáo & ROI',
                    routeName: 'reports.index',
                    fallbackUrl: '/reports',
                    icon: BarChart3,
                },
                {
                    label: 'Cài đặt hệ thống',
                    routeName: 'settings.index',
                    fallbackUrl: '/settings',
                    icon: Settings,
                },
            ],
        },
    ];

    const sidebarContent = (
        <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
            {/* Top Brand Logo */}
            <div>
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-500/20">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
                                KOL Booking
                            </span>
                            <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider block">
                                Doanh Nghiệp
                            </span>
                        </div>
                    </Link>

                    {/* Mobile close button */}
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 md:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-6 px-3 py-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
                    {navGroups.map((group, groupIdx) => (
                        <div key={groupIdx}>
                            <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                {group.title}
                            </h3>
                            <ul className="space-y-1">
                                {group.items.map((item, itemIdx) => {
                                    const active = item.activeRule
                                        ? item.activeRule(url)
                                        : isCurrent(item.routeName, item.fallbackUrl);
                                    const href = getHref(item.routeName, item.fallbackUrl);
                                    const Icon = item.icon;

                                    return (
                                        <li key={itemIdx}>
                                            <Link
                                                href={href}
                                                onClick={onCloseMobile}
                                                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                                                    active
                                                        ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon
                                                        className={`h-4 w-4 shrink-0 transition-colors ${
                                                            active
                                                                ? 'text-primary-600'
                                                                : 'text-slate-400 group-hover:text-slate-600'
                                                        }`}
                                                    />
                                                    <span>{item.label}</span>
                                                </div>
                                                {item.badge && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Bottom Footer / Version */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs">
                        VN
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                            Booking KOL System
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                            Phiên bản 1.0.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Fixed Sidebar */}
            <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col shadow-xs">
                {sidebarContent}
            </aside>

            {/* Mobile Drawer */}
            {isOpenMobile && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={onCloseMobile}
                    />

                    {/* Drawer container */}
                    <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-white shadow-2xl transition-transform">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
}
