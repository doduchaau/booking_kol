import React, { PropsWithChildren, ReactNode, useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Navigation/Sidebar';
import Topbar from '@/Components/Navigation/Topbar';
import Toast from '@/Components/Common/Toast';

export interface AppLayoutProps {
    title?: string;
    header?: ReactNode;
}

export default function AppLayout({
    title,
    header,
    children,
}: PropsWithChildren<AppLayoutProps>) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    // @ts-ignore
    const { flash } = usePage().props as {
        flash?: {
            success?: string;
            error?: string;
            warning?: string;
            info?: string;
        };
    };

    const [activeToast, setActiveToast] = useState<{
        type: 'success' | 'error' | 'warning' | 'info';
        message: string;
    } | null>(null);

    useEffect(() => {
        if (flash?.success) {
            setActiveToast({ type: 'success', message: flash.success });
        } else if (flash?.error) {
            setActiveToast({ type: 'error', message: flash.error });
        } else if (flash?.warning) {
            setActiveToast({ type: 'warning', message: flash.warning });
        } else if (flash?.info) {
            setActiveToast({ type: 'info', message: flash.info });
        }
    }, [flash]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
            {title && <Head title={title} />}

            {/* Sidebar điều hướng */}
            <Sidebar
                isOpenMobile={isMobileSidebarOpen}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main content wrapper với lề trái bù cho Sidebar trên desktop */}
            <div className="flex flex-col min-h-screen md:pl-64 transition-all duration-200">
                {/* Header sticky trên cùng */}
                <Topbar onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />

                {/* Legacy Header Slot nếu trang con truyền vào */}
                {header && (
                    <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
                        {header}
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                </main>
            </div>

            {/* Toast Container góc trên bên phải */}
            {activeToast && (
                <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
                    <Toast
                        type={activeToast.type}
                        message={activeToast.message}
                        onClose={() => setActiveToast(null)}
                    />
                </div>
            )}
        </div>
    );
}
