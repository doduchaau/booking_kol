import React, { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Bell,
    BellOff,
    Check,
    CheckCheck,
    Clock,
    AlertTriangle,
    ShieldAlert,
    Truck,
    Video,
    UserCheck,
    Trash2,
    Loader2,
    ChevronRight,
    Sparkles,
    X,
} from 'lucide-react';

export interface NotificationItemData {
    id: string;
    title: string;
    message: string;
    category: 'shipment' | 'video' | 'assignment' | 'deadline' | 'risk' | 'system' | string;
    icon?: string;
    url?: string | null;
    read_at?: string | null;
    is_unread: boolean;
    created_at: string;
    created_at_raw?: string | null;
    data?: Record<string, any>;
}

export default function NotificationDropdown() {
    const pageProps = usePage().props as any;
    const initialUnread = pageProps.auth?.unread_notifications_count ?? 0;

    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState<number>(initialUnread);
    const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
    
    // Live Real-Time Toast State
    const [liveToast, setLiveToast] = useState<NotificationItemData | null>(null);
    const lastNotifiedIdRef = useRef<string | null>(null);
    const isInitialMountRef = useRef<boolean>(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Phát âm thanh chuông "ding" nhẹ bằng Web Audio API
    const playNotificationChime = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5 note
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5 note

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.45);
        } catch {
            // Trình duyệt chưa cho phép audio autoplay hoặc lỗi context
        }
    };

    // Đồng bộ unreadCount với Inertia pageProps khi chuyển trang
    useEffect(() => {
        if (typeof pageProps.auth?.unread_notifications_count === 'number') {
            setUnreadCount(pageProps.auth.unread_notifications_count);
        }
    }, [pageProps.auth?.unread_notifications_count]);

    // Tải danh sách thông báo đầy đủ
    const fetchNotifications = async (filter = activeTab, silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await axios.get('/notifications', {
                params: { filter, limit: 30 },
            });
            if (res.data?.success) {
                setNotifications(res.data.notifications || []);
                setUnreadCount(res.data.unread_count ?? 0);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Kiểm tra định kỳ thông báo mới siêu nhẹ (< 2ms)
    const checkNewNotifications = async () => {
        // Nếu tab đang bị ẩn trong nền thì bỏ qua để tiết kiệm tài nguyên
        if (typeof document !== 'undefined' && document.hidden) return;

        try {
            const res = await axios.get('/notifications/check-new');
            if (res.data?.success) {
                const newUnread = res.data.unread_count ?? 0;
                const latest = res.data.latest as NotificationItemData | null;

                if (latest && latest.id) {
                    // Nếu là thông báo mới xuất hiện sau khi mount và số chưa đọc tăng lên
                    if (
                        !isInitialMountRef.current &&
                        latest.id !== lastNotifiedIdRef.current &&
                        newUnread > unreadCount
                    ) {
                        setLiveToast(latest);
                        playNotificationChime();

                        // Nếu dropdown đang mở thì cập nhật lại danh sách ngay lập tức
                        if (isOpen) {
                            fetchNotifications(activeTab, true);
                        }
                    }
                    lastNotifiedIdRef.current = latest.id;
                }

                setUnreadCount(newUnread);
                isInitialMountRef.current = false;
            }
        } catch {
            // Lỗi mạng hoặc sandbox thì bỏ qua im lặng
        }
    };

    // Cơ chế Real-Time Polling thông minh mỗi 5 giây
    useEffect(() => {
        checkNewNotifications();

        const interval = setInterval(() => {
            checkNewNotifications();
        }, 5000);

        // Khi người dùng chuyển tab quay lại, kiểm tra tức thì
        const handleFocus = () => checkNewNotifications();
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [unreadCount, isOpen, activeTab]);

    // Tự động tắt Live Toast sau 8 giây
    useEffect(() => {
        if (liveToast) {
            const timer = setTimeout(() => {
                setLiveToast(null);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [liveToast]);

    // Khi mở dropdown hoặc đổi tab thì tải danh sách
    useEffect(() => {
        if (isOpen) {
            fetchNotifications(activeTab);
        }
    }, [isOpen, activeTab]);

    // Click outside & Escape key listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Bấm vào thông báo: Đánh dấu đã đọc và điều hướng thẳng tới KOC được cô lập
    const handleNotificationClick = async (item: NotificationItemData) => {
        if (item.is_unread) {
            // Optimistic update
            setNotifications(prev =>
                prev.map(n => (n.id === item.id ? { ...n, is_unread: false, read_at: new Date().toISOString() } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));

            try {
                await axios.patch(`/notifications/${item.id}/read`);
            } catch (err) {
                console.error('Error marking read:', err);
            }
        }

        setIsOpen(false);
        setLiveToast(null);

        if (item.url) {
            router.visit(item.url);
        }
    };

    // Đánh dấu tất cả là đã đọc
    const handleMarkAllRead = async () => {
        if (unreadCount === 0 || isMarkingAll) return;
        setIsMarkingAll(true);

        setNotifications(prev =>
            prev.map(n => ({ ...n, is_unread: false, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);

        try {
            await axios.post('/notifications/mark-all-read');
        } catch (err) {
            console.error('Error marking all as read:', err);
            fetchNotifications(activeTab, true);
        } finally {
            setIsMarkingAll(false);
        }
    };

    // Xóa thông báo
    const handleDeleteNotification = async (e: React.MouseEvent, id: string, isUnread: boolean) => {
        e.stopPropagation();

        setNotifications(prev => prev.filter(n => n.id !== id));
        if (isUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        try {
            await axios.delete(`/notifications/${id}`);
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    // Render icon danh mục
    const renderCategoryIcon = (category: string, iconName?: string) => {
        switch (category) {
            case 'shipment':
                return (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70">
                        <Truck className="h-4 w-4" />
                    </div>
                );
            case 'video':
                return (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-200/70">
                        <Video className="h-4 w-4" />
                    </div>
                );
            case 'assignment':
                return (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/70">
                        <UserCheck className="h-4 w-4" />
                    </div>
                );
            case 'deadline':
                return iconName === 'AlertTriangle' ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/70">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/70">
                        <Clock className="h-4 w-4" />
                    </div>
                );
            case 'risk':
                return (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/70">
                        <ShieldAlert className="h-4 w-4" />
                    </div>
                );
            default:
                return (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/70">
                        <Bell className="h-4 w-4" />
                    </div>
                );
        }
    };

    return (
        <>
            {/* FLOATING REAL-TIME TOAST BANNER KHI CÓ THÔNG BÁO MỚI */}
            {liveToast && (
                <div
                    className="fixed top-20 right-5 z-50 w-[360px] sm:w-[400px] rounded-2xl border border-primary-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md ring-1 ring-slate-900/10 animate-in fade-in slide-in-from-top-4 duration-300"
                    role="alert"
                >
                    <div className="flex items-start gap-3">
                        {renderCategoryIcon(liveToast.category, liveToast.icon)}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-extrabold text-primary-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-ping" />
                                    Vừa nhận thông báo mới
                                </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                {liveToast.title}
                            </h4>
                            <p className="text-[12px] text-slate-600 line-clamp-2 mt-0.5">
                                {liveToast.message}
                            </p>
                            <div className="mt-2.5 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleNotificationClick({ ...liveToast, is_unread: true })}
                                    className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-700 transition-colors"
                                >
                                    <span>Xem chi tiết ngay</span>
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLiveToast(null)}
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Bỏ qua
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setLiveToast(null)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Bell Trigger Button */}
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative rounded-xl p-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
                        isOpen
                            ? 'bg-primary-50 text-primary-700 shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    aria-label="Thông báo hệ thống"
                    title={unreadCount > 0 ? `${unreadCount} thông báo mới` : 'Thông báo'}
                >
                    <Bell className="h-5 w-5" />

                    {/* Animated Unread Badge */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-in zoom-in-50 duration-200">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Popover Dropdown */}
                {isOpen && (
                    <div
                        className="absolute right-0 mt-2 w-[340px] sm:w-[420px] origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                        role="dialog"
                        aria-label="Hộp thư thông báo"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">Thông báo</h3>
                                {unreadCount > 0 ? (
                                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                        {unreadCount} mới
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                        Tất cả đã đọc
                                    </span>
                                )}
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    disabled={isMarkingAll}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800 disabled:opacity-50 transition-colors"
                                >
                                    {isMarkingAll ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <CheckCheck className="h-3.5 w-3.5" />
                                    )}
                                    <span>Đọc tất cả</span>
                                </button>
                            )}
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex border-b border-slate-100 bg-white px-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('all')}
                                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                                    activeTab === 'all'
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <span>Tất cả</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('unread')}
                                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                                    activeTab === 'unread'
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <span>Chưa đọc</span>
                                {unreadCount > 0 && (
                                    <span className="rounded-full bg-primary-100 px-1.5 py-0.2 text-[10px] font-bold text-primary-700">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary-600 mb-2" />
                                    <p className="text-xs">Đang tải thông báo...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                                        <BellOff className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800">Không có thông báo nào</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                                        {activeTab === 'unread'
                                            ? 'Bạn đã đọc toàn bộ thông báo gần đây.'
                                            : 'Hiện tại hệ thống chưa có sự kiện hoặc cảnh báo mới nào.'}
                                    </p>
                                </div>
                            ) : (
                                notifications.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleNotificationClick(item)}
                                        className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors duration-150 ${
                                            item.is_unread
                                                ? 'bg-primary-50/40 hover:bg-primary-50/70'
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        {/* Category Icon */}
                                        {renderCategoryIcon(item.category, item.icon)}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <p
                                                    className={`text-xs leading-snug line-clamp-1 ${
                                                        item.is_unread
                                                            ? 'font-bold text-slate-900'
                                                            : 'font-medium text-slate-700'
                                                    }`}
                                                >
                                                    {item.title}
                                                </p>
                                            </div>
                                            <p className="text-[12px] leading-relaxed text-slate-600 line-clamp-2">
                                                {item.message}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {item.created_at}
                                                </span>
                                                {item.url && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary-600 group-hover:underline">
                                                        <span>Chi tiết</span>
                                                        <ChevronRight className="h-2.5 w-2.5" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Hover Controls */}
                                        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={e => handleDeleteNotification(e, item.id, item.is_unread)}
                                                className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-rose-600 transition-colors"
                                                title="Xóa thông báo"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {/* Unread dot indicator */}
                                        {item.is_unread && (
                                            <div className="absolute right-3.5 top-5 h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white group-hover:opacity-0 transition-opacity" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-center">
                            <p className="text-[11px] text-slate-400">
                                Tự động cập nhật real-time & âm thanh thông báo
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
