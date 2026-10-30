import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Menu, Bell, User, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import Dropdown from '@/Components/Dropdown';

export interface TopbarProps {
    onOpenMobileSidebar: () => void;
}

export default function Topbar({ onOpenMobileSidebar }: TopbarProps) {
    // @ts-ignore
    const user = usePage().props.auth?.user || { name: 'Người dùng', email: 'user@example.com' };

    return (
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
            {/* Left section: Hamburger for mobile + Brand in mobile */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onOpenMobileSidebar}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden"
                    title="Mở menu điều hướng"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 md:hidden">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-white shadow-xs">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">KOL Booking</span>
                </div>
            </div>

            {/* Right section: Notifications & User profile */}
            <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <button
                    type="button"
                    className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    title="Thông báo"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white" />
                </button>

                {/* Vertical Divider */}
                <div className="h-5 w-px bg-slate-200" />

                {/* User Dropdown */}
                <Dropdown>
                    <Dropdown.Trigger>
                        <button
                            type="button"
                            className="flex items-center gap-2.5 rounded-lg p-1.5 text-left text-sm transition-colors hover:bg-slate-50 focus:outline-none"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs ring-2 ring-primary-500/20">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="hidden text-left sm:block">
                                <div className="text-xs font-semibold text-slate-900 leading-tight">
                                    {user.name}
                                </div>
                                <div className="text-[11px] text-slate-500 leading-tight">
                                    {user.email}
                                </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                        </button>
                    </Dropdown.Trigger>

                    <Dropdown.Content align="right" width="48">
                        <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                            <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>

                        <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2 text-xs">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>Thông tin cá nhân</span>
                        </Dropdown.Link>

                        <Dropdown.Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center gap-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>Đăng xuất</span>
                        </Dropdown.Link>
                    </Dropdown.Content>
                </Dropdown>
            </div>
        </header>
    );
}
