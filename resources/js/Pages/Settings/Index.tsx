import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm } from '@inertiajs/react';
import {
    Settings as SettingsIcon,
    Users,
    Shield,
    Clock,
    Key,
    Truck,
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
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import Modal from '@/Components/Modal';

export interface UserItem {
    id: number;
    name: string;
    email: string;
    roles: string[];
    created_at?: string;
}

export interface SettingsData {
    default_video_deadline_days: number;
    blacklist_penalty_score: number;
    zalo_oa_app_id: string;
    zalo_oa_secret_key: string;
    zalo_oa_id: string;
    ghn_token: string;
    ghn_shop_id: string;
    ghtk_token: string;
    groq_api_key?: string;
    openai_api_key?: string;
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
    const [activeTab, setActiveTab] = useState<'users' | 'general' | 'integrations'>('users');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [editingUserRole, setEditingUserRole] = useState<UserItem | null>(null);

    // Visibility toggles for sensitive fields
    const [showZaloSecret, setShowZaloSecret] = useState(false);
    const [showGhnToken, setShowGhnToken] = useState(false);
    const [showGhtkToken, setShowGhtkToken] = useState(false);
    const [showGroqKey, setShowGroqKey] = useState(false);
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);

    // Form: General Settings
    const generalForm = useForm({
        default_video_deadline_days: settings.default_video_deadline_days || 7,
        blacklist_penalty_score: settings.blacklist_penalty_score || 30,
    });

    // Form: Integrations
    const integrationForm = useForm({
        zalo_oa_app_id: settings.zalo_oa_app_id || '',
        zalo_oa_secret_key: settings.zalo_oa_secret_key ? '••••••••••••••••' : '',
        zalo_oa_id: settings.zalo_oa_id || '',
        ghn_token: settings.ghn_token ? '••••••••••••••••' : '',
        ghn_shop_id: settings.ghn_shop_id || '',
        ghtk_token: settings.ghtk_token ? '••••••••••••••••' : '',
        groq_api_key: settings.groq_api_key ? '••••••••••••••••' : '',
        openai_api_key: settings.openai_api_key ? '••••••••••••••••' : '',
    });

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
                                            <th className="px-6 py-3.5">Họ & Tên</th>
                                            <th className="px-6 py-3.5">Email Đăng Nhập</th>
                                            <th className="px-6 py-3.5">Vai Trò (Role)</th>
                                            <th className="px-6 py-3.5">Phạm Vi Quyền Hạn</th>
                                            <th className="px-6 py-3.5 text-center">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map((user) => {
                                            const role = user.roles[0] || 'Staff';
                                            return (
                                                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                                                                {user.name.charAt(0)}
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
                                                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                                                        {user.email}
                                                    </td>
                                                    <td className="px-6 py-4">
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
                                                    <td className="px-6 py-4 text-xs text-slate-500 max-w-md">
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
                                                    <td className="px-6 py-4 text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditRoleModal(user)}
                                                        >
                                                            Đổi Vai Trò
                                                        </Button>
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

                            {/* Section 2: Tài khoản Hãng vận chuyển GHN / GHTK */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Truck className="h-5 w-5 text-indigo-600" />
                                        <span>Cấu Hình Tài Khoản Hãng Vận Chuyển (GHN / GHTK)</span>
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Lưu thông tin xác thực tài khoản kho đối tác chuyển phát phục vụ tra cứu thông tin vận chuyển khi cần.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Giao Hàng Nhanh (GHN) API Token
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showGhnToken ? 'text' : 'password'}
                                                    placeholder="Nhập GHN Token"
                                                    value={integrationForm.data.ghn_token}
                                                    onChange={(e) =>
                                                        integrationForm.setData('ghn_token', e.target.value)
                                                    }
                                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGhnToken(!showGhnToken)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showGhnToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                GHN Shop ID
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ví dụ: 123456"
                                                value={integrationForm.data.ghn_shop_id}
                                                onChange={(e) =>
                                                    integrationForm.setData('ghn_shop_id', e.target.value)
                                                }
                                                className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Giao Hàng Tiết Kiệm (GHTK) API Token
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showGhtkToken ? 'text' : 'password'}
                                                    placeholder="Nhập GHTK Token"
                                                    value={integrationForm.data.ghtk_token}
                                                    onChange={(e) =>
                                                        integrationForm.setData('ghtk_token', e.target.value)
                                                    }
                                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 font-mono pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGhtkToken(!showGhtkToken)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showGhtkToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
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
                                            <p className="text-[11px] text-slate-400 mt-1">Lấy key tại console.groq.com/keys</p>
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
                                            <p className="text-[11px] text-slate-400 mt-1">Lấy key tại platform.openai.com/api-keys</p>
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
            </div>
        </AppLayout>
    );
}

