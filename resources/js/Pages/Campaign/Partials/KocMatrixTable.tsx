import React, { useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    Search,
    Filter,
    CheckSquare,
    Square,
    MessageCircle,
    Copy,
    Check,
    Clock,
    AlertTriangle,
    Package,
    Truck,
    Video,
    CheckCircle2,
    XCircle,
    UserX,
    Users,
    Trash2,
    DollarSign,
    ExternalLink,
    ChevronDown,
    Flame,
    Sparkles,
    ShieldAlert,
    Edit3,
    X,
    Send,
    PhoneCall,
    Share2,
    TrendingUp,
    Plus,
    MapPin,
} from 'lucide-react';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import Button from '@/Components/Common/Button';
import QuickZaloReminderModal from '@/Components/Outreach/QuickZaloReminderModal';

export interface CreatorAccount {
    id: number;
    platform: string;
    handle: string;
    followers_count: number;
}

export interface Creator {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    shipping_address: string | null;
    city_province: string | null;
    district: string | null;
    ward: string | null;
    niche: string;
    tier: string;
    trust_score?: number;
    blacklist_status?: boolean;
    accounts: CreatorAccount[];
}

export interface DeadlineInfo {
    status: 'safe' | 'warning' | 'overdue';
    days: number;
    text: string;
    date: string;
}

export interface ContentPostItem {
    id: number;
    platform: string;
    post_url: string;
    video_title?: string | null;
    posted_at?: string | null;
    status: string;
    views_count?: number;
    likes_count?: number;
    comments_count?: number;
    benchmark?: {
        average_channel_views: number;
        current_views: number;
        ratio: number;
        status: string;
        label: string;
    };
}

export interface CampaignCreatorPivot {
    id: number;
    campaign_id: number;
    creator_id: number;
    assigned_to: number | null;
    status: string;
    booking_fee: string | number;
    commission_rate?: string | number;
    portal_token: string | null;
    portal_token_expires_at?: string | null;
    notes: string | null;
    sample_received_at?: string | null;
    sample_sent_at?: string | null;
    posted_at?: string | null;
    creator: Creator;
    assignee?: { id: number; name: string; email: string } | null;
    deadline_info?: DeadlineInfo | null;
    content_posts?: ContentPostItem[];
    contentPosts?: ContentPostItem[];
}

export interface Campaign {
    id: number;
    name: string;
    product_name: string;
    budget: string | number;
    target_creators_count: number;
    video_deadline_days?: number;
    status: string;
}

interface Props {
    campaign: Campaign;
    items: CampaignCreatorPivot[];
    staffUsers: { id: number; name: string; email: string }[];
    onOpenAddModal: () => void;
}

type StageType = 'all' | 'outreach' | 'shipping' | 'production' | 'completion';
type RiskFilterType = 'all' | 'overdue' | 'warning' | 'missing_address' | 'no_phone';

export const STATUS_DEFINITIONS: Record<
    string,
    { label: string; stage: 'outreach' | 'shipping' | 'production' | 'completion'; badge: BadgeVariant }
> = {
    new: { label: 'Mới thêm', stage: 'outreach', badge: 'default' },
    contacted: { label: 'Đã liên hệ', stage: 'outreach', badge: 'primary' },
    agreed: { label: 'Đã chốt hợp tác', stage: 'outreach', badge: 'primary' },
    address_confirmed: { label: 'Đã chốt địa chỉ', stage: 'shipping', badge: 'primary' },
    sample_sent: { label: 'Đã gửi mẫu', stage: 'shipping', badge: 'warning' },
    sample_received: { label: 'Đã nhận mẫu (Đang làm video)', stage: 'shipping', badge: 'warning' },
    posted: { label: 'Đã lên video', stage: 'production', badge: 'success' },
    completed: { label: 'Nghiệm thu hoàn tất', stage: 'completion', badge: 'success' },
    declined: { label: 'Từ chối', stage: 'completion', badge: 'danger' },
    no_show: { label: 'Bom hàng / Mất tích', stage: 'completion', badge: 'danger' },
};

