import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm } from '@inertiajs/react';
import {
    Settings as SettingsIcon,
    Users,
    Shield,
    Clock,
    Key,
    PackageCheck,
    MessageSquare,
    Plus,
    Check,
    AlertCircle,
    Eye,
    EyeOff,
    CheckCircle2,
    Lock,
    UserCheck,
    Info,
    Sparkles,
    Globe,
    RefreshCw,
    ExternalLink,
    Share2,
    Radio,
    Phone,
    KeyRound,
    Copy,
    Edit2,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import Modal from '@/Components/Modal';

export interface UserItem {
    id: number;
    name: string;
    email: string;
    phone?: string;
    is_active?: boolean;
    roles: string[];
    created_at?: string;
}

export interface SettingsData {
    default_video_deadline_days: number;
    blacklist_penalty_score: number;
    default_sample_shipping_note?: string;
    zalo_oa_app_id: string;
    zalo_oa_secret_key: string;
    zalo_oa_id: string;
    groq_api_key?: string;
    openai_api_key?: string;
    social_data_provider_driver?: string;
    social_data_provider_api_key?: string;
    social_data_provider_api_host?: string;
    youtube_api_key?: string;
    facebook_client_token?: string;
    portal_token_expire_days?: number;
    portal_token_extend_days?: number;
    portal_support_contact?: string;
    portal_expired_custom_message?: string;
    portal_allow_edit_address_after_confirm?: boolean;
    portal_allow_multiple_videos?: boolean;
}

export interface SettingsIndexProps {
    settings: SettingsData;
    users: UserItem[];
    availableRoles: string[];
}

export default function SettingsIndex({
    settings,
    users,
    availableRoles,
}: SettingsIndexProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'general' | 'portal' | 'integrations'>('users');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [editingUserRole, setEditingUserRole] = useState<UserItem | null>(null);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [resettingUserPassword, setResettingUserPassword] = useState<UserItem | null>(null);
    const [generatedPassword, setGeneratedPassword] = useState<string>('');
    const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

    // Visibility toggles for sensitive fields
    const [showZaloSecret, setShowZaloSecret] = useState(false);
    const [showGroqKey, setShowGroqKey] = useState(false);
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);
    const [showRapidApiKey, setShowRapidApiKey] = useState(false);
    const [showYoutubeKey, setShowYoutubeKey] = useState(false);
    const [showFacebookToken, setShowFacebookToken] = useState(false);

    // API Testing State
    const [testingTarget, setTestingTarget] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

    // Form: General Settings
    const generalForm = useForm({
        default_video_deadline_days: settings.default_video_deadline_days || 7,
        blacklist_penalty_score: settings.blacklist_penalty_score || 30,
        default_sample_shipping_note: settings.default_sample_shipping_note || 'Hàng mẫu tặng KOC quay video review - Không thu tiền COD',
    });

    // Form: Portal Settings
    const portalForm = useForm({
        portal_token_expire_days: settings.portal_token_expire_days ?? 30,
        portal_token_extend_days: settings.portal_token_extend_days ?? 14,
        portal_support_contact: settings.portal_support_contact || '',
        portal_expired_custom_message: settings.portal_expired_custom_message || '',
        portal_allow_edit_address_after_confirm: settings.portal_allow_edit_address_after_confirm ?? true,
        portal_allow_multiple_videos: settings.portal_allow_multiple_videos ?? true,
    });

    // Form: Integrations
    const integrationForm = useForm({
        zalo_oa_app_id: settings.zalo_oa_app_id || '',
        zalo_oa_secret_key: settings.zalo_oa_secret_key ? '••••••••••••••••' : '',
        zalo_oa_id: settings.zalo_oa_id || '',
        groq_api_key: settings.groq_api_key ? '••••••••••••••••' : '',
        openai_api_key: settings.openai_api_key ? '••••••••••••••••' : '',
        social_data_provider_driver: settings.social_data_provider_driver || 'sandbox',
        social_data_provider_api_key: settings.social_data_provider_api_key ? '••••••••••••••••' : '',
        social_data_provider_api_host: settings.social_data_provider_api_host || 'tiktok-api23.p.rapidapi.com',
        youtube_api_key: settings.youtube_api_key ? '••••••••••••••••' : '',
        facebook_client_token: settings.facebook_client_token ? '••••••••••••••••' : '',
    });

    const handleTestConnection = async (target: 'rapidapi' | 'youtube' | 'groq' | 'openai') => {
        setTestingTarget(target);
        try {
            let apiKey = '';
            let apiHost = '';
            if (target === 'rapidapi') {
                apiKey = integrationForm.data.social_data_provider_api_key;
                apiHost = integrationForm.data.social_data_provider_api_host;
            } else if (target === 'youtube') {
                apiKey = integrationForm.data.youtube_api_key;
            } else if (target === 'groq') {
                apiKey = integrationForm.data.groq_api_key;
            } else if (target === 'openai') {
                apiKey = integrationForm.data.openai_api_key;
            }

            // @ts-ignore
            const url = typeof route === 'function' ? route('settings.integrations.test') : '/settings/integrations/test';
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    target,
                    api_key: apiKey,
                    api_host: apiHost,
                }),
            });

            const data = await response.json();
            setTestResults((prev) => ({
                ...prev,
                [target]: {
                    success: !!data.success,
                    message: data.message || (data.success ? 'Kết nối thành công!' : 'Kết nối thất bại'),
                },
            }));
        } catch (err: any) {
            setTestResults((prev) => ({
                ...prev,
                [target]: {
                    success: false,
                    message: 'Lỗi mạng hoặc server không phản hồi: ' + (err.message || 'Lỗi không xác định'),
                },
            }));
        } finally {
            setTestingTarget(null);
        }
    };

    // Form: Create User
    const createUserForm = useForm({
        name: '',
        email: '',
        password: '',
        role: 'Staff',
    });

    // Form: Update Role
    const roleForm = useForm({
        role: 'Staff',
    });

    const handleSaveGeneral = (e: React.FormEvent) => {
        e.preventDefault();
        // @ts-ignore
        generalForm.post(route('settings.general.update'), {
            preserveScroll: true,
        });
    };

    const handleSavePortal = (e: React.FormEvent) => {
        e.preventDefault();
        // @ts-ignore
        portalForm.post(route('settings.portal.update'), {
            preserveScroll: true,
        });
    };

    const handleSaveIntegrations = (e: React.FormEvent) => {
        e.preventDefault();
        // @ts-ignore
        integrationForm.post(route('settings.integrations.update'), {
            preserveScroll: true,
        });
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        // @ts-ignore
        createUserForm.post(route('settings.users.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddUserModalOpen(false);
                createUserForm.reset();
            },
        });
    };

    const handleUpdateUserRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUserRole) return;

        // @ts-ignore
        roleForm.put(route('settings.users.role.update', editingUserRole.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingUserRole(null);
            },
        });
    };

    const openEditRoleModal = (user: UserItem) => {
        setEditingUserRole(user);
        roleForm.setData('role', user.roles[0] || 'Staff');
    };

    // Form: Edit User Information
    const editUserForm = useForm({
        name: '',
        email: '',
        phone: '',
        is_active: true,
    });

    const openEditUserModal = (user: UserItem) => {
        setEditingUser(user);
        editUserForm.setData({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            is_active: user.is_active ?? true,
        });
        editUserForm.clearErrors();
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        // @ts-ignore
        editUserForm.put(route('settings.users.update', editingUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingUser(null);
            },
        });
    };

    // Form: Reset Password for User
    const resetPasswordForm = useForm({
        password: '',
        password_confirmation: '',
    });

    const openResetPasswordModal = (user: UserItem) => {
        setResettingUserPassword(user);
        resetPasswordForm.reset();
        resetPasswordForm.clearErrors();
        setGeneratedPassword('');
        setCopiedPassword(false);
    };

    const generateRandomPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        let randomStr = '';
        for (let i = 0; i < 8; i++) {
            randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const newPass = `KOL@${randomStr}`;
        setGeneratedPassword(newPass);
        resetPasswordForm.setData({
            password: newPass,
            password_confirmation: newPass,
        });
    };

    const copyToClipboard = () => {
        if (!generatedPassword) return;
        navigator.clipboard.writeText(generatedPassword);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 3000);
    };

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resettingUserPassword) return;
        // @ts-ignore
        resetPasswordForm.put(route('settings.users.password.reset', resettingUserPassword.id), {
            preserveScroll: true,
            onSuccess: () => {
                setResettingUserPassword(null);
            },
        });
    };

    return (
        <AppLayout title="Cài Đặt Hệ Thống & Phân Quyền">
            <Head title="Cài Đặt Hệ Thống & Phân Quyền" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* 1. Header */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-primary-50 text-primary-600">
                                <SettingsIcon className="h-6 w-6" />
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Cài Đặt Hệ Thống & Phân Quyền
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Quản lý danh sách nhân sự, phân bổ vai trò và cấu hình quy trình nộp video, kết nối Zalo OA và Hãng vận chuyển.
                        </p>
                    </div>
                </div>

                {/* 2. Navigation Tabs */}
                <div className="flex border-b border-slate-200 gap-2 bg-white px-6 pt-3 rounded-xl shadow-sm">
                    <button
                        type="button"
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'users'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        <span>Nhân Sự & Phân Quyền ({users.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'general'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Clock className="h-4 w-4" />
                        <span>Thời Hạn & Quy Trình</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('portal')}
                        className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'portal'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span>Cổng Portal KOC</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('integrations')}
                        className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'integrations'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Key className="h-4 w-4" />
                        <span>Tích Hợp API & Bảo Mật</span>
                    </button>
                </div>

                {/* 3. TAB CONTENT */}

                {/* TAB 1: NHÂN SỰ & PHÂN QUYỀN */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {/* Summary & Add Button */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary-600" />
                                    <span>Danh Sách Nhân Sự & Vai Trò</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Kiểm soát quyền truy cập chi tiết: Staff chỉ sửa KOC được gán; Leader/Admin duyệt ngân sách và xóa chiến dịch.
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                iconLeft={<Plus className="h-4 w-4" />}
                                onClick={() => setIsAddUserModalOpen(true)}
                            >
                                Thêm Nhân Viên Mới
                            </Button>
                        </div>

                        {/* Users Table */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3.5">Họ & Tên</th>
                                            <th className="px-5 py-3.5">Email & SĐT</th>
                                            <th className="px-5 py-3.5 text-center">Trạng Thái</th>
                                            <th className="px-5 py-3.5">Vai Trò (Role)</th>
                                            <th className="px-5 py-3.5">Phạm Vi Quyền Hạn</th>
                                            <th className="px-5 py-3.5 text-center">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map((user) => {
                                            const role = user.roles[0] || 'Staff';
                                            const isActive = user.is_active ?? true;
                                            return (
                                                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900">
                                                                    {user.name}
                                                                </div>
                                                                <div className="text-xs text-slate-400">
                                                                    Tạo ngày: {user.created_at || 'Mặc định'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="font-mono text-xs text-slate-700 font-medium">
                                                            {user.email}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                                            <span>{user.phone || 'Chưa cập nhật SĐT'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        {isActive ? (
                                                            <Badge variant="success" size="sm">
                                                                Hoạt Động
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="danger" size="sm">
                                                                Đã Khóa
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {role === 'Admin' && (
                                                            <Badge variant="danger" size="sm">
                                                                Quản Trị Viên (Admin)
                                                            </Badge>
                                                        )}
                                                        {role === 'Leader' && (
                                                            <Badge variant="primary" size="sm">
                                                                Trưởng Nhóm (Leader)
                                                            </Badge>
                                                        )}
                                                        {role === 'Staff' && (
                                                            <Badge variant="success" size="sm">
                                                                Nhân Viên (Staff)
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-slate-500 max-w-xs">
                                                        {role === 'Admin' && (
                                                            <span className="text-rose-700 font-medium">
                                                                Toàn quyền hệ thống: Cấu hình, phân quyền, duyệt ngân sách, xóa chiến dịch.
                                                            </span>
                                                        )}
                                                        {role === 'Leader' && (
                                                            <span className="text-primary-700 font-medium">
                                                                Quản lý toàn bộ chiến dịch: Duyệt ngân sách, xóa chiến dịch, phân công KOC.
                                                            </span>
                                                        )}
                                                        {role === 'Staff' && (
                                                            <span className="text-slate-600">
                                                                Chỉ xem & cập nhật các KOC trong chiến dịch mà mình được phân công.
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditUserModal(user)}
                                                                title="Chỉnh sửa thông tin nhân sự"
                                                            >
                                                                Sửa
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => openEditRoleModal(user)}
                                                                title="Đổi vai trò phân quyền"
                                                            >
                                                                Vai Trò
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => openResetPasswordModal(user)}
                                                                title="Đặt lại mật khẩu cho nhân sự"
                                                            >
                                                                Đổi MK
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Role Matrix Explainer */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary-600" />
                                <span>Bảng Quy Định Phân Quyền Vai Trò (RBAC Matrix)</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <Badge variant="success" size="sm">Staff (Nhân viên)</Badge>
                                    </div>
                                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                                        <li>Xem danh sách Creator CRM</li>
                                        <li>Xem & sửa KOC được gán cho mình</li>
                                        <li>Cập nhật trạng thái liên hệ, gửi mẫu</li>
                                        <li>Nộp video nghiệm thu cho KOC mình phụ trách</li>
                                        <li className="text-rose-500 font-medium">Không thể xóa chiến dịch hoặc duyệt ngân sách</li>
                                    </ul>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <Badge variant="primary" size="sm">Leader (Trưởng nhóm)</Badge>
                                    </div>
                                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                                        <li>Toàn quyền quản lý chiến dịch</li>
                                        <li>Duyệt & sửa ngân sách chiến dịch</li>
                                        <li>Phân công KOC cho nhân viên booking</li>
                                        <li>Duyệt nghiệm thu video & xuất báo cáo ROI</li>
                                        <li>Xóa chiến dịch khi chưa phát sinh chi phí</li>
                                    </ul>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <Badge variant="danger" size="sm">Admin (Quản trị)</Badge>
                                    </div>
                                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                                        <li>Toàn quyền mọi tính năng trong công cụ</li>
                                        <li>Quản lý danh sách nhân sự & đổi vai trò</li>
                                        <li>Cấu hình thời hạn nộp video mặc định</li>
                                        <li>Quản lý khóa API Zalo OA & hãng vận chuyển</li>
                                        <li>Bảo mật & xóa dữ liệu hệ thống</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: CẤU HÌNH QUY TRÌNH & DEADLINE */}
                {activeTab === 'general' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm max-w-2xl">
                        <div className="mb-6">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary-600" />
                                <span>Cài Đặt Thời Hạn Nộp Video Mặc Định</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Cấu hình số ngày đếm ngược hạn nộp video kể từ khi KOC xác nhận đã nhận được sản phẩm mẫu.
                            </p>
                        </div>

                        <form onSubmit={handleSaveGeneral} className="space-y-5">
                            {/* Thời hạn nộp video */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-1">
                                    Thời hạn nộp video mặc định (Ngày)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={generalForm.data.default_video_deadline_days}
                                        onChange={(e) =>
                                            generalForm.setData(
                                                'default_video_deadline_days',
                                                parseInt(e.target.value) || 7
                                            )
                                        }
                                        className="w-36 text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-slate-500">ngày kể từ khi nhận hàng</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    * Mặc định là 7 ngày hoặc 10 ngày. Khi tạo chiến dịch mới, hệ thống sẽ tự động điền giá trị này.
                                </p>
                                {generalForm.errors.default_video_deadline_days && (
                                    <p className="text-xs text-rose-600 mt-1">
                                        {generalForm.errors.default_video_deadline_days}
                                    </p>
                                )}
                            </div>

                            {/* Điểm trừ uy tín bom hàng */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-1">
                                    Điểm uy tín bị trừ khi xảy ra sự cố Bom Hàng (No-show)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={generalForm.data.blacklist_penalty_score}
                                        onChange={(e) =>
                                            generalForm.setData(
                                                'blacklist_penalty_score',
                                                parseInt(e.target.value) || 30
                                            )
                                        }
                                        className="w-36 text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-slate-500">điểm / lần vi phạm</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    * Điểm uy tín khởi đầu là 100. Khi điểm &lt; 40, hệ thống tự động đưa Creator vào danh sách đen (Blacklist).
                                </p>
                            </div>

                            {/* Ghi chú xuất mẫu kho mặc định */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-1">
                                    Ghi chú xuất mẫu mặc định (Kho nội bộ)
                                </label>
                                <textarea
                                    rows={2}
                                    value={generalForm.data.default_sample_shipping_note}
                                    onChange={(e) =>
                                        generalForm.setData('default_sample_shipping_note', e.target.value)
                                    }
                                    placeholder="Ví dụ: Hàng mẫu tặng KOC quay video review - Không thu tiền COD"
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    * Tự động hiển thị làm ghi chú khi nhân viên xác nhận chuyển mẫu hoặc sao chép thông tin gửi cho bộ phận kho.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={generalForm.processing}
                                >
                                    Lưu Cấu Hình Quy Trình
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB 3: CẤU HÌNH CỔNG PORTAL DÀNH CHO KOC */}
                {activeTab === 'portal' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm max-w-3xl space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <ExternalLink className="h-5 w-5 text-primary-600" />
                                <span>Cấu Hình Cổng Portal Dành Cho KOC / KOL</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Quản lý thời hạn truy cập, cơ chế gia hạn link, hotline hỗ trợ và các quyền tương tác của Creator trên Cổng Portal.
                            </p>
                        </div>

                        <form onSubmit={handleSavePortal} className="space-y-6">
                            {/* Khối 1: Thời hạn mặc định của Link Portal */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary-600" />
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Thời Hạn Hiệu Lực Của Link Portal
                                    </h3>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Thời hạn mặc định khi tạo / import KOC vào chiến dịch:
                                    </label>
                                    
                                    {/* Presets nút bấm */}
                                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                                        {[
                                            { days: 7, label: '7 ngày' },
                                            { days: 14, label: '14 ngày' },
                                            { days: 30, label: '30 ngày (Khuyến nghị)' },
                                            { days: 60, label: '60 ngày' },
                                            { days: 90, label: '90 ngày' },
                                            { days: 0, label: 'Vô thời hạn (Không hết hạn)' },
                                        ].map((preset) => {
                                            const isSelected = portalForm.data.portal_token_expire_days === preset.days;
                                            return (
                                                <button
                                                    key={preset.days}
                                                    type="button"
                                                    onClick={() => portalForm.setData('portal_token_expire_days', preset.days)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="365"
                                            value={portalForm.data.portal_token_expire_days}
                                            onChange={(e) =>
                                                portalForm.setData(
                                                    'portal_token_expire_days',
                                                    parseInt(e.target.value) >= 0 ? parseInt(e.target.value) : 0
                                                )
                                            }
                                            className="w-32 text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-semibold text-slate-800"
                                        />
                                        <span className="text-xs text-slate-600">
                                            {portalForm.data.portal_token_expire_days === 0 ? (
                                                <strong className="text-emerald-700">Link không bao giờ hết hạn (Vô thời hạn)</strong>
                                            ) : (
                                                <>ngày kể từ khi tạo link KOC trong chiến dịch</>
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                                        * Nhập <strong>0</strong> nếu bạn muốn đường link hoạt động vĩnh viễn suốt vòng đời chiến dịch mà không bị khóa. Nếu nhập &gt; 0, link sẽ tự động đóng sau số ngày đã đặt vì lý do bảo mật.
                                    </p>
                                    {portalForm.errors.portal_token_expire_days && (
                                        <p className="text-xs text-rose-600 mt-1">
                                            {portalForm.errors.portal_token_expire_days}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-200">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Số ngày gia hạn thêm mỗi lần bấm nút trên Ma trận KOC:
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1"
                                            max="90"
                                            value={portalForm.data.portal_token_extend_days}
                                            onChange={(e) =>
                                                portalForm.setData(
                                                    'portal_token_extend_days',
                                                    parseInt(e.target.value) || 14
                                                )
                                            }
                                            className="w-32 text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-semibold text-slate-800"
                                        />
                                        <span className="text-xs text-slate-600">ngày cộng thêm mỗi lần gia hạn</span>
                                    </div>
                                    {portalForm.errors.portal_token_extend_days && (
                                        <p className="text-xs text-rose-600 mt-1">
                                            {portalForm.errors.portal_token_extend_days}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Khối 2: Thông tin Hỗ trợ & Thông điệp KOC */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-primary-600" />
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Thông Tin Hỗ Trợ & Thông Điệp KOC
                                    </h3>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Số điện thoại / Zalo Hotline CSKH hiển thị trên Cổng Portal:
                                    </label>
                                    <input
                                        type="text"
                                        value={portalForm.data.portal_support_contact}
                                        onChange={(e) => portalForm.setData('portal_support_contact', e.target.value)}
                                        placeholder="Ví dụ: 0987.654.321 (Zalo CSKH Booking KOL)"
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        * Sẽ hiển thị ở chân trang Portal và trong thông báo khi đường link bị hết hạn để KOC liên hệ nhận hỗ trợ.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Thông điệp tùy chỉnh hiển thị khi link Portal hết hạn:
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={portalForm.data.portal_expired_custom_message}
                                        onChange={(e) => portalForm.setData('portal_expired_custom_message', e.target.value)}
                                        placeholder="Ví dụ: Đường dẫn truy cập này đã hết hạn. Vui lòng nhắn tin lại cho nhân viên phụ trách hoặc kết nối Zalo để được cấp lại link mới."
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Khối 3: Quyền Hạn KOC Trên Cổng Portal */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary-600" />
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Quyền Hạn Tương Tác Của KOC
                                    </h3>
                                </div>

                                <div className="space-y-2.5 pt-1">
                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={portalForm.data.portal_allow_edit_address_after_confirm}
                                            onChange={(e) =>
                                                portalForm.setData('portal_allow_edit_address_after_confirm', e.target.checked)
                                            }
                                            className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-800 block">
                                                Cho phép KOC chỉnh sửa lại địa chỉ nhận hàng sau khi đã bấm xác nhận
                                            </span>
                                            <span className="text-[11px] text-slate-500 block">
                                                Nếu tắt, sau khi KOC bấm xác nhận địa chỉ thì form sẽ khóa và chỉ nhân viên booking mới có thể sửa trong hệ thống.
                                            </span>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={portalForm.data.portal_allow_multiple_videos}
                                            onChange={(e) =>
                                                portalForm.setData('portal_allow_multiple_videos', e.target.checked)
                                            }
                                            className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-800 block">
                                                Cho phép KOC nộp thêm link video thứ 2, thứ 3... trong cùng chiến dịch
                                            </span>
                                            <span className="text-[11px] text-slate-500 block">
                                                Phù hợp với các chiến dịch đa nền tảng hoặc yêu cầu lên nhiều video trả bài theo từng tuần/tháng.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={portalForm.processing}
                                >
                                    Lưu Cấu Hình Cổng Portal
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB 3: TÍCH HỢP API & BẢO MẬT */}
                {activeTab === 'integrations' && (
                    <div className="space-y-6 max-w-3xl">
                        {/* Notice */}
                        <div className="bg-indigo-50 border border-indigo-200/80 p-4 rounded-xl flex items-start gap-3">
                            <Lock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-indigo-800 space-y-1">
                                <p className="font-bold">
                                    Bảo Mật Cấp Doanh Nghiệp (Enterprise Encryption):
                                </p>
                                <p>
                                    Toàn bộ Secret Key và Access Token đều được mã hóa bằng thuật toán AES-256-CBC an toàn trước khi lưu vào cơ sở dữ liệu.
                                    Nhân viên booking vận hành tinh gọn, không quản lý vận đơn trực tiếp.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveIntegrations} className="space-y-6">
                            {/* Section 1: Zalo OA */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-primary-600" />
                                        <span>Cấu Hình Kết Nối Zalo Official Account (Zalo OA)</span>
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Dùng cho tính năng gửi tin ZNS và tin chăm sóc KOC tự động qua Zalo Cloud API.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Zalo App ID
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: 123456789012345"
                                            value={integrationForm.data.zalo_oa_app_id}
                                            onChange={(e) =>
                                                integrationForm.setData('zalo_oa_app_id', e.target.value)
                                            }
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Official Account ID (OA ID)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: 987654321098765"
                                            value={integrationForm.data.zalo_oa_id}
                                            onChange={(e) =>
                                                integrationForm.setData('zalo_oa_id', e.target.value)
                                            }
                                            className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Secret Key (Khóa bí mật)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showZaloSecret ? 'text' : 'password'}
                                                placeholder="Nhập khóa Secret Key"
                                                value={integrationForm.data.zalo_oa_secret_key}
                                                onChange={(e) =>
                                                    integrationForm.setData('zalo_oa_secret_key', e.target.value)
                                                }
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowZaloSecret(!showZaloSecret)}
                                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                            >
                                                {showZaloSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Quy Chuẩn Quản Lý Mẫu Thử Tinh Gọn (Zero-Shipment Standard) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <PackageCheck className="h-5 w-5 text-emerald-600" />
                                            <span>Quy Chuẩn Quản Lý Mẫu Thử Tinh Gọn (Zero-Shipment Standard)</span>
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Hệ thống quản lý quy trình gửi mẫu nội bộ tinh gọn, không tích hợp hãng vận chuyển thứ ba.
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Chuẩn Tinh Gọn
                                    </span>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <p>
                                            <strong className="text-slate-800">Quy trình 3 bước khép kín:</strong> KOC xác nhận địa chỉ qua Portal (<code className="text-primary-700 bg-primary-50 px-1 py-0.5 rounded font-mono">address_confirmed</code>) → Nhân viên sao chép thông tin gửi bộ phận Kho nội bộ đóng gói & xuất mẫu (<code className="text-primary-700 bg-primary-50 px-1 py-0.5 rounded font-mono">sample_sent</code>) → KOC xác nhận 1-chạm đã nhận mẫu trên điện thoại (<code className="text-primary-700 bg-primary-50 px-1 py-0.5 rounded font-mono">sample_received</code>) để kích hoạt đếm ngược hạn chót lên video.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <p>
                                            <strong className="text-slate-800">Không tạo mã vận đơn:</strong> Nhân viên booking tập trung 100% vào quan hệ hợp tác và đôn đốc chất lượng video, việc giao vận thực tế do bộ phận kho hoặc đối tác fulfillment bên ngoài độc lập xử lý.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* TẦNG 3 AI SMART SCHEMA MAPPER (GROQ & OPENAI) */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-primary-600">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                Tầng 3 AI Smart Schema Mapper (Groq & OpenAI)
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Cấu hình API Key để kích hoạt AI tự động nhận diện và ánh xạ các cột phức tạp trong file Excel báo giá Agency
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Mã hóa AES-256
                                    </span>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Groq API Key (Llama 3.1 8B Instant - Khuyến nghị vì tốc độ siêu nhanh & miễn phí)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showGroqKey ? 'text' : 'password'}
                                                    placeholder="gsk_..."
                                                    value={integrationForm.data.groq_api_key}
                                                    onChange={(e) =>
                                                        integrationForm.setData('groq_api_key', e.target.value)
                                                    }
                                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGroqKey(!showGroqKey)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[11px] text-slate-400">Lấy key tại console.groq.com/keys</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleTestConnection('groq')}
                                                    disabled={testingTarget === 'groq'}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${testingTarget === 'groq' ? 'animate-spin' : ''}`} />
                                                    <span>{testingTarget === 'groq' ? 'Đang test...' : 'Test kết nối'}</span>
                                                </button>
                                            </div>
                                            {testResults.groq && (
                                                <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                    testResults.groq.success
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                                }`}>
                                                    {testResults.groq.success ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                    ) : (
                                                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                                    )}
                                                    <span>{testResults.groq.message}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                OpenAI API Key (Dự phòng GPT-4o-mini)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showOpenaiKey ? 'text' : 'password'}
                                                    placeholder="sk-proj-..."
                                                    value={integrationForm.data.openai_api_key}
                                                    onChange={(e) =>
                                                        integrationForm.setData('openai_api_key', e.target.value)
                                                    }
                                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[11px] text-slate-400">Lấy key tại platform.openai.com/api-keys</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleTestConnection('openai')}
                                                    disabled={testingTarget === 'openai'}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${testingTarget === 'openai' ? 'animate-spin' : ''}`} />
                                                    <span>{testingTarget === 'openai' ? 'Đang test...' : 'Test kết nối'}</span>
                                                </button>
                                            </div>
                                            {testResults.openai && (
                                                <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                    testResults.openai.success
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                                }`}>
                                                    {testResults.openai.success ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                    ) : (
                                                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                                    )}
                                                    <span>{testResults.openai.message}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SOCIAL DATA PROVIDERS (TIKTOK & CÁC NỀN TẢNG) */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                                            <Radio className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                Nhà Cung Cấp Số Liệu Mạng Xã Hội (TikTok & Video Sync)
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Cấu hình API Key nhà cung cấp dữ liệu mạng xã hội để tự động quét lượt xem (views), tương tác real-time từ máy chủ mà không bị chặn IP
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Mã hóa AES-256
                                    </span>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {/* Driver Selector */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Cơ Chế Kết Nối (Driver)
                                            </label>
                                            <select
                                                value={integrationForm.data.social_data_provider_driver}
                                                onChange={(e) =>
                                                    integrationForm.setData('social_data_provider_driver', e.target.value)
                                                }
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                            >
                                                <option value="sandbox">Sandbox / Miễn phí (Chỉ dùng Chrome Extension)</option>
                                                <option value="rapidapi">RapidAPI (Khuyên dùng - Cào ổn định qua Proxy dân cư)</option>
                                                <option value="apify">Apify Actor (Scraper)</option>
                                                <option value="tikapi">TikAPI (Chuyên dụng TikTok)</option>
                                            </select>
                                            <p className="text-[11px] text-slate-400 mt-1">Chọn RapidAPI nếu muốn server tự động cào view TikTok real-time.</p>
                                        </div>

                                        {/* API Host */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                API Host (Dành cho RapidAPI)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="tiktok-api23.p.rapidapi.com"
                                                value={integrationForm.data.social_data_provider_api_host}
                                                onChange={(e) =>
                                                    integrationForm.setData('social_data_provider_api_host', e.target.value)
                                                }
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1">Host gói đã đăng ký trên RapidAPI (ví dụ: <code className="bg-slate-100 px-1 py-0.5 rounded">tiktok-api6.p.rapidapi.com</code> hoặc <code className="bg-slate-100 px-1 py-0.5 rounded">tiktok-api23.p.rapidapi.com</code>)</p>
                                        </div>

                                        {/* API Key */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                API Key (RapidAPI / Apify / TikAPI)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showRapidApiKey ? 'text' : 'password'}
                                                    placeholder="Nhập khóa API Key..."
                                                    value={integrationForm.data.social_data_provider_api_key}
                                                    onChange={(e) =>
                                                        integrationForm.setData('social_data_provider_api_key', e.target.value)
                                                    }
                                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRapidApiKey(!showRapidApiKey)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showRapidApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[11px] text-slate-400">Lấy key tại rapidapi.com</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleTestConnection('rapidapi')}
                                                    disabled={testingTarget === 'rapidapi'}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 cursor-pointer"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${testingTarget === 'rapidapi' ? 'animate-spin' : ''}`} />
                                                    <span>{testingTarget === 'rapidapi' ? 'Đang test...' : 'Test kết nối'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {testResults.rapidapi && (
                                        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                                            testResults.rapidapi.success
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                                        }`}>
                                            {testResults.rapidapi.success ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                            )}
                                            <span>{testResults.rapidapi.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* YOUTUBE DATA API & FACEBOOK TOKEN */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                                            <Share2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                YouTube Data API & Facebook Client Token
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Cấu hình khóa API chính thức để đồng bộ số liệu video YouTube và Facebook Reels
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Mã hóa AES-256
                                    </span>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* YouTube API Key */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                YouTube Data API v3 Key (Google Cloud Console)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showYoutubeKey ? 'text' : 'password'}
                                                    placeholder="AIzaSy..."
                                                    value={integrationForm.data.youtube_api_key}
                                                    onChange={(e) =>
                                                        integrationForm.setData('youtube_api_key', e.target.value)
                                                    }
                                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showYoutubeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[11px] text-slate-400">Lấy key tại console.cloud.google.com</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleTestConnection('youtube')}
                                                    disabled={testingTarget === 'youtube'}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 cursor-pointer"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${testingTarget === 'youtube' ? 'animate-spin' : ''}`} />
                                                    <span>{testingTarget === 'youtube' ? 'Đang test...' : 'Test kết nối'}</span>
                                                </button>
                                            </div>
                                            {testResults.youtube && (
                                                <div className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                                                    testResults.youtube.success
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                                }`}>
                                                    {testResults.youtube.success ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                    ) : (
                                                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                                    )}
                                                    <span>{testResults.youtube.message}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Facebook Client Token */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Facebook / Meta Client Token (Meta for Developers)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showFacebookToken ? 'text' : 'password'}
                                                    placeholder="Nhập Meta App Client Token..."
                                                    value={integrationForm.data.facebook_client_token}
                                                    onChange={(e) =>
                                                        integrationForm.setData('facebook_client_token', e.target.value)
                                                    }
                                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFacebookToken(!showFacebookToken)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showFacebookToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1">Lấy token tại developers.facebook.com/apps</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={integrationForm.processing}
                                >
                                    Lưu Cấu Hình Kết Nối
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* MODAL: THÊM NHÂN SỰ MỚI */}
                <Modal
                    show={isAddUserModalOpen}
                    onClose={() => setIsAddUserModalOpen(false)}
                    maxWidth="md"
                >
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            Thêm Nhân Viên Mới
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Tạo tài khoản đăng nhập và gán vai trò quyền hạn cho nhân sự.
                        </p>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Họ và tên nhân sự
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Hoàng Văn Nam"
                                    value={createUserForm.data.name}
                                    onChange={(e) => createUserForm.setData('name', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {createUserForm.errors.name && (
                                    <p className="text-xs text-rose-600 mt-1">
                                        {createUserForm.errors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Email đăng nhập
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="nam.hoang@bookingkol.vn"
                                    value={createUserForm.data.email}
                                    onChange={(e) => createUserForm.setData('email', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                />
                                {createUserForm.errors.email && (
                                    <p className="text-xs text-rose-600 mt-1">
                                        {createUserForm.errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Mật khẩu khởi tạo
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Tối thiểu 8 ký tự"
                                    value={createUserForm.data.password}
                                    onChange={(e) => createUserForm.setData('password', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                />
                                {createUserForm.errors.password && (
                                    <p className="text-xs text-rose-600 mt-1">
                                        {createUserForm.errors.password}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Gán vai trò (Role)
                                </label>
                                <select
                                    value={createUserForm.data.role}
                                    onChange={(e) => createUserForm.setData('role', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                >
                                    <option value="Staff">Staff (Nhân viên booking - chỉ sửa KOC được gán)</option>
                                    <option value="Leader">Leader (Trưởng nhóm - duyệt ngân sách, xóa chiến dịch)</option>
                                    <option value="Admin">Admin (Quản trị viên toàn quyền hệ thống)</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsAddUserModalOpen(false)}
                                >
                                    Hủy Bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={createUserForm.processing}
                                >
                                    Tạo Nhân Viên
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>

                {/* MODAL: ĐỔI VAI TRÒ NHÂN SỰ */}
                <Modal
                    show={!!editingUserRole}
                    onClose={() => setEditingUserRole(null)}
                    maxWidth="sm"
                >
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            Thay Đổi Vai Trò Nhân Sự
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Cập nhật vai trò phân quyền cho <strong>{editingUserRole?.name}</strong> ({editingUserRole?.email}).
                        </p>

                        <form onSubmit={handleUpdateUserRole} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Chọn vai trò mới
                                </label>
                                <select
                                    value={roleForm.data.role}
                                    onChange={(e) => roleForm.setData('role', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                >
                                    <option value="Staff">Staff (Nhân viên booking)</option>
                                    <option value="Leader">Leader (Trưởng nhóm)</option>
                                    <option value="Admin">Admin (Quản trị viên)</option>
                                </select>
                                {roleForm.errors.role && (
                                    <p className="text-xs text-rose-600 mt-1">
                                        {roleForm.errors.role}
                                    </p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingUserRole(null)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={roleForm.processing}
                                >
                                    Cập Nhật Vai Trò
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>

                {/* MODAL: CHỈNH SỬA THÔNG TIN NHÂN SỰ */}
                <Modal
                    show={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    maxWidth="md"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Edit2 className="h-5 w-5 text-primary-600" />
                            <h3 className="text-lg font-bold text-slate-900">
                                Chỉnh Sửa Thông Tin Nhân Sự
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Cập nhật thông tin định danh, số điện thoại và trạng thái hoạt động cho tài khoản nhân sự.
                        </p>

                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Họ và tên nhân sự <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editUserForm.data.name}
                                    onChange={(e) => editUserForm.setData('name', e.target.value)}
                                    placeholder="Nguyễn Văn A"
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {editUserForm.errors.name && (
                                    <p className="text-xs text-rose-600 mt-1">{editUserForm.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Email đăng nhập <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={editUserForm.data.email}
                                    onChange={(e) => editUserForm.setData('email', e.target.value)}
                                    placeholder="user@congty.com"
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {editUserForm.errors.email && (
                                    <p className="text-xs text-rose-600 mt-1">{editUserForm.errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Số điện thoại di động / Zalo
                                </label>
                                <input
                                    type="text"
                                    value={editUserForm.data.phone}
                                    onChange={(e) => editUserForm.setData('phone', e.target.value)}
                                    placeholder="0912345678"
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {editUserForm.errors.phone && (
                                    <p className="text-xs text-rose-600 mt-1">{editUserForm.errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Trạng thái tài khoản <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={editUserForm.data.is_active ? '1' : '0'}
                                    onChange={(e) => editUserForm.setData('is_active', e.target.value === '1')}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                >
                                    <option value="1">Đang hoạt động (Cho phép đăng nhập)</option>
                                    <option value="0">Tạm khóa (Vô hiệu hóa đăng nhập)</option>
                                </select>
                                {editUserForm.errors.is_active && (
                                    <p className="text-xs text-rose-600 mt-1">{editUserForm.errors.is_active}</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingUser(null)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={editUserForm.processing}
                                >
                                    Lưu Thay Đổi
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>

                {/* MODAL: ĐẶT LẠI MẬT KHẨU CHO NHÂN SỰ */}
                <Modal
                    show={!!resettingUserPassword}
                    onClose={() => setResettingUserPassword(null)}
                    maxWidth="md"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <KeyRound className="h-5 w-5 text-primary-600" />
                            <h3 className="text-lg font-bold text-slate-900">
                                Đặt Lại Mật Khẩu Cho Nhân Sự
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Cấp lại mật khẩu mới cho nhân sự <strong>{resettingUserPassword?.name}</strong> ({resettingUserPassword?.email}).
                        </p>

                        {/* Nút hỗ trợ tạo mật khẩu ngẫu nhiên */}
                        <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50/60 p-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-primary-900">Cần mật khẩu an toàn tức thì?</p>
                                <p className="text-[11px] text-primary-700">Tự động sinh chuỗi ký tự ngẫu nhiên đạt tiêu chuẩn bảo mật.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={generateRandomPassword}
                                iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
                            >
                                Sinh Ngẫu Nhiên
                            </Button>
                        </div>

                        {generatedPassword && (
                            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between gap-2">
                                <div className="truncate">
                                    <span className="text-[11px] text-emerald-700 block font-medium">Mật khẩu vừa tạo:</span>
                                    <span className="font-mono text-sm font-bold text-emerald-900">{generatedPassword}</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={copyToClipboard}
                                    iconLeft={<Copy className="h-3.5 w-3.5" />}
                                >
                                    {copiedPassword ? 'Đã sao chép!' : 'Sao Chép'}
                                </Button>
                            </div>
                        )}

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Mật khẩu mới <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={resetPasswordForm.data.password}
                                    onChange={(e) => resetPasswordForm.setData('password', e.target.value)}
                                    placeholder="Tối thiểu 8 ký tự"
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                />
                                {resetPasswordForm.errors.password && (
                                    <p className="text-xs text-rose-600 mt-1">{resetPasswordForm.errors.password}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={resetPasswordForm.data.password_confirmation}
                                    onChange={(e) => resetPasswordForm.setData('password_confirmation', e.target.value)}
                                    placeholder="Nhập lại mật khẩu mới"
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                />
                                {resetPasswordForm.errors.password_confirmation && (
                                    <p className="text-xs text-rose-600 mt-1">{resetPasswordForm.errors.password_confirmation}</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setResettingUserPassword(null)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={resetPasswordForm.processing}
                                >
                                    Đặt Lại Mật Khẩu
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            </div>
        </AppLayout>
    );
}

