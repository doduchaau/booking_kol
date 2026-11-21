import React, { FormEventHandler } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import { User as UserIcon, Mail, Phone, Save, Shield } from 'lucide-react';
import { PageProps } from '@/types';

export interface UpdateProfileInformationProps {
    mustVerifyEmail?: boolean;
    status?: string;
    className?: string;
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

export default function UpdateProfileInformation({
    className = '',
    profileUser,
}: UpdateProfileInformationProps) {
    const pageUser = usePage<PageProps>().props.auth.user;
    const initialName = profileUser?.name ?? pageUser.name ?? '';
    const initialEmail = profileUser?.email ?? pageUser.email ?? '';
    const initialPhone = profileUser?.phone ?? pageUser.phone ?? '';
    const roles = profileUser?.roles ?? pageUser.roles ?? ['Staff'];

    const { data, setData, patch, errors, processing } = useForm({
        name: initialName,
        email: initialEmail,
        phone: initialPhone,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'), {
            preserveScroll: true,
        });
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary-600" />
                    <h2 className="text-base font-bold text-slate-900">
                        Thông Tin Tài Khoản
                    </h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                    Cập nhật thông tin định danh, email liên hệ và số điện thoại điều phối công việc của bạn.
                </p>
            </header>

            <form onSubmit={submit} className="space-y-4">
                {/* Vai trò tài khoản - chỉ đọc */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-slate-400" />
                            Vai trò phân quyền hệ thống:
                        </span>
                        <div className="flex items-center gap-1.5">
                            {roles.map((r, idx) => (
                                <Badge
                                    key={idx}
                                    variant={r === 'Admin' ? 'danger' : r === 'Leader' ? 'primary' : 'success'}
                                    size="sm"
                                >
                                    {r === 'Admin' ? 'Quản Trị Viên (Admin)' : r === 'Leader' ? 'Trưởng Nhóm (Leader)' : 'Nhân Viên (Staff)'}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Họ và tên */}
                    <FormField
                        id="name"
                        label="Họ và tên"
                        required
                        error={errors.name}
                        hint="Tên đầy đủ hiển thị trong toàn bộ hoạt động CRM"
                    >
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            iconLeft={<UserIcon className="h-4 w-4" />}
                            placeholder="Nguyễn Văn A"
                            error={Boolean(errors.name)}
                        />
                    </FormField>

                    {/* Số điện thoại */}
                    <FormField
                        id="phone"
                        label="Số điện thoại / Zalo"
                        error={errors.phone}
                        hint="Định dạng 10 chữ số (VD: 0912345678)"
                    >
                        <TextInput
                            id="phone"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            iconLeft={<Phone className="h-4 w-4" />}
                            placeholder="0912345678"
                            error={Boolean(errors.phone)}
                        />
                    </FormField>
                </div>

                {/* Email đăng nhập */}
                <FormField
                    id="email"
                    label="Địa chỉ Email đăng nhập"
                    required
                    error={errors.email}
                    hint="Email này dùng để đăng nhập và nhận thông báo công việc từ hệ thống"
                >
                    <TextInput
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        iconLeft={<Mail className="h-4 w-4" />}
                        placeholder="ten.nguoidung@congty.com"
                        error={Boolean(errors.email)}
                    />
                </FormField>

                <div className="flex items-center justify-end pt-2">
                    <Button
                        type="submit"
                        variant="primary"
                        loading={processing}
                        loadingText="Đang lưu thay đổi..."
                        iconLeft={<Save className="h-4 w-4" />}
                    >
                        Lưu Thay Đổi
                    </Button>
                </div>
            </form>
        </section>
    );
}