export default function KocMatrixTable({
    campaign,
    items,
    staffUsers,
    onOpenAddModal,
}: Props) {
    const [currentStage, setCurrentStage] = useState<StageType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
    const [riskFilter, setRiskFilter] = useState<RiskFilterType>('all');

    // Quản lý chọn hàng loạt
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
    const [bulkSelectedStatus, setBulkSelectedStatus] = useState<string>('contacted');
    const [bulkSelectedStaff, setBulkSelectedStaff] = useState<string>('');
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Chốt hợp tác modal
    const [dealModalItem, setDealModalItem] = useState<CampaignCreatorPivot | null>(null);
    const [dealFee, setDealFee] = useState<string>('0');
    const [quickZaloPivotId, setQuickZaloPivotId] = useState<number | null>(null);
    const [dealNotes, setDealNotes] = useState<string>('');

    // Inline edit fee
    const [editingFeeId, setEditingFeeId] = useState<number | null>(null);
    const [tempFeeValue, setTempFeeValue] = useState<string>('');

    // Modal Xác Nhận Gửi Mẫu (Tinh giản cho booking: không cần carrier, tracking, fee)
    const [shipmentModalItem, setShipmentModalItem] = useState<CampaignCreatorPivot | null>(null);
    const [shipmentNotes, setShipmentNotes] = useState<string>('');
    const [shipmentDate, setShipmentDate] = useState<string>('');
    const [shipmentSubmitting, setShipmentSubmitting] = useState<boolean>(false);
    const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

    // Form Nhập Nhanh Địa Chỉ nhận hàng ngay tại Modal Gửi Mẫu
    const [quickAddress, setQuickAddress] = useState<string>('');
    const [quickCity, setQuickCity] = useState<string>('');
    const [quickDistrict, setQuickDistrict] = useState<string>('');
    const [quickWard, setQuickWard] = useState<string>('');
    const [quickPhone, setQuickPhone] = useState<string>('');
    const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);

    // Modal Thêm Video (1 KOC nhiều video)
    const [videoModalItem, setVideoModalItem] = useState<CampaignCreatorPivot | null>(null);
    const [videoPlatform, setVideoPlatform] = useState<string>('tiktok');
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [videoTitle, setVideoTitle] = useState<string>('');
    const [videoPostedAt, setVideoPostedAt] = useState<string>('');
    const [videoSubmitting, setVideoSubmitting] = useState<boolean>(false);

    // Feedback copy link portal
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Toast notification mini
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const showFeedback = (msg: string) => {
        setFeedbackMessage(msg);
        setTimeout(() => setFeedbackMessage(null), 3000);
    };

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(val) || 0);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    // Phân loại số lượng theo từng chặng
    const stageCounts = useMemo(() => {
        const counts = {
            all: items.length,
            outreach: 0,
            shipping: 0,
            production: 0,
            completion: 0,
        };

        items.forEach((item) => {
            const st = item.status;
            if (['new', 'contacted', 'agreed'].includes(st)) counts.outreach++;
            if (['address_confirmed', 'sample_sent', 'sample_received'].includes(st)) counts.shipping++;
            if (['sample_received', 'posted'].includes(st)) counts.production++;
            if (['completed', 'declined', 'no_show'].includes(st)) counts.completion++;
        });

        return counts;
    }, [items]);

    // Lọc dữ liệu theo Stage, Tìm kiếm, Rủi ro và Nhân sự
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            // Lọc theo Stage
            if (currentStage === 'outreach' && !['new', 'contacted', 'agreed'].includes(item.status)) return false;
            if (currentStage === 'shipping' && !['address_confirmed', 'sample_sent', 'sample_received'].includes(item.status)) return false;
            if (currentStage === 'production' && !['sample_received', 'posted'].includes(item.status)) return false;
            if (currentStage === 'completion' && !['completed', 'declined', 'no_show'].includes(item.status)) return false;

            // Lọc theo Staff
            if (selectedStaffFilter !== 'all') {
                if (selectedStaffFilter === 'unassigned' && item.assigned_to) return false;
                if (selectedStaffFilter !== 'unassigned' && String(item.assigned_to) !== selectedStaffFilter) return false;
            }

            // Lọc theo Risk Filter
            if (riskFilter === 'overdue' && item.deadline_info?.status !== 'overdue') return false;
            if (riskFilter === 'warning' && item.deadline_info?.status !== 'warning') return false;
            if (riskFilter === 'missing_address' && Boolean(item.creator?.shipping_address)) return false;
            if (riskFilter === 'no_phone' && Boolean(item.creator?.phone)) return false;

            // Tìm kiếm Text
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = item.creator?.name?.toLowerCase().includes(q);
                const phoneMatch = item.creator?.phone?.toLowerCase().includes(q);
                const nicheMatch = item.creator?.niche?.toLowerCase().includes(q);
                const handleMatch = item.creator?.accounts?.some((acc) =>
                    acc.handle?.toLowerCase().includes(q)
                );
                if (!nameMatch && !phoneMatch && !nicheMatch && !handleMatch) return false;
            }

            return true;
        });
    }, [items, currentStage, selectedStaffFilter, riskFilter, searchQuery]);

    // Đếm số KOC chưa có địa chỉ trong số các KOC được chọn
    const bulkMissingAddressCount = useMemo(() => {
        return selectedIds.filter((id) => {
            const item = items.find((c) => c.id === id);
            return !item?.creator?.shipping_address?.trim();
        }).length;
    }, [selectedIds, items]);

    // Đếm số KOC chưa gửi mẫu trong số các KOC được chọn
    const bulkNotSentCount = useMemo(() => {
        return selectedIds.filter((id) => {
            const item = items.find((c) => c.id === id);
            return !item?.sample_sent_at && !['sample_sent', 'sample_received', 'posted', 'completed'].includes(item?.status || '');
        }).length;
    }, [selectedIds, items]);

    // Chọn / Bỏ chọn dòng
    const handleToggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map((item) => item.id));
        }
    };

    // Copy link portal
    const handleCopyPortal = (token: string | null) => {
        if (!token) return;
        const link = `${window.location.origin}/portal/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        showFeedback('Đã sao chép link Portal vào clipboard!');
        setTimeout(() => setCopiedToken(null), 2500);
    };

    // Mở Zalo thông minh theo ngữ cảnh
    const handleOpenZalo = (item: CampaignCreatorPivot) => {
        setQuickZaloPivotId(item.id);
    };

    // Chuyển trạng thái nhanh 1 dòng
    const handleQuickStatusChange = (itemOrId: CampaignCreatorPivot | number, newStatus: string, notes?: string) => {
        const item = typeof itemOrId === 'number'
            ? items.find((c) => c.id === itemOrId)
            : itemOrId;
        const pivotId = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;

        // RÀNG BUỘC NGHIỆP VỤ 1: Không thể chuyển sang "sample_sent" nếu chưa có địa chỉ nhận hàng
        if (newStatus === 'sample_sent') {
            const hasAddress = Boolean(item?.creator?.shipping_address?.trim());
            if (!hasAddress) {
                // Tự động mở Modal Gửi Mẫu kèm Form Nhập Nhanh Địa Chỉ
                if (item) {
                    handleOpenShipmentModal(item);
                }
                showFeedback(`KOC ${item ? `[${item.creator.name}] ` : ''}chưa có địa chỉ nhận hàng. Vui lòng nhập địa chỉ trước khi xác nhận gửi mẫu.`);
                return;
            }
        }

        // RÀNG BUỘC NGHIỆP VỤ 2: Không thể chuyển sang "sample_received" hoặc "posted" nếu chưa gửi mẫu
        if (['sample_received', 'posted'].includes(newStatus)) {
            const isSent = Boolean(item?.sample_sent_at) || ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item?.status || '');
            if (!isSent) {
                alert(`Không thể chuyển sang [${STATUS_DEFINITIONS[newStatus]?.label || newStatus}] vì KOC ${item ? `[${item.creator.name}] ` : ''}chưa được gửi mẫu sản phẩm.`);
                return;
            }
        }

        // RÀNG BUỘC NGHIỆP VỤ 3: Không thể chuyển sang "posted" nếu chưa có link video
        if (newStatus === 'posted') {
            const hasVideo = Boolean((item?.content_posts && item.content_posts.length > 0) || (item?.contentPosts && item.contentPosts.length > 0));
            if (!hasVideo) {
                // Tự động mở Modal Thêm Video để nhân viên điền link
                if (item) {
                    handleOpenVideoModal(item);
                }
                showFeedback(`KOC ${item ? `[${item.creator.name}] ` : ''}chưa có link video. Vui lòng nhập link video để chuyển sang trạng thái Đã lên video.`);
                return;
            }
        }

        router.patch(
            route('pipeline.status.update', pivotId),
            { status: newStatus, notes },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback(`Đã chuyển trạng thái sang [${STATUS_DEFINITIONS[newStatus]?.label || newStatus}]`);
                },
                onError: (errors) => {
                    alert(errors.status || errors.error || (typeof errors === 'object' ? Object.values(errors)[0] : '') || 'Có lỗi xảy ra khi cập nhật trạng thái.');
                },
            }
        );
    };

    // Lưu inline edit phí booking
    const handleSaveInlineFee = (pivotId: number) => {
        const fee = parseFloat(tempFeeValue);
        if (isNaN(fee) || fee < 0) {
            setEditingFeeId(null);
            return;
        }

        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId }),
            { booking_fee: fee },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingFeeId(null);
                    showFeedback('Đã cập nhật phí booking thành công!');
                },
            }
        );
    };

    // Gán nhân viên phụ trách trực tiếp
    const handleInlineAssign = (pivotId: number, staffId: string) => {
        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId }),
            { assigned_to: staffId ? parseInt(staffId, 10) : null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback('Đã phân công nhân viên phụ trách!');
                },
            }
        );
    };

    // Xóa KOC khỏi chiến dịch
    const handleRemoveCreator = (pivotId: number, name: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa KOC [${name}] khỏi chiến dịch này?`)) {
            return;
        }

        router.delete(
            route('campaigns.creators.remove', { id: campaign.id, pivotId }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback(`Đã xóa KOC [${name}] khỏi chiến dịch.`);
                },
                onError: (err) => {
                    alert(err.error || 'Không thể xóa KOC này.');
                },
            }
        );
    };

    // Xử lý cập nhật hàng loạt trạng thái
    const handleExecuteBulkStatus = () => {
        if (selectedIds.length === 0) return;

        setBulkProcessing(true);
        router.post(
            route('campaigns.creators.bulk-status', campaign.id),
            {
                ids: selectedIds,
                status: bulkSelectedStatus,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsBulkStatusModalOpen(false);
                    setSelectedIds([]);
                    setBulkProcessing(false);
                    showFeedback(`Đã cập nhật hàng loạt trạng thái sang [${STATUS_DEFINITIONS[bulkSelectedStatus]?.label}]!`);
                },
                onFinish: () => setBulkProcessing(false),
            }
        );
    };

    // Xử lý phân bổ nhân viên hàng loạt
    const handleExecuteBulkAssign = (staffId: string) => {
        if (selectedIds.length === 0) return;

        router.post(
            route('campaigns.creators.bulk-assign', campaign.id),
            {
                ids: selectedIds,
                assigned_to: staffId ? parseInt(staffId, 10) : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedIds([]);
                    showFeedback('Đã phân bổ nhân sự hàng loạt thành công!');
                },
            }
        );
    };

    // Copy danh sách số điện thoại đã chọn
    const handleCopyPhones = () => {
        const phones = items
            .filter((i) => selectedIds.includes(i.id) && i.creator?.phone)
            .map((i) => i.creator.phone)
            .join(', ');

        if (!phones) {
            alert('Các KOC đã chọn chưa có số điện thoại!');
            return;
        }

        navigator.clipboard.writeText(phones);
        showFeedback(`Đã copy ${selectedIds.length} số điện thoại vào clipboard!`);
    };

    // Chốt deal submit
    const handleSubmitDeal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!dealModalItem) return;

        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId: dealModalItem.id }),
            {
                status: 'agreed',
                booking_fee: parseFloat(dealFee) || 0,
                notes: dealNotes,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDealModalItem(null);
                    showFeedback(`Đã chốt hợp tác với [${dealModalItem.creator.name}] thành công!`);
                },
            }
        );
    };

    // Mở modal xác nhận gửi mẫu
    const handleOpenShipmentModal = (item: CampaignCreatorPivot) => {
        setShipmentModalItem(item);
        setShipmentNotes('');
        setShipmentDate(new Date().toISOString().split('T')[0]);
        setCopiedAddress(false);

        // Khởi tạo các giá trị nhập nhanh từ Creator hiện tại
        setQuickAddress(item.creator?.shipping_address || '');
        setQuickCity(item.creator?.city_province || '');
        setQuickDistrict(item.creator?.district || '');
        setQuickWard(item.creator?.ward || '');
        setQuickPhone(item.creator?.phone || '');

        // Tự động mở form nhập địa chỉ nếu Creator chưa có địa chỉ
        setIsEditingAddress(!item.creator?.shipping_address?.trim());
    };

    // Sao chép thông tin nhận mẫu gửi cho bộ phận kho
    const handleCopyWarehouseAddress = (item: CampaignCreatorPivot) => {
        const fullAddress = [
            item.creator.shipping_address,
            item.creator.ward,
            item.creator.district,
            item.creator.city_province,
        ]
            .filter(Boolean)
            .join(', ');

        const text = `TÊN KOC: ${item.creator.name}\nSĐT: ${item.creator.phone || 'Chưa có'}\nĐỊA CHỈ: ${fullAddress || 'Chưa cập nhật'}\nCHIẾN DỊCH: ${campaign.name} (${campaign.product_name})`;

        navigator.clipboard.writeText(text);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
    };

    // Xác nhận gửi mẫu cho KOC (tinh giản: hỗ trợ nhập nhanh địa chỉ giao hàng)
    const handleSubmitShipment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shipmentModalItem) return;

        const effectiveAddress = (quickAddress.trim() || shipmentModalItem.creator?.shipping_address?.trim() || '');
        if (!effectiveAddress) {
            alert('Vui lòng nhập địa chỉ nhận hàng của KOC trước khi xác nhận gửi mẫu.');
            return;
        }

        setShipmentSubmitting(true);
        router.post(
            route('campaigns.creators.shipments.store', { id: campaign.id, pivotId: shipmentModalItem.id }),
            {
                notes: shipmentNotes,
                shipped_at: shipmentDate || undefined,
                shipping_address: quickAddress.trim() || undefined,
                city_province: quickCity.trim() || undefined,
                district: quickDistrict.trim() || undefined,
                ward: quickWard.trim() || undefined,
                phone: quickPhone.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShipmentModalItem(null);
                    setShipmentSubmitting(false);
                    showFeedback('Đã xác nhận gửi mẫu thành công!');
                },
                onError: (err) => {
                    setShipmentSubmitting(false);
                    alert(err.error || Object.values(err)[0] || 'Không thể xác nhận gửi mẫu.');
                },
            }
        );
    };

    // Mở modal thêm video
    const handleOpenVideoModal = (item: CampaignCreatorPivot) => {
        const isSent = Boolean(item.sample_sent_at) || ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);
        if (!isSent) {
            alert(`Không thể thêm video cho KOC [${item.creator.name}] vì chưa gửi mẫu sản phẩm.`);
            return;
        }

        setVideoModalItem(item);
        setVideoPlatform('tiktok');
        setVideoUrl('');
        setVideoTitle('');
        setVideoPostedAt(new Date().toISOString().split('T')[0]);
    };

    // Thêm video mới cho KOC
    const handleSubmitVideo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoModalItem) return;

        if (!videoUrl.trim()) {
            alert('Vui lòng nhập đường link bài đăng / video!');
            return;
        }

        setVideoSubmitting(true);
        router.post(
            route('campaigns.creators.videos.store', { id: campaign.id, pivotId: videoModalItem.id }),
            {
                platform: videoPlatform,
                post_url: videoUrl.trim(),
                video_title: videoTitle.trim() || null,
                posted_at: videoPostedAt || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVideoModalItem(null);
                    setVideoSubmitting(false);
                    showFeedback('Đã thêm video thành công!');
                },
                onError: (err) => {
                    setVideoSubmitting(false);
                    alert(Object.values(err)[0] || 'Không thể thêm video.');
                },
            }
        );
    };

    return (
        <div className="space-y-4 relative">
            {/* Toast Mini Feedback */}
            {feedbackMessage && (
                <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{feedbackMessage}</span>
                </div>
            )}

            {/* PHẦN 1: BỘ CHUYỂN ĐỔI TAB 4 CHẶNG (STAGE FUNNEL TABS) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200">
                <button
                    type="button"
                    onClick={() => setCurrentStage('all')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all ${currentStage === 'all'
                            ? 'bg-white shadow-sm ring-1 ring-slate-200 text-slate-900'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold">Tất Cả KOC</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'}`}>
                            {stageCounts.all}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Toàn bộ danh sách</span>
                </button>

                <button
                    type="button"
                    onClick={() => setCurrentStage('outreach')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all ${currentStage === 'outreach'
                            ? 'bg-white shadow-sm ring-1 ring-indigo-200 text-indigo-900'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            1. Tiếp Cận & Chốt
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'outreach' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                            {stageCounts.outreach}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Mới ➔ Liên hệ ➔ Chốt</span>
                </button>

                <button
                    type="button"
                    onClick={() => setCurrentStage('shipping')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all ${currentStage === 'shipping'
                            ? 'bg-white shadow-sm ring-1 ring-amber-200 text-amber-900'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            2. Địa Chỉ & Gửi Mẫu
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'shipping' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                            {stageCounts.shipping}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Địa chỉ ➔ Gửi ➔ Đã nhận</span>
                </button>

                <button
                    type="button"
                    onClick={() => setCurrentStage('production')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all ${currentStage === 'production'
                            ? 'bg-white shadow-sm ring-1 ring-purple-200 text-purple-900'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            3. Sản Xuất & Video
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'production' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'}`}>
                            {stageCounts.production}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Hạn {campaign.video_deadline_days || 7} ngày ➔ Lên video</span>
                </button>

                <button
                    type="button"
                    onClick={() => setCurrentStage('completion')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl text-left transition-all col-span-2 md:col-span-1 ${currentStage === 'completion'
                            ? 'bg-white shadow-sm ring-1 ring-emerald-200 text-emerald-900'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            4. Hoàn Tất & Ngoại Lệ
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${currentStage === 'completion' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                            {stageCounts.completion}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">Nghiệm thu / Từ chối / Bom</span>
                </button>
            </div>

            {/* PHẦN 2: BỘ LỌC TÌM KIẾM & BỘ LỌC RỦI RO (RISK FILTER PILLS) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm KOC theo tên, SĐT, kênh TikTok, Niche..."
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
                    <button
                        type="button"
                        onClick={() => setRiskFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'all'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Tất cả rủi ro
                    </button>

                    <button
                        type="button"
                        onClick={() => setRiskFilter('overdue')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'overdue'
                                ? 'bg-rose-600 text-white'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                            }`}
                    >
                        <Clock className="h-3 w-3" />
                        Quá hạn video
                    </button>

                    <button
                        type="button"
                        onClick={() => setRiskFilter('warning')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'warning'
                                ? 'bg-amber-600 text-white'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                            }`}
                    >
                        <AlertTriangle className="h-3 w-3" />
                        Sắp đến hạn (&le; 2 ngày)
                    </button>

                    <button
                        type="button"
                        onClick={() => setRiskFilter('missing_address')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${riskFilter === 'missing_address'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                            }`}
                    >
                        <Package className="h-3 w-3" />
                        Chưa có địa chỉ
                    </button>

                    {/* Filter Nhân viên */}
                    <div className="border-l border-slate-200 pl-2 ml-1">
                        <select
                            value={selectedStaffFilter}
                            onChange={(e) => setSelectedStaffFilter(e.target.value)}
                            className="py-1 pl-2 pr-7 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                        >
                            <option value="all">Tất cả nhân sự</option>
                            <option value="unassigned">Chưa phân công</option>
                            {staffUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* PHẦN 3: BẢNG DỮ LIỆU TIẾN ĐỘ 1-CHẠM (INTERACTIVE PROGRESS MATRIX) */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="w-10 px-4 py-3.5 text-center">
                                    <input
                                        type="checkbox"
                                        checked={
                                            filteredItems.length > 0 &&
                                            selectedIds.length === filteredItems.length
                                        }
                                        onChange={handleSelectAll}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-4 py-3.5 min-w-[200px]">Creator / KOC</th>
                                <th className="px-4 py-3.5 min-w-[170px]">Trạng thái tiến độ</th>
                                <th className="px-4 py-3.5 min-w-[120px]">Hạn video</th>
                                <th className="px-4 py-3.5 min-w-[130px]">Gửi mẫu KOC</th>
                                <th className="px-4 py-3.5 min-w-[130px]">Video đã lên</th>
                                <th className="px-4 py-3.5 min-w-[120px]">Phí booking</th>
                                <th className="px-4 py-3.5 min-w-[130px]">Phụ trách</th>
                                <th className="px-4 py-3.5 min-w-[100px]">Cổng Portal</th>
                                <th className="px-4 py-3.5 min-w-[180px] text-right">Hành động 1-Chạm</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => {
                                    const isSelected = selectedIds.includes(item.id);
                                    const creator = item.creator;
                                    const mainAccount = creator?.accounts?.[0];
                                    const statusDef = STATUS_DEFINITIONS[item.status] || {
                                        label: item.status,
                                        stage: 'outreach',
                                        badge: 'default',
                                    };

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`transition-colors hover:bg-slate-50/80 ${isSelected ? 'bg-primary-50/30' : ''
                                                }`}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-3.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(item.id)}
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                />
                                            </td>

                                            {/* Creator Info */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700 text-xs shadow-2xs">
                                                        {creator?.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Link
                                                                href={route('creators.show', item.creator_id)}
                                                                className="font-bold text-slate-900 hover:text-primary-600 transition-colors"
                                                            >
                                                                {creator?.name}
                                                            </Link>
                                                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                                {creator?.tier?.toUpperCase()}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                            <span>{creator?.phone || 'Chưa có SĐT'}</span>
                                                            {mainAccount && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-primary-600 font-medium">
                                                                        @{mainAccount.handle}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Trạng thái tiến độ với Dropdown chuyển nhanh */}
                                            <td className="px-4 py-3.5">
                                                <div className="relative inline-block">
                                                    <select
                                                        value={item.status}
                                                        onChange={(e) =>
                                                            handleQuickStatusChange(item, e.target.value)
                                                        }
                                                        className="py-1 pl-2.5 pr-7 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-primary-500 hover:border-slate-300"
                                                    >
                                                        {Object.entries(STATUS_DEFINITIONS).map(([stKey, stVal]) => {
                                                            const isMissingAddressForSent = stKey === 'sample_sent' && !item.creator?.shipping_address?.trim();
                                                            const isSent = Boolean(item.sample_sent_at) || ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);
                                                            const cannotReceiveOrPostYet = ['sample_received', 'posted'].includes(stKey) && !isSent;
                                                            const hasVideo = Boolean((item.content_posts && item.content_posts.length > 0) || (item.contentPosts && item.contentPosts.length > 0));
                                                            const isMissingVideoForPosted = stKey === 'posted' && !hasVideo;

                                                            return (
                                                                <option
                                                                    key={stKey}
                                                                    value={stKey}
                                                                    disabled={cannotReceiveOrPostYet}
                                                                >
                                                                    {stVal.label}
                                                                    {isMissingAddressForSent ? ' ⚠️ (Thiếu Đ/c)' : ''}
                                                                    {cannotReceiveOrPostYet ? ' ⛔ (Chưa gửi mẫu)' : ''}
                                                                    {!cannotReceiveOrPostYet && isMissingVideoForPosted ? ' 🔗 (Cần link video)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                            </td>

                                            {/* Hạn Video (Deadline đếm ngược) */}
                                            <td className="px-4 py-3.5">
                                                {item.deadline_info ? (
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${item.deadline_info.status === 'overdue'
                                                                ? 'bg-rose-100 text-rose-800 animate-pulse'
                                                                : item.deadline_info.status === 'warning'
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-emerald-50 text-emerald-700'
                                                            }`}
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                        {item.deadline_info.text}
                                                    </span>
                                                ) : item.sample_sent_at && !item.sample_received_at ? (
                                                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                                                        <Truck className="h-3 w-3" />
                                                        Đang giao hàng
                                                    </span>
                                                ) : ['posted', 'completed'].includes(item.status) ? (
                                                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Đã lên video
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic">
                                                        Chưa nhận mẫu
                                                    </span>
                                                )}
                                            </td>

                                            {/* Gửi Mẫu KOC (Hỗ trợ xác nhận gửi mẫu tinh giản) */}
                                            <td className="px-4 py-3.5">
                                                {(() => {
                                                    const isSent = Boolean(item.sample_sent_at) || ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);

                                                    return (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <div className="flex items-center gap-1.5">
                                                                    {
                                                                        isSent?(
                                                                    <button
                                                                        type = "button"
                                                                        onClick = {() => handleOpenShipmentModal(item)}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100 transition-colors"
                                                                title="Xem thông tin hoặc gửi lại"
                                                                    >
                                                                <Package className="h-3 w-3" />
                                                                <span>Đã gửi mẫu</span>
                                                            </button>
                                                            ) : (
                                                            <span className="text-[11px] text-slate-400 italic">Chưa gửi</span>
                                                                )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenShipmentModal(item)}
                                                                className="p-1 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 transition-colors"
                                                                title="Xác nhận gửi mẫu cho KOC"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                                {item.sample_sent_at && (
                                                                    <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                                                        Ngày {formatDate(item.sample_sent_at)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                            </td>

                                            {/* Video Đã Lên (Hỗ trợ 1 KOC nhiều video) */}
                                            <td className="px-4 py-3.5">
                                                {(() => {
                                                    const posts = item.content_posts || item.contentPosts || [];
                                                    const count = posts.length;
                                                    const latest = count > 0 ? posts[posts.length - 1] : null;
                                                    const isSent = Boolean(item.sample_sent_at) || ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);

                                                    return (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <div className="flex items-center gap-1.5">
                                                                {count > 0 ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenVideoModal(item)}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/60 hover:bg-purple-100 transition-colors"
                                                                        title="Xem chi tiết các video đã lên"
                                                                    >
                                                                        <Video className="h-3 w-3" />
                                                                        <span>{count} video</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-400 italic">Chưa lên</span>
                                                                )}
                                                                {isSent && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenVideoModal(item)}
                                                                        className="p-1 rounded-md bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-800 transition-colors"
                                                                        title="Thêm link video mới"
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {latest && latest.post_url && (
                                                                <div className="flex flex-col gap-0.5 items-start">
                                                                    <a
                                                                        href={latest.post_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800 font-medium truncate max-w-[120px]"
                                                                        title={latest.video_title || latest.post_url}
                                                                    >
                                                                        <span>Xem video</span>
                                                                        <ExternalLink className="h-2.5 w-2.5" />
                                                                    </a>
                                                                    {latest.benchmark && (
                                                                        <span
                                                                            title={`Lượt xem: ${(latest.views_count || 0).toLocaleString('vi-VN')} / TB kênh: ${latest.benchmark.average_channel_views.toLocaleString('vi-VN')}`}
                                                                            className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold border ${
                                                                                latest.benchmark.status === 'viral'
                                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                                    : latest.benchmark.status === 'exceeded'
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                    : latest.benchmark.status === 'expected'
                                                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                                    : latest.benchmark.status === 'below'
                                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                                                            }`}
                                                                        >
                                                                            {latest.benchmark.label}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* Phí Booking (Inline Edit) */}
                                            <td className="px-4 py-3.5">
                                                {editingFeeId === item.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={tempFeeValue}
                                                            onChange={(e) => setTempFeeValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveInlineFee(item.id);
                                                                if (e.key === 'Escape') setEditingFeeId(null);
                                                            }}
                                                            autoFocus
                                                            className="w-24 px-1.5 py-0.5 text-xs rounded border border-primary-500 focus:outline-hidden"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveInlineFee(item.id)}
                                                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                                        >
                                                            <Check className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingFeeId(null)}
                                                            className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingFeeId(item.id);
                                                            setTempFeeValue(String(item.booking_fee || 0));
                                                        }}
                                                        className="group flex items-center gap-1 font-bold text-slate-900 hover:text-primary-600"
                                                        title="Bấm để sửa nhanh phí booking"
                                                    >
                                                        <span>{formatCurrency(item.booking_fee)}</span>
                                                        <Edit3 className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                )}
                                            </td>

                                            {/* Phụ trách (Inline Dropdown) */}
                                            <td className="px-4 py-3.5">
                                                <select
                                                    value={item.assigned_to || ''}
                                                    onChange={(e) => handleInlineAssign(item.id, e.target.value)}
                                                    className="w-full max-w-[130px] py-0.5 px-1.5 text-[11px] rounded border border-slate-200 bg-slate-50/60 text-slate-700 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                                >
                                                    <option value="">-- Chưa gán --</option>
                                                    {staffUsers.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Cổng Portal Tự Điền */}
                                            <td className="px-4 py-3.5">
                                                {item.portal_token ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyPortal(item.portal_token)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                                                        title="Sao chép link gửi cho Creator qua Zalo"
                                                    >
                                                        {copiedToken === item.portal_token ? (
                                                            <Check className="h-3 w-3 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-3 w-3 text-slate-500" />
                                                        )}
                                                        <span>
                                                            {copiedToken === item.portal_token ? 'Đã chép!' : 'Copy Link'}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic">Chưa có link</span>
                                                )}
                                            </td>

                                            {/* NÚT THAO TÁC 1-CHẠM THÔNG MINH (SMART ACTION PILLS) */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* KOC MỚI THÊM: Mở Zalo Tiếp Cận */}
                                                    {item.status === 'new' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenZalo(item)}
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all active:scale-95"
                                                        >
                                                            <MessageCircle className="h-3.5 w-3.5" />
                                                            <span>Mở Zalo Tiếp Cận</span>
                                                        </button>
                                                    )}

                                                    {/* ĐÃ LIÊN HỆ: Chốt Hợp Tác */}
                                                    {item.status === 'contacted' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDealModalItem(item);
                                                                setDealFee(String(item.booking_fee || 0));
                                                                setDealNotes(item.notes || '');
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all active:scale-95"
                                                        >
                                                            <Sparkles className="h-3.5 w-3.5" />
                                                            <span>Chốt Hợp Tác</span>
                                                        </button>
                                                    )}

                                                    {/* ĐÃ CHỐT HỢP TÁC: Chép Link Portal hoặc Đã Có Địa Chỉ */}
                                                    {item.status === 'agreed' && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyPortal(item.portal_token)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                                                title="Chép link portal gửi cho bạn KOC điền địa chỉ"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                                <span>Gửi Portal</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleQuickStatusChange(
                                                                        item.id,
                                                                        'address_confirmed'
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 shadow-2xs"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                                <span>Đã Có Đ/C</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* ĐÃ CHỐT ĐỊA CHỈ: Mở Modal Xác Nhận Gửi Mẫu & Copy Thông Tin Kho */}
                                                    {item.status === 'address_confirmed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenShipmentModal(item)}
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition-all active:scale-95"
                                                        >
                                                            <Package className="h-3.5 w-3.5" />
                                                            <span>Xác Nhận Gửi Mẫu</span>
                                                        </button>
                                                    )}

                                                    {/* ĐÃ GỬI MẪU: Báo Đã Nhận Hàng (Kích hoạt đếm ngược hạn ngày) */}
                                                    {item.status === 'sample_sent' && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleQuickStatusChange(item.id, 'sample_received')
                                                            }
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-2xs transition-all active:scale-95"
                                                        >
                                                            <Truck className="h-3.5 w-3.5" />
                                                            <span>Đã Nhận Mẫu</span>
                                                        </button>
                                                    )}

                                                    {/* ĐÃ NHẬN MẪU: Đang làm video -> Bấm Điền Link Video để chuyển Đã Lên Video */}
                                                    {item.status === 'sample_received' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenVideoModal(item)}
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-pink-600 text-white hover:bg-pink-700 shadow-2xs transition-all active:scale-95"
                                                            title="Điền link video để chuyển sang trạng thái Đã lên video"
                                                        >
                                                            <Video className="h-3.5 w-3.5" />
                                                            <span>Điền Link Video</span>
                                                        </button>
                                                    )}

                                                    {/* ĐÃ LÊN VIDEO: Duyệt Nghiệm Thu */}
                                                    {item.status === 'posted' && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleQuickStatusChange(item.id, 'completed')
                                                            }
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all active:scale-95"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>Nghiệm Thu</span>
                                                        </button>
                                                    )}

                                                    {/* HOÀN TẤT */}
                                                    {item.status === 'completed' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>Xong</span>
                                                        </span>
                                                    )}

                                                    {/* NGOẠI LỆ: Từ chối / Bom hàng */}
                                                    {['declined', 'no_show'].includes(item.status) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickStatusChange(item.id, 'new')}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        >
                                                            <span>Khôi phục</span>
                                                        </button>
                                                    )}

                                                    {/* Nút Nhắc Zalo Thông Minh */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenZalo(item)}
                                                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 shadow-2xs transition-colors"
                                                        title="Nhắc việc Zalo 1-chạm thông minh"
                                                    >
                                                        <MessageCircle className="h-3.5 w-3.5" />
                                                    </button>

                                                    {/* Nút Xóa (cho Mới thêm, Đã liên hệ hoặc Từ chối) */}
                                                    {['new', 'contacted', 'declined'].includes(item.status) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCreator(item.id, creator?.name)}
                                                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                                            title="Xóa khỏi chiến dịch"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400">
                                        <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                        <p className="font-semibold text-slate-700">
                                            Không tìm thấy KOC nào phù hợp bộ lọc
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Hãy thử đổi tab chặng hoặc tìm kiếm với từ khóa khác.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Bảng */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
                    <div>
                        Hiển thị <span className="font-bold text-slate-800">{filteredItems.length}</span> / {items.length} KOC
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onOpenAddModal}
                            iconLeft={<Users className="h-3.5 w-3.5" />}
                        >
                            Gán Thêm KOC
                        </Button>
                    </div>
                </div>
            </div>

            {/* PHẦN 4: THANH TÁC VỤ HÀNG LOẠT NỔI (FLOATING BULK ACTION DOCK) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-slate-900/95 backdrop-blur-md px-5 py-3 text-white shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                            {selectedIds.length}
                        </span>
                        <span className="text-xs font-semibold">Đã chọn</span>
                    </div>

                    {/* Nút Chuyển Trạng Thái Đồng Loạt */}
                    <button
                        type="button"
                        onClick={() => setIsBulkStatusModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-500 transition-colors shadow-2xs"
                    >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Đổi Trạng Thái ({selectedIds.length})</span>
                    </button>

                    {/* Dropdown Phân Bổ Nhân Viên Hàng Loạt */}
                    <select
                        onChange={(e) => {
                            if (e.target.value) handleExecuteBulkAssign(e.target.value);
                        }}
                        defaultValue=""
                        className="rounded-xl border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 py-1.5 px-2.5 focus:ring-primary-500 cursor-pointer"
                    >
                        <option value="" disabled>
                            Gán Nhân Viên Phụ Trách...
                        </option>
                        {staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                                Gán cho {u.name}
                            </option>
                        ))}
                    </select>

                    {/* Copy Phone Numbers */}
                    <button
                        type="button"
                        onClick={handleCopyPhones}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                        title="Sao chép danh sách SĐT"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy SĐT</span>
                    </button>

                    {/* Bỏ chọn */}
                    <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="ml-2 text-slate-400 hover:text-white transition-colors"
                        title="Bỏ chọn tất cả"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* MODAL ĐỔI TRẠNG THÁI HÀNG LOẠT */}
            {isBulkStatusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                        onClick={() => setIsBulkStatusModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                            Chuyển Trạng Thái Đồng Loạt
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Đang áp dụng cho <span className="font-bold text-primary-600">{selectedIds.length} KOC</span> đã chọn.
                        </p>

                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-slate-700">
                                Chọn trạng thái đích:
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                                {Object.entries(STATUS_DEFINITIONS).map(([stKey, stVal]) => (
                                    <button
                                        key={stKey}
                                        type="button"
                                        onClick={() => setBulkSelectedStatus(stKey)}
                                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${bulkSelectedStatus === stKey
                                                ? 'border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-500/20'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        {stVal.label}
                                    </button>
                                ))}
                            </div>

                            {bulkSelectedStatus === 'sample_sent' && bulkMissingAddressCount > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <strong>Cảnh báo ràng buộc địa chỉ:</strong> Có <strong>{bulkMissingAddressCount}</strong> trong tổng số {selectedIds.length} KOC chưa có địa chỉ nhận hàng. Hệ thống sẽ tự động bỏ qua các KOC này để tránh gửi hàng sai sót.
                                    </div>
                                </div>
                            )}

                            {['sample_received', 'posted'].includes(bulkSelectedStatus) && bulkNotSentCount > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <strong>Cảnh báo ràng buộc gửi mẫu:</strong> Có <strong>{bulkNotSentCount}</strong> trong tổng số {selectedIds.length} KOC chưa được gửi mẫu sản phẩm. Hệ thống sẽ tự động bỏ qua các KOC này vì không thể nhận mẫu hoặc lên video khi chưa gửi mẫu.
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsBulkStatusModalOpen(false)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    loading={bulkProcessing}
                                    onClick={handleExecuteBulkStatus}
                                >
                                    Xác Nhận Đổi ({selectedIds.length})
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHỐT HỢP TÁC VỚI KOC */}
            {dealModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                        onClick={() => setDealModalItem(null)}
                    />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Chốt Hợp Tác Với KOC
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {dealModalItem.creator.name} ({dealModalItem.creator.phone})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDealModalItem(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitDeal} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Phí booking thỏa thuận (VND)
                                </label>
                                <input
                                    type="number"
                                    value={dealFee}
                                    onChange={(e) => setDealFee(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Định dạng: {formatCurrency(dealFee)}
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Ghi chú hợp tác / Cam kết video
                                </label>
                                <textarea
                                    value={dealNotes}
                                    onChange={(e) => setDealNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Ví dụ: KOC đồng ý làm 1 video review 60s, gắn link bio..."
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setDealModalItem(null)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    iconLeft={<Check className="h-3.5 w-3.5" />}
                                >
                                    Xác Nhận Chốt Hợp Tác
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL XÁC NHẬN GỬI MẪU CHO KOC (TINH GIẢN CHO BOOKING) */}
            {shipmentModalItem && (() => {
                const hasOriginalAddress = Boolean(shipmentModalItem.creator?.shipping_address?.trim());
                const hasQuickAddress = Boolean(quickAddress.trim());
                const hasValidShippingAddress = hasOriginalAddress || hasQuickAddress;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                            onClick={() => setShipmentModalItem(null)}
                        />
                        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Package className="h-5 w-5 text-amber-500" />
                                        Xác Nhận Đã Gửi Mẫu Cho KOC
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {shipmentModalItem.creator?.name} • {shipmentModalItem.creator?.phone || quickPhone || 'Chưa có SĐT'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShipmentModalItem(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Cảnh báo nếu KOC chưa có địa chỉ */}
                            {!hasValidShippingAddress && (
                                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="font-bold">KOC chưa có địa chỉ nhận hàng trong hồ sơ!</div>
                                        <div className="mt-0.5 text-rose-700 text-[11px] leading-relaxed">
                                            Hệ thống <strong>chặn gửi mẫu khi thiếu địa chỉ</strong>. Vui lòng nhập nhanh địa chỉ bên dưới (nếu đã nhận qua chat) hoặc gửi link Portal cho KOC tự điền.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hiển thị địa chỉ hiện tại (nếu có và không trong chế độ sửa) */}
                            {hasOriginalAddress && !isEditingAddress && (
                                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <Truck className="h-3.5 w-3.5 text-slate-500" />
                                            Địa chỉ nhận mẫu của KOC:
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingAddress(true)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs"
                                                title="Sửa hoặc cập nhật địa chỉ mới"
                                            >
                                                <Edit3 className="h-3 w-3 text-slate-500" />
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyWarehouseAddress(shipmentModalItem)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs ${copiedAddress
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                                    }`}
                                                title="Chép họ tên, SĐT và địa chỉ để gửi cho bộ phận kho"
                                            >
                                                {copiedAddress ? (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        <span>Đã sao chép!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        <span>Sao chép gửi kho</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-slate-700 leading-relaxed font-medium">
                                        {[
                                            shipmentModalItem.creator?.shipping_address,
                                            shipmentModalItem.creator?.ward,
                                            shipmentModalItem.creator?.district,
                                            shipmentModalItem.creator?.city_province,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Form Nhập Nhanh Địa Chỉ (khi chưa có địa chỉ hoặc khi bấm Sửa) */}
                            {(!hasOriginalAddress || isEditingAddress) && (
                                <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-xs animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-indigo-600" />
                                            Nhập nhanh địa chỉ nhận hàng (Lưu vào hồ sơ KOC):
                                        </span>
                                        {hasOriginalAddress && (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingAddress(false)}
                                                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 underline"
                                            >
                                                Hủy sửa
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                Địa chỉ chi tiết (Số nhà, đường, ngõ, tòa nhà...) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={quickAddress}
                                                onChange={(e) => setQuickAddress(e.target.value)}
                                                placeholder="Ví dụ: 123 Đường Nguyễn Trãi"
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                    Tỉnh / TP
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quickCity}
                                                    onChange={(e) => setQuickCity(e.target.value)}
                                                    placeholder="Hà Nội / TP.HCM"
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                    Quận / Huyện
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quickDistrict}
                                                    onChange={(e) => setQuickDistrict(e.target.value)}
                                                    placeholder="Quận Thanh Xuân"
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                    Phường / Xã
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quickWard}
                                                    onChange={(e) => setQuickWard(e.target.value)}
                                                    placeholder="Phường Khương Trung"
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                Số điện thoại nhận hàng
                                            </label>
                                            <input
                                                type="text"
                                                value={quickPhone}
                                                onChange={(e) => setQuickPhone(e.target.value)}
                                                placeholder="Ví dụ: 0988123456"
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tiện ích Copy Link Portal */}
                            {shipmentModalItem.portal_token && (
                                <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                    <span className="text-slate-600 text-[11px]">
                                        Hoặc gửi link cho KOC tự điền:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyPortal(shipmentModalItem.portal_token)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs ${copiedToken === shipmentModalItem.portal_token
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                    >
                                        {copiedToken === shipmentModalItem.portal_token ? (
                                            <>
                                                <Check className="h-3 w-3" />
                                                <span>Đã sao chép link Portal!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3" />
                                                <span>Sao chép link Portal</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Trạng thái gửi mẫu hiện tại */}
                            {shipmentModalItem.sample_sent_at && (
                                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                                    <strong>Trạng thái:</strong> Đã gửi mẫu vào ngày {formatDate(shipmentModalItem.sample_sent_at)}.
                                    {shipmentModalItem.notes && <span className="block mt-0.5 text-slate-600">Ghi chú: {shipmentModalItem.notes}</span>}
                                </div>
                            )}

                            {/* Form xác nhận gửi mẫu tinh giản */}
                            <form onSubmit={handleSubmitShipment} className="mt-4 space-y-3.5 pt-3 border-t border-slate-100">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                                    💡 <strong>Quy trình tinh gọn:</strong> Nhân viên Booking chỉ cần bấm sao chép thông tin địa chỉ gửi cho kho và xác nhận ngày gửi mẫu. Kho bên ngoài sẽ chịu trách nhiệm đóng gói và vận chuyển.
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Ngày gửi mẫu
                                        </label>
                                        <input
                                            type="date"
                                            value={shipmentDate}
                                            onChange={(e) => setShipmentDate(e.target.value)}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Ghi chú mẫu / sản phẩm gửi
                                        </label>
                                        <input
                                            type="text"
                                            value={shipmentNotes}
                                            onChange={(e) => setShipmentNotes(e.target.value)}
                                            placeholder="Ví dụ: 1 Hộp kem + Quà tặng kèm"
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <span className="text-xs text-rose-600 font-medium">
                                        {!hasValidShippingAddress && '⚠️ Cần có địa chỉ để gửi mẫu'}
                                    </span>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setShipmentModalItem(null)}
                                        >
                                            Đóng
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="sm"
                                            disabled={!hasValidShippingAddress || shipmentSubmitting}
                                            loading={shipmentSubmitting}
                                            iconLeft={<CheckCircle2 className="h-3.5 w-3.5" />}
                                            title={!hasValidShippingAddress ? 'Vui lòng nhập địa chỉ nhận hàng trước khi xác nhận' : undefined}
                                        >
                                            Xác Nhận Đã Gửi Mẫu
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

                    {/* MODAL QUẢN LÝ & THÊM VIDEO CHO KOC (HỖ TRỢ NHIỀU VIDEO) */}
                    {videoModalItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                                onClick={() => setVideoModalItem(null)}
                            />
                            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Video className="h-5 w-5 text-purple-600" />
                                            Video Bài Đăng Của KOC
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {videoModalItem.creator.name} • {videoModalItem.creator.phone || 'Chưa có SĐT'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setVideoModalItem(null)}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Danh sách video đã đăng trước đó */}
                                {(() => {
                                    const posts = videoModalItem.content_posts || videoModalItem.contentPosts || [];
                                    if (posts.length === 0) return null;

                                    return (
                                        <div className="mt-4">
                                            <h4 className="text-xs font-bold text-slate-700 mb-2">
                                                Video đã nộp ({posts.length} video):
                                            </h4>
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {posts.map((post, idx) => (
                                                    <div
                                                        key={post.id || idx}
                                                        className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between shadow-2xs"
                                                    >
                                                        <div className="min-w-0 pr-2">
                                                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold uppercase">
                                                                    {post.platform}
                                                                </span>
                                                                <span className="truncate max-w-[200px] text-slate-700">
                                                                    {post.video_title || 'Bài đăng video'}
                                                                </span>
                                                            </div>
                                                            {post.posted_at && (
                                                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                    Đăng ngày: {post.posted_at}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <a
                                                            href={post.post_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100"
                                                        >
                                                            <span>Xem</span>
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Form thêm video mới */}
                                <form onSubmit={handleSubmitVideo} className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-900">
                                        + Thêm Video Mới:
                                    </h4>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Nền tảng <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={videoPlatform}
                                                onChange={(e) => setVideoPlatform(e.target.value)}
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="tiktok">TikTok</option>
                                                <option value="facebook">Facebook</option>
                                                <option value="instagram">Instagram</option>
                                                <option value="youtube">YouTube</option>
                                            </select>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Link bài đăng / video <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="url"
                                                required
                                                value={videoUrl}
                                                onChange={(e) => setVideoUrl(e.target.value)}
                                                placeholder="https://www.tiktok.com/@.../video/..."
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Tiêu đề video
                                            </label>
                                            <input
                                                type="text"
                                                value={videoTitle}
                                                onChange={(e) => setVideoTitle(e.target.value)}
                                                placeholder="Ví dụ: Review son dưỡng màu cam đào"
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Ngày đăng
                                            </label>
                                            <input
                                                type="date"
                                                value={videoPostedAt}
                                                onChange={(e) => setVideoPostedAt(e.target.value)}
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setVideoModalItem(null)}
                                        >
                                            Đóng
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="sm"
                                            loading={videoSubmitting}
                                            iconLeft={<Video className="h-3.5 w-3.5" />}
                                        >
                                            Lưu Link & Đánh Dấu Đã Lên Video
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Modal Nhắc Zalo Thông Minh 1-Chạm */}
                    <QuickZaloReminderModal
                        isOpen={quickZaloPivotId !== null}
                        campaignCreatorId={quickZaloPivotId}
                        onClose={() => setQuickZaloPivotId(null)}
                        onSuccess={(msg) => showFeedback(msg)}
                    />
                </div>
            );
}