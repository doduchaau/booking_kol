import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    MessageSquare,
    Send,
    Users,
    ShieldAlert,
    Copy,
    Check,
    Plus,
    ExternalLink,
    Clock,
    Trash2,
    Edit3,
    AlertCircle,
    UserCheck,
    Search,
    MessageCircle,
    Smartphone,
    Mail,
    CheckCircle2,
    XCircle,
    Filter,
    X,
    Hash,
    Phone,
    User,
    Sparkles,
    AtSign,
    Zap,
    FolderKanban,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import Modal from '@/Components/Modal';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import EmptyState from '@/Components/Common/EmptyState';

interface Template {
    id: number;
    name: string;
    type?: string | null;
    channel: string;
    subject?: string | null;
    content_template: string;
    is_active: boolean;
    created_at: string;
}

interface MessageItem {
    id: number;
    channel: string;
    sent_content: string;
    status: string;
    sent_at: string;
    sender?: { id: number; name: string; email: string };
    template?: { id: number; name: string };
    campaign_creator?: {
        id: number;
        status: string;
        creator?: { id: number; name: string; phone: string };
        campaign?: { id: number; name: string; product_name: string };
    };
}

interface OptOutItem {
    id: number;
    phone: string | null;
    email: string | null;
    reason: string | null;
    channel: string;
    requested_at: string;
}

interface GroupInviteItem {
    id: number;
    group_name: string;
    group_link: string | null;
    status: string;
    invited_at: string | null;
    verified_at: string | null;
    notes: string | null;
    verifier?: { id: number; name: string };
    campaign_creator?: {
        id: number;
        creator?: { id: number; name: string; phone: string };
        campaign?: { id: number; name: string; product_name: string };
    };
}

interface CreatorAccountOption {
    id: number;
    creator_id?: number;
    platform: string;
    handle: string;
    followers_count?: number;
    url?: string;
}

interface CampaignCreatorOption {
    id: number;
    campaign_id?: number;
    creator_id?: number;
    status?: string;
    booking_fee?: string | number;
    portal_token?: string | null;
    creator?: {
        id: number;
        name: string;
        phone: string | null;
        niche: string;
        tier: string;
        accounts?: CreatorAccountOption[];
    };
    campaign_name?: string;
    campaign_product?: string;
}

