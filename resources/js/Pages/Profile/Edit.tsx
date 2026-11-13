import React from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import PageHeader from '@/Components/Common/PageHeader';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AppLayout title="Hồ Sơ Cá Nhân">
            <Head title="Hồ Sơ Cá Nhân" />

            <div className="space-y-6">
                <PageHeader
                    title="Hồ Sơ Tài Khoản"
                    description="Quản lý thông tin cá nhân, cập nhật mật khẩu và bảo mật tài khoản nhân viên."
                />

                <div className="space-y-6 max-w-4xl">
                    <div className="bg-white p-6 shadow-sm border border-slate-200/80 rounded-2xl">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="bg-white p-6 shadow-sm border border-slate-200/80 rounded-2xl">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="bg-white p-6 shadow-sm border border-slate-200/80 rounded-2xl">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
