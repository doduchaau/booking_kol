import React from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import PageHeader from '@/Components/Common/PageHeader';
import Badge from '@/Components/Common/Badge';
import { User, Mail, Phone, Calendar, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

interface ProfileEditProps {
    mustVerifyEmail: boolean;
    status?: string;
    profileUser?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        is_active?: boolean;
        roles?: string[];
        created_at?: string;
    };
}

export default function Edit({
    mustVerifyEmail,
    status,
    profileUser,
}: ProfileEditProps) {
    const authUser = usePage<PageProps>().props.auth.user;
    const user = profileUser || {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        phone: authUser.phone || '',
        is_active: authUser.is_active ?? true,
        roles: authUser.roles || ['Staff'],
        created_at: authUser.created_at || 'Mặc định',
    };

    const roles = user.roles || ['Staff'];
    const primaryRole = roles[0] || 'Staff';

    return (
        <AppLayout title="Hồ Sơ Cá Nhân">
            <Head title="Hồ Sơ Cá Nhân" />

            <div className="space-y-6 max-w-6xl mx-auto">
                {/* Header trang */}
                <PageHeader
                    title="Hồ Sơ Tài Khoản"
                    description="Quản lý thông tin định danh, cập nhật số điện thoại và thay đổi mật khẩu bảo mật tài khoản."
                    breadcrumbs={[
                        { label: 'Trang chủ', href: route('dashboard') },
                        { label: 'Hồ Sơ Cá Nhân' },
                    ]}
                />

                {/* Bố cục 2 cột */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Cột trái: Thẻ tóm tắt thông tin tài khoản */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm text-center">
                            {/* Avatar */}
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-extrabold text-2xl ring-4 ring-primary-500/10 shadow-inner">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>

                            {/* Tên & Email */}
                            <h3 className="mt-4 text-lg font-bold text-slate-900">
                                {user.name}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                                {user.email}
                            </p>

                            {/* Vai trò & Trạng thái */}
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                                <Badge
                                    variant={
                                        primaryRole === 'Admin'
                                            ? 'danger'
                                            : primaryRole === 'Leader'
                                            ? 'primary'
                                            : 'success'
                                    }
                                    size="sm"
                                >
                                    {primaryRole === 'Admin'
                                        ? 'Quản Trị Viên (Admin)'
                                        : primaryRole === 'Leader'
                                        ? 'Trưởng Nhóm (Leader)'
                                        : 'Nhân Viên (Staff)'}
                                </Badge>

                                {user.is_active ? (
                                    <Badge variant="success" size="sm">
                                        <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                                        Hoạt Động
                                    </Badge>
                                ) : (
                                    <Badge variant="danger" size="sm">
                                        Tạm Khóa
                                    </Badge>
                                )}
                            </div>

                            {/* Danh sách thông tin chi tiết */}
                            <div className="mt-6 border-t border-slate-100 pt-4 text-left text-xs space-y-3 text-slate-600">
                                <div className="flex items-center gap-2.5">
                                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span>
                                        SĐT: <strong className="text-slate-800">{user.phone || 'Chưa cập nhật'}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                        Email: <strong className="text-slate-800">{user.email}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span>
                                        Tham gia: <strong className="text-slate-800">{user.created_at || 'Mặc định'}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Hộp ghi chú bảo mật nội bộ */}
                        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-5 text-xs text-slate-600 space-y-2">
                            <div className="flex items-center gap-2 text-primary-700 font-bold">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Chính Sách Bảo Mật CRM</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-500">
                                Tài khoản nhân sự được quản lý theo mô hình phân quyền nội bộ. Nhân sự không tự xóa tài khoản hoặc chuyển giao phân quyền. Để đổi vai trò hoặc cấp thêm quyền, vui lòng liên hệ Trưởng nhóm hoặc Quản trị viên.
                            </p>
                        </div>
                    </div>

                    {/* Cột phải: 2 Form thao tác */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Form 1: Cập nhật thông tin cá nhân */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                                profileUser={user}
                            />
                        </div>

                        {/* Form 2: Đổi mật khẩu cá nhân */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                            <UpdatePasswordForm />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