interface CampaignOption {
    id: number;
    name: string;
    product_name: string;
    campaign_creators: CampaignCreatorOption[];
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface OutreachIndexProps {
    templates: Template[];
    templateTypes?: Array<{ key: string; label: string }>;
    messages: PaginatedData<MessageItem>;
    optOuts: PaginatedData<OptOutItem>;
    groupInvites: PaginatedData<GroupInviteItem>;
    stats: {
        total_sent: number;
        active_templates: number;
        optout_count: number;
        groups_joined: number;
    };
    campaigns: CampaignOption[];
}

export default function OutreachIndex({
    templates,
    templateTypes,
    messages,
    optOuts,
    groupInvites,
    stats,
    campaigns,
}: OutreachIndexProps) {
    const [activeTab, setActiveTab] = useState<'templates' | 'messages' | 'optouts' | 'groups'>('templates');
    const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'quick' | 'custom'>('all');

    // State cho Modal Dùng Mẫu & Mở Zalo (Split Workspace Layout)
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>('');
    const [selectedPivotId, setSelectedPivotId] = useState<number | ''>('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>(templates[0]?.id || '');
    const [searchKocQuery, setSearchKocQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'agreed'>('all');

    // Preview state
    const [previewLoading, setPreviewLoading] = useState(false);
    const [renderedText, setRenderedText] = useState('');
    const [zaloDeepLink, setZaloDeepLink] = useState<string | null>(null);
    const [portalLink, setPortalLink] = useState<string | null>(null);
    const [isOptedOut, setIsOptedOut] = useState(false);
    const [copiedText, setCopiedText] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    // State tìm kiếm cho các Tab khác
    const [messageSearch, setMessageSearch] = useState('');
    const [optOutSearch, setOptOutSearch] = useState('');
    const [groupSearch, setGroupSearch] = useState('');

    // State cho Modal Thêm/Sửa Template
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

    const templateForm = useForm({
        name: '',
        type: 'custom',
        channel: 'zalo_personal',
        subject: '',
        content_template: '',
        is_active: true,
    });

    // State cho Modal Thêm Opt-Out
    const [isOptOutModalOpen, setIsOptOutModalOpen] = useState(false);
    const optOutForm = useForm({
        phone: '',
        email: '',
        reason: 'KOC từ chối nhận tin tiếp cận',
    });

    // Gom KOC theo chiến dịch được chọn. Bắt buộc người dùng phải chọn chiến dịch trước (ẩn hết KOC khi chưa chọn).
    const allAvailableCreators = useMemo(() => {
        if (!selectedCampaignId) {
            return [];
        }

        const camp = campaigns.find((c) => c.id === Number(selectedCampaignId));
        if (!camp) return [];
        return camp.campaign_creators.map((cc) => ({
            ...cc,
            campaign_name: camp.name,
            campaign_product: camp.product_name,
        }));
    }, [selectedCampaignId, campaigns]);

    // Xử lý khi người dùng chọn chiến dịch trong modal
    const handleCampaignChange = (campaignId: number | '') => {
        setSelectedCampaignId(campaignId);
        setSendSuccess(false);
        setSearchKocQuery('');
        if (!campaignId) {
            setSelectedPivotId('');
            setRenderedText('');
            setZaloDeepLink(null);
            setPortalLink(null);
            return;
        }

        const camp = campaigns.find((c) => c.id === Number(campaignId));
        if (camp && camp.campaign_creators.length > 0) {
            setSelectedPivotId(camp.campaign_creators[0].id);
        } else {
            setSelectedPivotId('');
            setRenderedText('');
            setZaloDeepLink(null);
            setPortalLink(null);
        }
    };

    // Lọc KOC ưu tiên theo @handle mạng xã hội, Tên, Số điện thoại và Trạng thái
    const filteredKocs = useMemo(() => {
        let result = allAvailableCreators;

        // Lọc theo trạng thái pipeline nếu có
        if (statusFilter !== 'all') {
            result = result.filter((cc) => cc.status === statusFilter);
        }

        const rawQ = searchKocQuery.trim();
        if (!rawQ) return result;

        const q = rawQ.toLowerCase();
        // Xử lý tìm theo @handle: chuẩn hóa khi người dùng gõ "@linhbui" hoặc "linhbui"
        const handleQuery = q.startsWith('@') ? q.substring(1).trim() : q;
        const cleanDigits = rawQ.replace(/\D/g, '');

        return result.filter((cc) => {
            // 1. ƯU TIÊN HÀNG ĐẦU: Khớp theo @handle (TikTok, Instagram, YouTube, Facebook, Shopee, Zalo)
            if (cc.creator?.accounts && cc.creator.accounts.length > 0) {
                const matchHandle = cc.creator.accounts.some((acc) => {
                    const h = (acc.handle || '').toLowerCase().replace(/^@/, '');
                    return h.includes(handleQuery) || (acc.handle || '').toLowerCase().includes(q);
                });
                if (matchHandle) return true;
            }

            // 2. Khớp theo Tên KOC
            if (cc.creator?.name?.toLowerCase().includes(q)) {
                return true;
            }

            // 3. Khớp theo Số điện thoại
            if (cleanDigits.length >= 3 && cc.creator?.phone && cc.creator.phone.replace(/\D/g, '').includes(cleanDigits)) {
                return true;
            }

            // 4. Khớp theo Ngành (Niche) hoặc Tier
            if (
                cc.creator?.niche?.toLowerCase().includes(q) ||
                cc.creator?.tier?.toLowerCase().includes(q)
            ) {
                return true;
            }

            // 5. Khớp theo Tên chiến dịch
            if (cc.campaign_name?.toLowerCase().includes(q)) {
                return true;
            }

            // 6. Hỗ trợ phụ: ID (nếu người dùng gõ số ID)
            if (/^\d+$/.test(rawQ.replace(/^#/, ''))) {
                const num = rawQ.replace(/^#/, '');
                if (String(cc.creator?.id) === num || String(cc.id) === num) {
                    return true;
                }
            }

            return false;
        });
    }, [allAvailableCreators, searchKocQuery, statusFilter]);

    // Thông tin KOC đang được chọn trong bảng dùng mẫu
    const selectedKoc = useMemo(() => {
        if (!selectedPivotId) return null;
        return allAvailableCreators.find((cc) => cc.id === Number(selectedPivotId)) || null;
    }, [selectedPivotId, allAvailableCreators]);

    // Hàm render thay thế placeholder tức thì ở client (0ms delay)
    const renderLocalText = (templateText: string, koc: any) => {
        if (!templateText || !koc) return '';
        const name = koc.creator?.name || 'bạn';
        const primaryAccount = koc.creator?.accounts?.[0];
        const rawHandle = primaryAccount?.handle;
        const cleanHandle = rawHandle ? rawHandle.replace(/^@/, '') : null;
        const handleDisplay = cleanHandle ? `@${cleanHandle}` : name;
        const product = koc.campaign_product || koc.campaign_name || 'sản phẩm';
        const campaignName = koc.campaign_name || 'chiến dịch';
        const fee = Number(koc.booking_fee || 0);
        const rate = fee > 0 ? fee.toLocaleString('vi-VN') + ' đ' : 'thỏa thuận';
        const portal = koc.portal_token
            ? `${window.location.origin}/portal/${koc.portal_token}`
            : `${window.location.origin}/portal/token-xac-nhan`;

        return templateText
            .replaceAll('{creator_name}', name)
            .replaceAll('{handle}', handleDisplay)
            .replaceAll('{creator_handle}', handleDisplay)
            .replaceAll('{product_name}', product)
            .replaceAll('{campaign_name}', campaignName)
            .replaceAll('{rate}', rate)
            .replaceAll('{budget}', rate)
            .replaceAll('{portal_link}', portal);
    };

    // Tự động render nội dung: vừa render tức thì vừa đồng bộ với backend qua axios
    const renderAndFetch = (pivotId: number, tmplId: number) => {
        if (!pivotId || !tmplId) return;

        const koc = allAvailableCreators.find((c) => c.id === pivotId);
        const tmpl = templates.find((t) => t.id === tmplId);

        // 1. Render tức thì (0ms latency, không chờ mạng)
        if (koc && tmpl) {
            const localText = renderLocalText(tmpl.content_template, koc);
            setRenderedText(localText);
            if (koc.creator?.phone) {
                const cleanPhone = koc.creator.phone.replace(/\D/g, '');
                setZaloDeepLink(`https://zalo.me/${cleanPhone}`);
            }
            if (koc.portal_token) {
                setPortalLink(`${window.location.origin}/portal/${koc.portal_token}`);
            }
        }

        // 2. Đồng bộ chuẩn qua API (kiểm tra Opt-out, lấy portal link chính xác từ server)
        setPreviewLoading(true);
        axios
            .post('/outreach/prepare', {
                campaign_creator_id: pivotId,
                template_id: tmplId,
            })
            .then((res) => {
                if (res.data?.success) {
                    if (res.data.rendered_text) {
                        setRenderedText(res.data.rendered_text);
                    }
                    if (res.data.zalo_deep_link) {
                        setZaloDeepLink(res.data.zalo_deep_link);
                    }
                    if (res.data.portal_link) {
                        setPortalLink(res.data.portal_link);
                    }
                    setIsOptedOut(Boolean(res.data.is_opted_out));
                }
            })
            .catch((err) => {
                console.warn('Lưu ý API prepare:', err);
            })
            .finally(() => {
                setPreviewLoading(false);
            });
    };

    // Tự động chọn KOC đầu tiên khi mở modal nếu chưa chọn
    useEffect(() => {
        if (isActionModalOpen) {
            if (!selectedPivotId && filteredKocs.length > 0) {
                setSelectedPivotId(filteredKocs[0].id);
            }
        }
    }, [isActionModalOpen, filteredKocs]);

    // TỰ ĐỘNG RENDER NỘI DUNG MỖI KHI ĐỔI KOC HOẶC ĐỔI MẪU TIN
    useEffect(() => {
        if (isActionModalOpen && selectedPivotId && selectedTemplateId) {
            renderAndFetch(Number(selectedPivotId), Number(selectedTemplateId));
        }
    }, [selectedPivotId, selectedTemplateId, isActionModalOpen]);

    const handleSelectKocRow = (pivotId: number) => {
        setSelectedPivotId(pivotId);
    };

    const handleSelectTemplate = (tmplId: number) => {
        setSelectedTemplateId(tmplId);
    };

    // Mở Zalo & Ghi nhận vào DB
    const handleSendAndOpenZalo = () => {
        if (!selectedPivotId || !renderedText) return;

        // 1. Sao chép nội dung vào Clipboard
        navigator.clipboard.writeText(renderedText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 3000);

        // 2. Mở Zalo chat
        if (zaloDeepLink) {
            window.open(zaloDeepLink, '_blank');
        }

        // 3. Ghi nhận nhật ký tin nhắn lên server và tự động chuyển trạng thái KOC sang 'contacted'
        router.post(
            route('outreach.send'),
            {
                campaign_creator_id: selectedPivotId,
                channel: 'zalo_personal',
                content: renderedText,
                template_id: selectedTemplateId || null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // GIỮ NGUYÊN POPUP MỞ (Không đóng modal để nhân viên tiếp tục chọn KOC tiếp theo nhanh chóng)
                    setSendSuccess(true);
                    setTimeout(() => setSendSuccess(false), 3500);
                },
            }
        );
    };

    const handleCopyOnly = () => {
        if (!renderedText) return;
        navigator.clipboard.writeText(renderedText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2500);
    };

    const handleCopyPortalLink = () => {
        if (!portalLink) return;
        navigator.clipboard.writeText(portalLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
    };

    // Helper hiển thị badge trạng thái KOC
    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'new':
                return <Badge variant="default">Mới thêm</Badge>;
            case 'contacted':
                return <Badge variant="primary">Đã liên hệ</Badge>;
            case 'agreed':
                return <Badge variant="success">Chốt hợp tác</Badge>;
            case 'address_confirmed':
                return <Badge variant="info">Đã chốt địa chỉ</Badge>;
            case 'sample_received':
                return <Badge variant="warning">Đã nhận hàng</Badge>;
            case 'posted':
                return <Badge variant="success">Đã lên video</Badge>;
            case 'completed':
                return <Badge variant="success">Hoàn tất</Badge>;
            case 'declined':
                return <Badge variant="danger">Từ chối</Badge>;
            default:
                return <Badge variant="default">{status || 'Chưa rõ'}</Badge>;
        }
    };

    // Mở modal tạo/sửa template
    const openCreateTemplateModal = () => {
        setEditingTemplate(null);
        templateForm.reset();
        templateForm.setData({
            name: '',
            type: 'custom',
            channel: 'zalo_personal',
            subject: '',
            content_template: '',
            is_active: true,
        });
        setIsTemplateModalOpen(true);
    };

    const openEditTemplateModal = (tmpl: Template) => {
        setEditingTemplate(tmpl);
        templateForm.setData({
            name: tmpl.name,
            type: tmpl.type || 'custom',
            channel: tmpl.channel,
            subject: tmpl.subject || '',
            content_template: tmpl.content_template,
            is_active: tmpl.is_active,
        });
        setIsTemplateModalOpen(true);
    };

    // Chèn biến nhanh vào nội dung mẫu
    const insertVariableTag = (tag: string) => {
        const current = templateForm.data.content_template || '';
        templateForm.setData('content_template', current ? `${current} ${tag}` : tag);
    };

    const variableChips = [
        { tag: '{creator_name}', desc: 'Tên KOC' },
        { tag: '{handle}', desc: '@handle MXH' },
        { tag: '{staff_name}', desc: 'Tên nhân viên' },
        { tag: '{campaign_name}', desc: 'Tên chiến dịch' },
        { tag: '{product_name}', desc: 'Tên sản phẩm' },
        { tag: '{portal_link}', desc: 'Link Portal KOC' },
        { tag: '{deadline_text}', desc: 'Hạn nộp video' },
        { tag: '{sent_date_text}', desc: 'Ngày gửi mẫu' },
        { tag: '{hashtags}', desc: 'Hashtag' },
        { tag: '{discount_code}', desc: 'Mã giảm giá' },
        { tag: '{rate}', desc: 'Mức thù lao' },
    ];

    const filteredTemplates = useMemo(() => {
        if (templateCategoryFilter === 'quick') {
            return templates.filter((t) => t.type && t.type !== 'custom');
        }
        if (templateCategoryFilter === 'custom') {
            return templates.filter((t) => !t.type || t.type === 'custom');
        }
        return templates;
    }, [templates, templateCategoryFilter]);

    const quickTemplatesCount = useMemo(() => {
        return templates.filter((t) => t.type && t.type !== 'custom').length;
    }, [templates]);

    const handleSaveTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTemplate) {
            templateForm.put(route('outreach.templates.update', editingTemplate.id), {
                onSuccess: () => setIsTemplateModalOpen(false),
            });
        } else {
            templateForm.post(route('outreach.templates.store'), {
                onSuccess: () => setIsTemplateModalOpen(false),
            });
        }
    };

    const handleDeleteTemplate = (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa mẫu tin nhắn này?')) {
            router.delete(route('outreach.templates.destroy', id));
        }
    };

    const handleSaveOptOut = (e: React.FormEvent) => {
        e.preventDefault();
        optOutForm.post(route('outreach.opt-outs.store'), {
            onSuccess: () => {
                setIsOptOutModalOpen(false);
                optOutForm.reset();
            },
        });
    };

    const handleRemoveOptOut = (id: number) => {
        if (confirm('Gỡ số điện thoại này khỏi danh sách từ chối nhận tin?')) {
            router.delete(route('outreach.opt-outs.destroy', id));
        }
    };

    const handleUpdateGroupStatus = (id: number, status: string) => {
        router.patch(route('outreach.group-invites.update', id), {
            status,
        });
    };

    return (
        <AppLayout title="Tiếp cận Zalo (Outreach)">
            <Head title="Tiếp cận Zalo (Outreach) - Booking KOL" />

            <PageHeader
                title="Quản Lý Tiếp Cận Zalo (Outreach)"
                description="Soạn tin cá nhân hóa, bảng dùng mẫu KOC tra cứu theo ID/Tên/SĐT, 1-click mở Zalo và tự động cập nhật Pipeline"
                breadcrumbs={[{ label: 'Tổng quan', href: '/dashboard' }, { label: 'Tiếp cận Zalo' }]}
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            iconLeft={<Plus className="h-4 w-4" />}
                            onClick={openCreateTemplateModal}
                        >
                            Tạo Mẫu Tin Mới
                        </Button>
                        <Button
                            variant="primary"
                            iconLeft={<Send className="h-4 w-4" />}
                            onClick={() => {
                                setSelectedCampaignId('');
                                setSelectedPivotId('');
                                setRenderedText('');
                                setSendSuccess(false);
                                setIsActionModalOpen(true);
                            }}
                        >
                            Dùng Mẫu & Mở Zalo
                        </Button>
                    </div>
                }
            />

            {/* 4 Thẻ Chỉ Số Chuẩn Enterprise SaaS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Tin Đã Gửi Tiếp Cận
                        </span>
                        <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
                            <Send className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">{stats.total_sent}</span>
                        <span className="text-xs font-semibold text-emerald-600">Tự động ghi vết</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Tự cập nhật trạng thái Pipeline</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Mẫu Tin Hoạt Động
                        </span>
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">{stats.active_templates}</span>
                        <span className="text-xs font-semibold text-slate-500">Template sẵn dùng</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Tự động chèn biến động KOC</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Từ Chối Nhận Tin (Opt-out)
                        </span>
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">{stats.optout_count}</span>
                        <span className="text-xs font-semibold text-rose-600">Bảo vệ riêng tư</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Chặn gửi tự động cho số KOC</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            KOC Đã Vào Nhóm Zalo
                        </span>
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">{stats.groups_joined}</span>
                        <span className="text-xs font-semibold text-emerald-600">Đã tham gia</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Theo dõi nhóm chiến dịch</p>
                </div>
            </div>

            {/* Thanh Tab Navigation */}
            <div className="border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
                <nav className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`flex items-center gap-2 py-3 border-b-2 text-sm font-semibold transition-colors ${
                            activeTab === 'templates'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <MessageSquare className="h-4 w-4" />
                        Mẫu Tin Nhắn ({templates.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex items-center gap-2 py-3 border-b-2 text-sm font-semibold transition-colors ${
                            activeTab === 'messages'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Clock className="h-4 w-4" />
                        Lịch Sử Tiếp Cận ({messages.total})
                    </button>
                    <button
                        onClick={() => setActiveTab('optouts')}
                        className={`flex items-center gap-2 py-3 border-b-2 text-sm font-semibold transition-colors ${
                            activeTab === 'optouts'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <ShieldAlert className="h-4 w-4" />
                        Danh Sách Từ Chối ({optOuts.total})
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`flex items-center gap-2 py-3 border-b-2 text-sm font-semibold transition-colors ${
                            activeTab === 'groups'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        Nhóm Zalo Chiến Dịch ({groupInvites.total})
                    </button>
                </nav>
            </div>

            {/* TAB 1: MẪU TIN NHẮN */}
            {activeTab === 'templates' && (
                <div>
                    {/* Thanh lọc loại mẫu tin & Gợi ý */}
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-500 mr-1">Bộ lọc:</span>
                            <button
                                type="button"
                                onClick={() => setTemplateCategoryFilter('all')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    templateCategoryFilter === 'all'
                                        ? 'bg-primary-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Tất cả mẫu ({templates.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTemplateCategoryFilter('quick')}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    templateCategoryFilter === 'quick'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
                                }`}
                            >
                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                Nhắc Zalo 1-Chạm ({quickTemplatesCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTemplateCategoryFilter('custom')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    templateCategoryFilter === 'custom'
                                        ? 'bg-primary-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Mẫu tiếp cận khác ({templates.length - quickTemplatesCount})
                            </button>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                            <span>Các mẫu "Nhắc Zalo 1-Chạm" được đồng bộ trực tiếp vào nút Nhắc việc trên Kanban & Workspace.</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredTemplates.map((tmpl) => (
                            <div
                                key={tmpl.id}
                                className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow ${
                                    tmpl.type && tmpl.type !== 'custom' ? 'border-amber-200/80 ring-1 ring-amber-100' : 'border-slate-200'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge
                                                variant={
                                                    tmpl.channel === 'zalo_personal'
                                                        ? 'primary'
                                                        : tmpl.channel === 'zalo_oa'
                                                        ? 'success'
                                                        : 'info'
                                                }
                                            >
                                                {tmpl.channel === 'zalo_personal'
                                                    ? 'Zalo Cá Nhân (Bán tự động)'
                                                    : tmpl.channel === 'zalo_oa'
                                                    ? 'Zalo OA (ZNS)'
                                                    : tmpl.channel}
                                            </Badge>

                                            {tmpl.type && tmpl.type !== 'custom' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                                                    <Zap className="h-3 w-3 text-amber-600" />
                                                    Nhắc Zalo 1-Chạm
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                                                tmpl.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                                            }`}
                                            title={tmpl.is_active ? 'Đang kích hoạt' : 'Tạm tắt'}
                                        />
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-base mb-1">{tmpl.name}</h3>
                                    {tmpl.subject && (
                                        <p className="text-xs font-semibold text-slate-500 mb-2">Tiêu đề: {tmpl.subject}</p>
                                    )}

                                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono border border-slate-100 max-h-44 overflow-y-auto leading-relaxed">
                                        {tmpl.content_template}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditTemplateModal(tmpl)}
                                            className="text-xs font-semibold text-slate-600 hover:text-primary-600 flex items-center gap-1"
                                        >
                                            <Edit3 className="h-3.5 w-3.5" /> Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTemplate(tmpl.id)}
                                            className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 ml-2"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Xóa
                                        </button>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant="primary"
                                        iconLeft={<Send className="h-3.5 w-3.5" />}
                                        onClick={() => {
                                            setSelectedTemplateId(tmpl.id);
                                            setSelectedCampaignId('');
                                            setSelectedPivotId('');
                                            setRenderedText('');
                                            setSendSuccess(false);
                                            setIsActionModalOpen(true);
                                        }}
                                    >
                                        Dùng Mẫu Này
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: LỊCH SỬ TIẾP CẬN */}
            {activeTab === 'messages' && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                                placeholder="Lọc theo Tên KOC, SĐT hoặc người gửi..."
                                className="w-full pl-9 pr-3 py-1.5 rounded-lg border-slate-300 text-xs focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                            Tổng {messages.total} tin nhắn đã ghi nhận
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">KOC Tiếp Cận</th>
                                    <th className="py-3 px-4">Chiến Dịch</th>
                                    <th className="py-3 px-4">Kênh</th>
                                    <th className="py-3 px-4">Nội Dung Đã Gửi</th>
                                    <th className="py-3 px-4">Người Gửi</th>
                                    <th className="py-3 px-4">Thời Gian</th>
                                    <th className="py-3 px-4">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {messages.data
                                    .filter((msg) => {
                                        if (!messageSearch) return true;
                                        const q = messageSearch.toLowerCase();
                                        return (
                                            msg.campaign_creator?.creator?.name?.toLowerCase().includes(q) ||
                                            msg.campaign_creator?.creator?.phone?.includes(q) ||
                                            msg.sender?.name?.toLowerCase().includes(q) ||
                                            msg.sent_content.toLowerCase().includes(q)
                                        );
                                    })
                                    .map((msg) => (
                                        <tr key={msg.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900">
                                                    {msg.campaign_creator?.creator?.name || 'N/A'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {msg.campaign_creator?.creator?.phone || 'Chưa có SĐT'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-slate-800">
                                                    {msg.campaign_creator?.campaign?.name || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant={
                                                        msg.channel === 'zalo_personal'
                                                            ? 'primary'
                                                            : msg.channel === 'zalo_oa'
                                                            ? 'success'
                                                            : 'info'
                                                    }
                                                >
                                                    {msg.channel === 'zalo_personal' ? 'Zalo Cá Nhân' : msg.channel}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 max-w-xs">
                                                <div className="truncate text-xs text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 font-mono">
                                                    {msg.sent_content}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-600">
                                                {msg.sender?.name || 'Hệ thống'}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                                                {new Date(msg.sent_at).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant="success">Đã gửi</Badge>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: DANH SÁCH TỪ CHỐI (OPT-OUT) */}
            {activeTab === 'optouts' && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="relative w-72">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={optOutSearch}
                                    onChange={(e) => setOptOutSearch(e.target.value)}
                                    placeholder="Tìm SĐT hoặc email đã chặn..."
                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border-slate-300 text-xs focus:border-primary-500 focus:ring-primary-500"
                                />
                            </div>
                            <p className="text-xs text-slate-500 hidden sm:block">
                                Tự động chặn gửi tin nhắn đến các số này để bảo vệ uy tín.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="primary"
                            iconLeft={<Plus className="h-4 w-4" />}
                            onClick={() => setIsOptOutModalOpen(true)}
                        >
                            Thêm Số Từ Chối
                        </Button>
                    </div>

                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">Số Điện Thoại</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Lý Do</th>
                                <th className="py-3 px-4">Kênh Chặn</th>
                                <th className="py-3 px-4">Thời Điểm</th>
                                <th className="py-3 px-4 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {optOuts.data
                                .filter((opt) => {
                                    if (!optOutSearch) return true;
                                    const q = optOutSearch.toLowerCase();
                                    return opt.phone?.includes(q) || opt.email?.toLowerCase().includes(q);
                                })
                                .map((opt) => (
                                    <tr key={opt.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4 font-mono font-semibold text-rose-600">
                                            {opt.phone || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-600">{opt.email || '-'}</td>
                                        <td className="py-3 px-4 text-xs text-slate-700">{opt.reason || '-'}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant="warning">{opt.channel}</Badge>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-500">
                                            {new Date(opt.requested_at).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleRemoveOptOut(opt.id)}
                                                className="text-xs font-semibold text-slate-400 hover:text-rose-600"
                                            >
                                                Gỡ chặn
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB 4: NHÓM ZALO CHIẾN DỊCH */}
            {activeTab === 'groups' && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={groupSearch}
                                onChange={(e) => setGroupSearch(e.target.value)}
                                placeholder="Tìm KOC, tên nhóm Zalo..."
                                className="w-full pl-9 pr-3 py-1.5 rounded-lg border-slate-300 text-xs focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                            {groupInvites.total} lượt mời nhóm chiến dịch
                        </span>
                    </div>

                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">KOC</th>
                                <th className="py-3 px-4">Chiến Dịch</th>
                                <th className="py-3 px-4">Tên Nhóm Zalo</th>
                                <th className="py-3 px-4">Đường Link Nhóm</th>
                                <th className="py-3 px-4">Trạng Thái Tham Gia</th>
                                <th className="py-3 px-4 text-right">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupInvites.data
                                .filter((grp) => {
                                    if (!groupSearch) return true;
                                    const q = groupSearch.toLowerCase();
                                    return (
                                        grp.campaign_creator?.creator?.name?.toLowerCase().includes(q) ||
                                        grp.group_name.toLowerCase().includes(q) ||
                                        grp.campaign_creator?.campaign?.name?.toLowerCase().includes(q)
                                    );
                                })
                                .map((grp) => (
                                    <tr key={grp.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-slate-900">
                                            {grp.campaign_creator?.creator?.name || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4">{grp.campaign_creator?.campaign?.name || 'N/A'}</td>
                                        <td className="py-3 px-4 font-medium text-slate-800">{grp.group_name}</td>
                                        <td className="py-3 px-4">
                                            {grp.group_link ? (
                                                <a
                                                    href={grp.group_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                                                >
                                                    Mở link nhóm <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                variant={
                                                    grp.status === 'joined'
                                                        ? 'success'
                                                        : grp.status === 'invited'
                                                        ? 'primary'
                                                        : 'warning'
                                                }
                                            >
                                                {grp.status === 'joined'
                                                    ? 'Đã vào nhóm'
                                                    : grp.status === 'invited'
                                                    ? 'Đã gửi lời mời'
                                                    : grp.status}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {grp.status !== 'joined' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleUpdateGroupStatus(grp.id, 'joined')}
                                                >
                                                    Đánh dấu đã vào
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                                                    <CheckCircle2 className="h-4 w-4" /> Đã xác nhận
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL: BẢNG DÙNG MẪU & MỞ ZALO (SPLIT WORKSPACE LAYOUT - EXPANDED SIZE) */}
            <Modal show={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} maxWidth="full">
                <div className="p-6 lg:p-8">
                    {/* Header Modal */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                        <div className="flex items-center gap-3 text-slate-900">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 shadow-sm">
                                <Send className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg leading-tight text-slate-900">
                                        Bảng Dùng Mẫu & Tiếp Cận Zalo (Outreach Studio)
                                    </h3>
                                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Workspace Rộng
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tra cứu KOC theo @handle (TikTok, IG, YT), tên hoặc SĐT, tự động cá nhân hóa nội dung và 1-click mở Zalo
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsActionModalOpen(false)}
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Bố Cục 2 Cột Chuyên Nghiệp */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                        {/* CỘT TRÁI (7 COLS - 58%): BẢNG CHỌN KOC VỚI TÌM KIẾM THEO @HANDLE, TÊN, SĐT */}
                        <div className="lg:col-span-7 flex flex-col justify-between border-r border-slate-200 lg:pr-8">
                            <div>
                                {/* Hàng 1: Bộ lọc chiến dịch & Trạng thái */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                                            <span>Chiến Dịch</span>
                                            <span className="text-rose-500 font-bold">*</span>
                                            <span className="text-[10px] text-slate-400 font-normal lowercase">(bắt buộc chọn trước)</span>
                                        </label>
                                        <select
                                            value={selectedCampaignId}
                                            onChange={(e) => {
                                                const val = e.target.value ? Number(e.target.value) : '';
                                                handleCampaignChange(val);
                                            }}
                                            className={`w-full rounded-xl text-xs py-2.5 font-medium transition-all shadow-2xs ${
                                                !selectedCampaignId
                                                    ? 'border-amber-400 bg-amber-50/70 text-amber-900 focus:border-amber-500 focus:ring-amber-500 ring-2 ring-amber-400/20 font-bold'
                                                    : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                                            }`}
                                        >
                                            <option value="">-- Vui lòng chọn chiến dịch trước --</option>
                                            {campaigns.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} ({c.campaign_creators.length} KOC)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                                            Trạng Thái Pipeline
                                        </label>
                                        <select
                                            value={statusFilter}
                                            disabled={!selectedCampaignId}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                            className="w-full rounded-xl border-slate-300 text-xs focus:border-primary-500 focus:ring-primary-500 py-2.5 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                        >
                                            <option value="all">Tất cả trạng thái</option>
                                            <option value="new">Mới thêm (Chưa liên hệ)</option>
                                            <option value="contacted">Đã liên hệ</option>
                                            <option value="agreed">Chốt hợp tác</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Hàng 2: Thanh tìm kiếm thông minh theo @handle, Tên, Số điện thoại */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                            <AtSign className="h-3.5 w-3.5 text-primary-600" />
                                            Tìm Kiếm KOC Theo @Handle, Tên Hoặc Số Điện Thoại
                                        </label>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {selectedCampaignId ? `${filteredKocs.length} kết quả` : 'Chờ chọn chiến dịch'}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <AtSign className="absolute left-3.5 top-3 h-4 w-4 text-primary-500" />
                                        <input
                                            type="text"
                                            value={searchKocQuery}
                                            disabled={!selectedCampaignId}
                                            onChange={(e) => setSearchKocQuery(e.target.value)}
                                            placeholder={
                                                !selectedCampaignId
                                                    ? 'Vui lòng chọn chiến dịch phía trên trước để tìm kiếm KOC...'
                                                    : 'Nhập @handle (vd: @thuthao, @linhbui...), tên KOC hoặc SĐT...'
                                            }
                                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border-slate-300 text-sm focus:border-primary-500 focus:ring-primary-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                        />
                                        {searchKocQuery && (
                                            <button
                                                onClick={() => setSearchKocQuery('')}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                        <span>*</span>
                                        <span>Ưu tiên tìm kiếm nhanh theo <strong>@handle</strong> mạng xã hội (TikTok, Instagram, YouTube, Facebook), tên thật hoặc số điện thoại.</span>
                                    </p>
                                </div>

                                {/* Hàng 3: BẢNG DANH SÁCH KOC GỌN GÀNG & RỘNG RÃI */}
                                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                                    <div className="max-h-[500px] min-h-[440px] overflow-y-auto">
                                        <table className="w-full text-left text-xs text-slate-600">
                                            <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-600 sticky top-0 z-10 border-b border-slate-200">
                                                <tr>
                                                    <th className="py-2.5 px-3.5">KOC & @Handle Mạng Xã Hội</th>
                                                    <th className="py-2.5 px-3.5 w-32">Lĩnh Vực & Hạng</th>
                                                    <th className="py-2.5 px-3.5 w-36">Số Điện Thoại</th>
                                                    <th className="py-2.5 px-3.5 w-28 text-center">Trạng Thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {!selectedCampaignId ? (
                                                    <tr>
                                                        <td colSpan={4} className="py-20 text-center">
                                                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto px-4">
                                                                <div className="h-14 w-14 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-3 border border-amber-200 shadow-2xs">
                                                                    <FolderKanban className="h-7 w-7 text-amber-600" />
                                                                </div>
                                                                <span className="font-bold text-slate-800 text-sm">
                                                                    Vui lòng chọn chiến dịch trước
                                                                </span>
                                                                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                                                                    Danh sách KOC được ẩn để đảm bảo bạn tiếp cận đúng Creator thuộc chiến dịch tương ứng. Hãy chọn một chiến dịch ở menu phía trên để hiển thị danh sách.
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredKocs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="py-16 text-center">
                                                            <div className="flex flex-col items-center justify-center max-w-xs mx-auto px-4">
                                                                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                                                                    <Users className="h-6 w-6" />
                                                                </div>
                                                                <span className="font-bold text-slate-700 text-sm">
                                                                    Không tìm thấy KOC nào
                                                                </span>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {searchKocQuery
                                                                        ? 'Không có KOC nào khớp với từ khóa tìm kiếm.'
                                                                        : 'Chiến dịch này chưa được thêm KOC nào hoặc không có KOC ở trạng thái đã chọn.'}
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredKocs.map((cc) => {
                                                        const isSelected = selectedPivotId === cc.id;
                                                        return (
                                                            <tr
                                                                key={cc.id}
                                                                onClick={() => handleSelectKocRow(cc.id)}
                                                                className={`cursor-pointer transition-colors ${
                                                                    isSelected
                                                                        ? 'bg-primary-50/90 font-medium text-primary-950 border-l-4 border-l-primary-600'
                                                                        : 'hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <td className="py-3 px-3.5">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                                                            isSelected ? 'bg-primary-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                                                                        }`}>
                                                                            {cc.creator?.name?.charAt(0)?.toUpperCase() || 'K'}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                                                                <span className="truncate">{cc.creator?.name || 'Chưa có tên'}</span>
                                                                                {isSelected && (
                                                                                    <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />
                                                                                )}
                                                                            </div>
                                                                            {/* Badges @handle */}
                                                                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                                                {cc.creator?.accounts && cc.creator.accounts.length > 0 ? (
                                                                                    cc.creator.accounts.map((acc: any) => (
                                                                                        <span
                                                                                            key={acc.id}
                                                                                            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                                                                                                isSelected
                                                                                                    ? 'bg-primary-100/90 text-primary-800 border border-primary-200'
                                                                                                    : 'bg-violet-50 text-violet-700 border border-violet-200/60'
                                                                                            }`}
                                                                                            title={`${acc.platform}: @${acc.handle}`}
                                                                                        >
                                                                                            <span className="text-[9px] uppercase font-bold opacity-75">{acc.platform}</span>
                                                                                            <span>@{acc.handle.replace(/^@/, '')}</span>
                                                                                            {acc.followers_count ? (
                                                                                                <span className="text-[10px] opacity-75">
                                                                                                    ({acc.followers_count >= 1000000
                                                                                                        ? (acc.followers_count / 1000000).toFixed(1) + 'M'
                                                                                                        : (acc.followers_count / 1000).toFixed(0) + 'k'})
                                                                                                </span>
                                                                                            ) : null}
                                                                                        </span>
                                                                                    ))
                                                                                ) : (
                                                                                    <span className="text-[11px] font-mono text-slate-400 italic">
                                                                                        Chưa có @handle
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-3.5">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="uppercase text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-fit">
                                                                            {cc.creator?.tier || 'nano'}
                                                                        </span>
                                                                        <span className="text-xs text-slate-500 font-medium">{cc.creator?.niche || 'lifestyle'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-3.5 font-mono text-slate-700 font-medium">
                                                                    {cc.creator?.phone ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                                            <span>{cc.creator.phone}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400 italic">Chưa có SĐT</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-3 px-3.5 text-center">
                                                                    {getStatusBadge(cc.status)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Dòng tóm tắt phía dưới bảng */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>
                                    {!selectedCampaignId ? (
                                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                            Chưa chọn chiến dịch
                                        </span>
                                    ) : (
                                        <>
                                            Hiển thị <strong>{filteredKocs.length}</strong> / {allAvailableCreators.length} KOC
                                        </>
                                    )}
                                </span>
                                {selectedKoc && (
                                    <span className="text-primary-700 font-semibold truncate max-w-[320px]">
                                        Đang chọn: {selectedKoc.creator?.name} {selectedKoc.creator?.accounts?.[0]?.handle ? `(@${selectedKoc.creator.accounts[0].handle.replace(/^@/, '')})` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* CỘT PHẢI (5 COLS - 42%): NỘI DUNG MẪU & THAO TÁC ZALO */}
                        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                            <div className="space-y-4">
                                {/* Chọn Mẫu Tin */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Chọn Mẫu Tin Nhắn
                                        </label>
                                        <span className="text-[11px] text-primary-600 font-medium">
                                            {templates.length} mẫu có sẵn
                                        </span>
                                    </div>
                                    <select
                                        value={selectedTemplateId}
                                        onChange={(e) => handleSelectTemplate(Number(e.target.value))}
                                        className="w-full rounded-xl border-slate-300 text-xs focus:border-primary-500 focus:ring-primary-500 py-2.5 font-medium"
                                    >
                                        {templates.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.channel === 'zalo_personal' ? 'Zalo Cá Nhân' : t.channel})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Thông tin KOC được chọn */}
                                {selectedKoc ? (
                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 font-bold text-sm shrink-0">
                                                    {selectedKoc.creator?.name?.charAt(0)?.toUpperCase() || 'K'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                        <span>{selectedKoc.creator?.name}</span>
                                                        <span className="uppercase text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                                                            {selectedKoc.creator?.tier || 'nano'}
                                                        </span>
                                                    </div>

                                                    {/* Danh sách các tài khoản mạng xã hội của KOC */}
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                        {selectedKoc.creator?.accounts && selectedKoc.creator.accounts.length > 0 ? (
                                                            selectedKoc.creator.accounts.map((acc: any) => (
                                                                <span
                                                                    key={acc.id}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-violet-100/70 text-violet-800 border border-violet-200"
                                                                >
                                                                    <span className="text-[9px] uppercase font-bold text-violet-600">{acc.platform}</span>
                                                                    <span>@{acc.handle.replace(/^@/, '')}</span>
                                                                    {acc.followers_count ? (
                                                                        <span className="text-[10px] text-violet-500">
                                                                            ({acc.followers_count >= 1000000
                                                                                ? (acc.followers_count / 1000000).toFixed(1) + 'M'
                                                                                : (acc.followers_count / 1000).toFixed(0) + 'k'})
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs font-mono text-slate-400 italic">
                                                                Chưa có @handle
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 font-mono mt-1.5 flex items-center gap-1">
                                                        <Phone className="h-3 w-3 text-slate-400" />
                                                        <span>{selectedKoc.creator?.phone || 'Chưa cập nhật SĐT'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {zaloDeepLink && (
                                                <a
                                                    href={zaloDeepLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 bg-white px-3 py-1.5 rounded-lg border border-primary-200 shadow-2xs hover:bg-primary-50 hover:border-primary-300 transition-colors shrink-0"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    <span>Mở Zalo</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-xs flex items-center gap-2.5">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                                        <span>
                                            {!selectedCampaignId
                                                ? 'Vui lòng chọn chiến dịch ở cột bên trái trước để hiển thị danh sách KOC.'
                                                : 'Vui lòng chọn 1 KOC ở bảng bên trái để xem trước và cá nhân hóa tin nhắn.'}
                                        </span>
                                    </div>
                                )}

                                {/* Cảnh báo nếu số điện thoại này đã Opt-Out */}
                                {isOptedOut && (
                                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-xs flex items-start gap-2.5">
                                        <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                                        <div>
                                            <span className="font-bold">CẢNH BÁO OPT-OUT:</span> KOC này đã từ chối nhận tin nhắn tiếp cận. Hệ thống đã khóa nút gửi để tránh vi phạm chính sách!
                                        </div>
                                    </div>
                                )}

                                {/* Vùng Xem Trước & Soạn Thảo Nội Dung */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Nội Dung Cá Nhân Hóa (Xem trước)
                                        </label>
                                        {previewLoading && (
                                            <span className="text-[11px] text-primary-600 font-semibold animate-pulse">
                                                Đang render...
                                            </span>
                                        )}
                                    </div>

                                    <textarea
                                        value={renderedText}
                                        onChange={(e) => setRenderedText(e.target.value)}
                                        rows={13}
                                        className="w-full rounded-xl border-slate-300 text-xs font-mono text-slate-800 focus:border-primary-500 focus:ring-primary-500 leading-relaxed shadow-2xs p-3.5"
                                        placeholder={
                                            !selectedCampaignId
                                                ? 'Vui lòng chọn chiến dịch và KOC ở cột bên trái để tự động tạo nội dung...'
                                                : !selectedPivotId
                                                ? 'Vui lòng chọn KOC để xem trước nội dung tin nhắn...'
                                                : 'Chọn KOC và mẫu tin để tự động tạo nội dung...'
                                        }
                                    />

                                    {/* Thanh công cụ phụ: Nút Copy nhanh & Biến */}
                                    <div className="mt-2 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={handleCopyOnly}
                                            disabled={!renderedText}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary-600 transition-colors disabled:opacity-50"
                                        >
                                            {copiedText ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span className="text-emerald-600">Đã copy nội dung</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5" />
                                                    <span>Sao chép nội dung</span>
                                                </>
                                            )}
                                        </button>

                                        {portalLink && (
                                            <button
                                                type="button"
                                                onClick={handleCopyPortalLink}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary-600 transition-colors"
                                            >
                                                {copiedLink ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                        <span className="text-emerald-600">Đã copy link Portal</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        <span>Copy link Portal KOC</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Tag biến hỗ trợ */}
                                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                                        <span className="font-semibold text-slate-500">Biến:</span>
                                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                            {'{creator_name}'}
                                        </span>
                                        <span className="font-mono bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-200 font-semibold">
                                            {'{handle}'}
                                        </span>
                                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                            {'{product_name}'}
                                        </span>
                                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                            {'{rate}'}
                                        </span>
                                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                            {'{portal_link}'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Nút Hành Động Dưới Cùng */}
                            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                                {sendSuccess ? (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fadeIn">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Đã chuyển trạng thái sang <strong>Đã liên hệ</strong>. Chọn KOC tiếp theo bên trái để tiếp tục!</span>
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-slate-400">
                                        * Popup luôn giữ mở để bạn xử lý liên tục nhiều KOC
                                    </span>
                                )}

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <Button variant="secondary" onClick={() => setIsActionModalOpen(false)}>
                                        Đóng Popup
                                    </Button>
                                    <Button
                                        variant="primary"
                                        iconLeft={
                                            sendSuccess ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : copiedText ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )
                                        }
                                        disabled={!selectedPivotId || !renderedText || isOptedOut}
                                        onClick={handleSendAndOpenZalo}
                                        className={`w-full sm:w-auto transition-colors ${
                                            sendSuccess ? '!bg-emerald-600 hover:!bg-emerald-700 focus:!ring-emerald-500' : ''
                                        }`}
                                    >
                                        {sendSuccess
                                            ? 'Đã Đổi Trạng Thái & Mở Zalo'
                                            : copiedText
                                            ? 'Đã Sao Chép & Đang Mở Zalo...'
                                            : 'Sao Chép & Mở Zalo Chat'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL 2: TẠO / SỬA MẪU TIN NHẮN */}
            <Modal show={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} maxWidth="lg">
                <form onSubmit={handleSaveTemplate} className="p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                        {editingTemplate ? 'Chỉnh Sửa Mẫu Tin Nhắn' : 'Tạo Mẫu Tin Nhắn Mới'}
                    </h3>

                    <div className="space-y-4">
                        <FormField label="Tên mẫu tin nhắn" error={templateForm.errors.name} required>
                            <TextInput
                                value={templateForm.data.name}
                                onChange={(e) => templateForm.setData('name', e.target.value)}
                                placeholder="Ví dụ: Nhắc Zalo: Đôn đốc Hạn nộp Video"
                                required
                            />
                        </FormField>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Phân loại mẫu tin (Mục đích)" error={templateForm.errors.type}>
                                <select
                                    value={templateForm.data.type || 'custom'}
                                    onChange={(e) => templateForm.setData('type', e.target.value)}
                                    className="w-full rounded-lg border-slate-300 text-sm focus:border-primary-500 focus:ring-primary-500 font-medium"
                                >
                                    <option value="custom">Mẫu tiếp cận tùy biến chung</option>
                                    <option value="remind_deadline">⚡ Nhắc Zalo 1-Chạm: Đôn đốc Hạn nộp Video</option>
                                    <option value="remind_receipt">⚡ Nhắc Zalo 1-Chạm: Nhắc Xác Nhận Đã Nhận Mẫu</option>
                                    <option value="brief_outreach">⚡ Nhắc Zalo 1-Chạm: Gửi Brief & Chào Mời</option>
                                    <option value="shipping_notice">⚡ Nhắc Zalo 1-Chạm: Báo Đã Gửi Mẫu Cho Kho</option>
                                </select>
                            </FormField>

                            <FormField label="Kênh tiếp cận" error={templateForm.errors.channel} required>
                                <select
                                    value={templateForm.data.channel}
                                    onChange={(e) => templateForm.setData('channel', e.target.value)}
                                    className="w-full rounded-lg border-slate-300 text-sm focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="zalo_personal">Zalo Cá Nhân (Bán tự động qua link zalo.me)</option>
                                    <option value="zalo_oa">Zalo Official Account (ZNS)</option>
                                    <option value="email">Email</option>
                                    <option value="direct_message">Tin nhắn trực tiếp (Direct Message)</option>
                                </select>
                            </FormField>
                        </div>

                        {templateForm.data.type && templateForm.data.type !== 'custom' && (
                            <div className="rounded-xl bg-amber-50/90 p-3.5 text-xs text-amber-900 border border-amber-200/80 flex items-start gap-2.5">
                                <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Đồng bộ Nhắc Việc Zalo 1-Chạm:</span>
                                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                                        Nội dung mẫu này sẽ được tải trực tiếp khi nhân viên bấm nút <strong>"Nhắc Zalo"</strong> trên Kanban, Bàn làm việc Booking và Ma trận KOC.
                                    </p>
                                </div>
                            </div>
                        )}

                        <FormField label="Tiêu đề (nếu có)" error={templateForm.errors.subject}>
                            <TextInput
                                value={templateForm.data.subject}
                                onChange={(e) => templateForm.setData('subject', e.target.value)}
                                placeholder="Lời mời hợp tác..."
                            />
                        </FormField>

                        <FormField
                            label="Nội dung mẫu (Chứa placeholder)"
                            error={templateForm.errors.content_template}
                            required
                        >
                            <div className="mb-2">
                                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                                    Bấm vào biến bên dưới để chèn nhanh vào nội dung:
                                </span>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                                    {variableChips.map((chip) => (
                                        <button
                                            key={chip.tag}
                                            type="button"
                                            onClick={() => insertVariableTag(chip.tag)}
                                            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-mono text-primary-700 border border-slate-200 hover:border-primary-400 hover:bg-primary-50 transition-colors shadow-2xs"
                                            title={chip.desc}
                                        >
                                            <span className="font-bold">{chip.tag}</span>
                                            <span className="text-[10px] text-slate-400">({chip.desc})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Textarea
                                value={templateForm.data.content_template}
                                onChange={(e) => templateForm.setData('content_template', e.target.value)}
                                rows={7}
                                placeholder="Chào bạn {creator_name}, mình từ nhãn hàng..."
                                required
                            />
                        </FormField>

                        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                            <span className="font-bold text-slate-800">Các biến ngữ cảnh thông minh:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11px] font-mono text-slate-700">
                                <div><span className="text-primary-700 font-bold">{'{creator_name}'}</span>: Tên của KOC</div>
                                <div><span className="text-primary-700 font-bold">{'{staff_name}'}</span>: Tên nhân viên phụ trách</div>
                                <div><span className="text-primary-700 font-bold">{'{product_name}'}</span>: Sản phẩm chiến dịch</div>
                                <div><span className="text-primary-700 font-bold">{'{campaign_name}'}</span>: Tên chiến dịch</div>
                                <div><span className="text-primary-700 font-bold">{'{portal_link}'}</span>: Link Cổng Portal KOC</div>
                                <div><span className="text-primary-700 font-bold">{'{deadline_text}'}</span>: Đếm ngược deadline</div>
                                <div><span className="text-primary-700 font-bold">{'{sent_date_text}'}</span>: Ngày gửi hàng</div>
                                <div><span className="text-primary-700 font-bold">{'{hashtags}'}</span>: Hashtag chiến dịch</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>
                            Đóng
                        </Button>
                        <Button variant="primary" type="submit" disabled={templateForm.processing}>
                            {editingTemplate ? 'Lưu Thay Đổi' : 'Tạo Mẫu Tin'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL 3: THÊM SỐ VÀO DANH SÁCH OPT-OUT */}
            <Modal show={isOptOutModalOpen} onClose={() => setIsOptOutModalOpen(false)} maxWidth="md">
                <form onSubmit={handleSaveOptOut} className="p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2 text-rose-600">
                        <ShieldAlert className="h-5 w-5" />
                        <span>Thêm Số Điện Thoại Từ Chối (Opt-out)</span>
                    </h3>

                    <div className="space-y-4">
                        <FormField label="Số điện thoại cần chặn" error={optOutForm.errors.phone} required>
                            <TextInput
                                value={optOutForm.data.phone}
                                onChange={(e) => optOutForm.setData('phone', e.target.value)}
                                placeholder="0912345678"
                                required
                            />
                        </FormField>

                        <FormField label="Email (tùy chọn)" error={optOutForm.errors.email}>
                            <TextInput
                                type="email"
                                value={optOutForm.data.email}
                                onChange={(e) => optOutForm.setData('email', e.target.value)}
                                placeholder="koc@gmail.com"
                            />
                        </FormField>

                        <FormField label="Lý do từ chối" error={optOutForm.errors.reason}>
                            <TextInput
                                value={optOutForm.data.reason}
                                onChange={(e) => optOutForm.setData('reason', e.target.value)}
                                placeholder="KOC yêu cầu không liên hệ lại..."
                            />
                        </FormField>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsOptOutModalOpen(false)}>
                            Đóng
                        </Button>
                        <Button variant="danger" type="submit" disabled={optOutForm.processing}>
                            Xác Nhận Chặn
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
