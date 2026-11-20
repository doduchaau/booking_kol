import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Video,
    CheckCircle2,
    Clock,
    Eye,
    TrendingUp,
    RefreshCw,
    ExternalLink,
    Filter,
    BarChart2,
    Calendar,
    AlertCircle,
    ThumbsUp,
    MessageCircle,
    DollarSign,
    Check,
    X,
    ShieldCheck,
    AlertTriangle,
    AlertOctagon,
    Activity,
    Edit3,
    Copy,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import PlatformBadge from '@/Components/Common/PlatformBadge';
import PlatformLogo, { getPlatformDisplayName } from '@/Components/Common/PlatformLogo';
import FilterBar from '@/Components/Table/FilterBar';
import DataTable, { Column, PaginationMeta } from '@/Components/Table/DataTable';
import FastReviewComplianceModal, { ReviewPost } from './Partials/FastReviewComplianceModal';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

interface Creator {
    id: number;
    name: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface CampaignCreator {
    id: number;
    creator_id: number;
    campaign_id: number;
    creator?: Creator;
    campaign?: Campaign;
    sample_received_at?: string;
    sample_sent_at?: string;
}

interface ContentPostMetric {
    id: number;
    recorded_date: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    gmv_amount: string | number;
}

interface ContentPostBenchmark {
    average_channel_views: number;
    current_views: number;
    ratio: number;
    status: 'viral' | 'exceeded' | 'expected' | 'below' | 'underperforming';
    label: string;
}

interface ContentPost {
    id: number;
    campaign_creator_id: number;
    platform: 'tiktok' | 'facebook' | 'youtube' | 'instagram' | 'shopee';
    post_url: string;
    video_title?: string;
    raw_caption?: string;
    posted_at?: string;
    status: 'pending_approval' | 'approved' | 'changes_requested';
    compliance_status?: 'passed' | 'warning' | 'failed' | 'not_checked';
    compliance_score?: number;
    compliance_checklist?: any[];
    compliance_checked_at?: string;
    health_status?: 'healthy' | 'warning' | 'unavailable' | 'unknown';
    health_error_message?: string;
    health_last_checked_at?: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    gmv_amount: number | string;
    last_synced_at?: string;
    campaign_creator?: CampaignCreator;
    latest_metric?: ContentPostMetric;
    benchmark?: ContentPostBenchmark;
}

interface Props {
    posts: {
        data: ContentPost[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: {
        search?: string;
        platform?: string;
        status?: string;
        compliance_status?: string;
        health_status?: string;
        campaign_id?: string;
    };
    campaigns: { id: number; name: string }[];
    stats: {
        total_posts: number;
        approved_posts: number;
        pending_posts: number;
        passed_compliance?: number;
        warning_compliance?: number;
        unhealthy_count?: number;
        total_views: number;
        total_gmv: number;
    };
}

export default function Index({ posts, filters, campaigns, stats }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [platform, setPlatform] = useState(filters.platform || '');
    const [status, setStatus] = useState(filters.status || '');
    const [complianceStatus, setComplianceStatus] = useState(filters.compliance_status || '');
    const [healthStatus, setHealthStatus] = useState(filters.health_status || '');
    const [campaignId, setCampaignId] = useState(filters.campaign_id || '');

    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncingPostId, setSyncingPostId] = useState<number | null>(null);

    // State cho Modal nghiệm thu nhanh & tuân thủ
    const [reviewModalPost, setReviewModalPost] = useState<ReviewPost | null>(null);

    // State cho Modal xem biểu đồ tăng trưởng
    const [chartModalPost, setChartModalPost] = useState<ContentPost | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    // State cho Modal nhập/sửa chỉ số đối soát thực tế
    const [manualMetricPost, setManualMetricPost] = useState<ContentPost | null>(null);
    const [manualForm, setManualForm] = useState({
        views_count: 0,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        gmv_amount: 0,
    });
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [copiedPostId, setCopiedPostId] = useState<number | null>(null);

    const handleCopyLink = (post: ContentPost) => {
        if (!post.post_url) return;
        navigator.clipboard.writeText(post.post_url);
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2000);
    };

    const getVideoDisplayTitle = (post: { video_title?: string | null; platform?: string; post_url?: string }): string => {
        if (post.video_title && post.video_title.trim() && !post.video_title.startsWith('http')) {
            return post.video_title.trim();
        }
        const platName = getPlatformDisplayName(post.platform || '');
        if (post.post_url) {
            try {
                const urlObj = new URL(post.post_url);
                const pathParts = urlObj.pathname.split('/').filter(Boolean);
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart && /^\d+$/.test(lastPart)) {
                    return `Video ${platName} #${lastPart.slice(-6)}`;
                }
            } catch {
                // fallback
            }
        }
        return `Video bài đăng ${platName}`;
    };

    const getShortUrlDomain = (rawUrl?: string): string => {
        if (!rawUrl) return '';
        try {
            const parsed = new URL(rawUrl);
            return parsed.hostname.replace('www.', '');
        } catch {
            return 'video';
        }
    };

    const handleOpenManualMetric = (post: ContentPost) => {
        setManualMetricPost(post);
        setManualForm({
            views_count: Number(post.views_count) || 0,
            likes_count: Number(post.likes_count) || 0,
            comments_count: Number(post.comments_count) || 0,
            shares_count: Number(post.shares_count) || 0,
            gmv_amount: Number(post.gmv_amount) || 0,
        });
    };

    const handleSaveManualMetric = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualMetricPost) return;

        setIsSavingManual(true);
        router.post(
            route('content.sync', manualMetricPost.id),
            manualForm,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setManualMetricPost(null);
                },
                onFinish: () => setIsSavingManual(false),
            }
        );
    };

    // Kích hoạt tìm kiếm
    const triggerFilter = (
        newSearch: string,
        newPlatform: string,
        newStatus: string,
        newCampaign: string,
        newCompliance: string = complianceStatus,
        newHealth: string = healthStatus
    ) => {
        router.get(
            route('content.index'),
            {
                search: newSearch || undefined,
                platform: newPlatform || undefined,
                status: newStatus || undefined,
                compliance_status: newCompliance || undefined,
                health_status: newHealth || undefined,
                campaign_id: newCampaign || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        triggerFilter(val, platform, status, campaignId, complianceStatus, healthStatus);
    };

    const handleResetFilters = () => {
        setSearch('');
        setPlatform('');
        setStatus('');
        setComplianceStatus('');
        setHealthStatus('');
        setCampaignId('');
        triggerFilter('', '', '', '', '', '');
    };

    const getComplianceBadge = (post: ContentPost) => {
        if (!post.compliance_status || post.compliance_status === 'not_checked') {
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    Chưa quét
                </span>
            );
        }

        if (post.compliance_status === 'passed') {
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Đạt {post.compliance_score || 100}%</span>
                </span>
            );
        }

        if (post.compliance_status === 'warning') {
            return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    <span>Lưu ý ({post.compliance_score || 0}đ)</span>
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <X className="h-3 w-3 text-rose-600" />
                <span>Không đạt</span>
            </span>
        );
    };

    const handleSyncAll = () => {
        setIsSyncingAll(true);
        router.post(
            route('content.sync_all'),
            {},
            {
                onFinish: () => setIsSyncingAll(false),
            }
        );
    };

    const handleSyncSingle = (id: number) => {
        setSyncingPostId(id);
        router.post(
            route('content.sync', id),
            {},
            {
                onFinish: () => setSyncingPostId(null),
            }
        );
    };

    const handleUpdateStatus = (id: number, newStatus: 'approved' | 'changes_requested') => {
        router.patch(route('content.status', id), {
            status: newStatus,
        });
    };

    const handleOpenChart = async (post: ContentPost) => {
        setChartModalPost(post);
        setIsLoadingChart(true);
        try {
            const resp = await fetch(route('content.history', post.id));
            if (resp.ok) {
                const data = await resp.json();
                setChartData(data.history || []);
            }
        } catch (e) {
            console.error('Lỗi tải lịch sử:', e);
        } finally {
            setIsLoadingChart(false);
        }
    };

    const formatCurrency = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
    };

    const getStatusVariant = (s: string): BadgeVariant => {
        switch (s) {
            case 'approved':
                return 'success';
            case 'changes_requested':
                return 'danger';
            default:
                return 'warning';
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'approved':
                return 'Đã duyệt';
            case 'changes_requested':
                return 'Yêu cầu sửa';
            default:
                return 'Chờ duyệt';
        }
    };

    const columns: Column[] = [
        { key: 'video', label: 'Video & Creator', className: 'min-w-[270px]' },
        { key: 'campaign', label: 'Chiến dịch', className: 'min-w-[140px]' },
        { key: 'status', label: 'Nghiệm thu', className: 'min-w-[110px]' },
        { key: 'compliance', label: 'Tuân thủ', className: 'min-w-[130px]' },
        { key: 'metrics', label: 'Hiệu quả video', className: 'min-w-[160px]' },
        { key: 'gmv', label: 'GMV', className: 'min-w-[110px]', align: 'right' },
        { key: 'actions', label: 'Thao tác', className: 'min-w-[170px]', align: 'right' },
    ];

    const paginationMeta: PaginationMeta = {
        current_page: posts.current_page,
        last_page: posts.last_page,
        per_page: posts.per_page,
        total: posts.total,
        links: posts.links,
    };

    const activeFiltersCount =
        (search ? 1 : 0) +
        (platform ? 1 : 0) +
        (status ? 1 : 0) +
        (complianceStatus ? 1 : 0) +
        (healthStatus ? 1 : 0) +
        (campaignId ? 1 : 0);

    return (
        <AppLayout title="Quản lý nghiệm thu Video & Chỉ số">
            <PageHeader
                title="Quản Lý Video & Đo Lường Chỉ Số"
                description="Theo dõi nghiệm thu video, giám sát hạn chót deadline và tự động đồng bộ lượt view, like, GMV theo chu kỳ"
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Nội dung Video' },
                ]}
                actions={
                    <Button
                        variant="primary"
                        loading={isSyncingAll}
                        onClick={handleSyncAll}
                        iconLeft={<RefreshCw className={`h-4 w-4 ${isSyncingAll ? 'animate-spin' : ''}`} />}
                    >
                        Đồng Bộ Chỉ Số Tất Cả Video
                    </Button>
                }
            />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                            <Video className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng video</div>
                            <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total_posts}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã duyệt</div>
                            <div className="text-xl font-bold text-emerald-700 mt-0.5">{stats.approved_posts}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ nghiệm thu</div>
                            <div className="text-xl font-bold text-amber-700 mt-0.5">{stats.pending_posts}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                            <Eye className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng lượt xem</div>
                            <div className="text-xl font-bold text-blue-700 mt-0.5">
                                {stats.total_views.toLocaleString('vi-VN')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng GMV</div>
                            <div className="text-lg font-bold text-purple-700 mt-0.5 truncate">
                                {formatCurrency(stats.total_gmv)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cảnh báo Sức Khỏe Video Nếu Phát Hiện Video Bị Xóa / Ẩn */}
            {stats.unhealthy_count && stats.unhealthy_count > 0 ? (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0">
                            <AlertOctagon className="h-5 w-5 animate-pulse" />
                        </span>
                        <div>
                            <h4 className="text-sm font-bold">
                                Phát hiện {stats.unhealthy_count} video không còn khả dụng trên mạng xã hội!
                            </h4>
                            <p className="text-xs text-rose-700 mt-0.5">
                                Các video này có thể đã bị KOC chuyển sang chế độ riêng tư hoặc bị xóa sau khi nhận tiền. Hãy lọc xem ngay để liên hệ đối soát.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                            setHealthStatus('unavailable');
                            triggerFilter(search, platform, status, campaignId, complianceStatus, 'unavailable');
                        }}
                    >
                        Lọc video bị lỗi
                    </Button>
                </div>
            ) : null}

            {/* Filter Bar */}
            <div className="mb-6">
                <FilterBar
                    searchValue={search}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder="Tìm theo tên video, đường link hoặc tên Creator..."
                    activeFiltersCount={activeFiltersCount}
                    onResetFilters={handleResetFilters}
                    filtersSlot={
                        <>
                            {/* Lọc nền tảng */}
                            <select
                                value={platform}
                                onChange={(e) => {
                                    setPlatform(e.target.value);
                                    triggerFilter(search, e.target.value, status, campaignId, complianceStatus, healthStatus);
                                }}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Tất cả nền tảng</option>
                                <option value="tiktok">TikTok</option>
                                <option value="facebook">Facebook</option>
                                <option value="youtube">YouTube</option>
                                <option value="instagram">Instagram</option>
                                <option value="shopee">Shopee</option>
                            </select>

                            {/* Lọc trạng thái duyệt */}
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    triggerFilter(search, platform, e.target.value, campaignId, complianceStatus, healthStatus);
                                }}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="pending_approval">Chờ duyệt</option>
                                <option value="approved">Đã duyệt</option>
                                <option value="changes_requested">Yêu cầu sửa</option>
                            </select>

                            {/* Lọc tuân thủ kịch bản */}
                            <select
                                value={complianceStatus}
                                onChange={(e) => {
                                    setComplianceStatus(e.target.value);
                                    triggerFilter(search, platform, status, campaignId, e.target.value, healthStatus);
                                }}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Tất cả tuân thủ</option>
                                <option value="passed">Đạt chuẩn 100%</option>
                                <option value="warning">Cần lưu ý / Thiếu hashtag</option>
                                <option value="failed">Không đạt / Lỗi</option>
                                <option value="not_checked">Chưa quét</option>
                            </select>

                            {/* Lọc sức khỏe video */}
                            <select
                                value={healthStatus}
                                onChange={(e) => {
                                    setHealthStatus(e.target.value);
                                    triggerFilter(search, platform, status, campaignId, complianceStatus, e.target.value);
                                }}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Tình trạng sức khỏe</option>
                                <option value="healthy">Hoạt động bình thường</option>
                                <option value="unavailable">Bị xóa hoặc ẩn</option>
                            </select>

                            {/* Lọc chiến dịch */}
                            <select
                                value={campaignId}
                                onChange={(e) => {
                                    setCampaignId(e.target.value);
                                    triggerFilter(search, platform, status, e.target.value, complianceStatus, healthStatus);
                                }}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Tất cả chiến dịch</option>
                                {campaigns.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </>
                    }
                />
            </div>

            {/* Bảng Danh Sách Video */}
            <DataTable
                columns={columns}
                data={posts.data}
                pagination={paginationMeta}
                emptyTitle="Chưa có video bài đăng nào"
                emptyDescription="Các video nộp qua Portal Creator hoặc do nhân viên booking nhập sẽ hiển thị tại đây để nghiệm thu."
                renderRow={(post) => {
                    const isSyncingThis = syncingPostId === post.id;
                    const isCopiedThis = copiedPostId === post.id;
                    const displayTitle = getVideoDisplayTitle(post);
                    const shortDomain = getShortUrlDomain(post.post_url);

                    return (
                        <tr key={post.id} className="group hover:bg-slate-50/80 transition-colors">
                            {/* 1. Video & Creator */}
                            <td className="px-4 py-3.5">
                                <div className="flex items-start gap-3 max-w-[320px]">
                                    {/* Logo mạng xã hội */}
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                                        <PlatformLogo platform={post.platform} size="sm" />
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-1">
                                        {/* Tên tiêu đề video ngắn gọn (không bao giờ in url dài) */}
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="text-xs font-bold text-slate-900 truncate block hover:text-indigo-600 transition-colors"
                                                title={post.video_title || displayTitle}
                                            >
                                                {displayTitle}
                                            </span>
                                        </div>

                                        {/* KOC & Ngày lên bài */}
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                                            {post.campaign_creator?.creator ? (
                                                <Link
                                                    href={route('creators.show', post.campaign_creator.creator.id)}
                                                    className="font-semibold text-slate-700 hover:text-indigo-600 transition-colors truncate max-w-[130px]"
                                                    title={post.campaign_creator.creator.name}
                                                >
                                                    {post.campaign_creator.creator.name}
                                                </Link>
                                            ) : (
                                                <span className="font-medium text-slate-600">Creator</span>
                                            )}
                                            {post.posted_at && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-slate-500 whitespace-nowrap">
                                                        {new Date(post.posted_at).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Dải link tinh gọn & Sao chép nhanh (Loại bỏ triệt để link dài thô thiển) */}
                                        <div className="flex items-center gap-1.5 pt-0.5">
                                            {post.post_url ? (
                                                <>
                                                    <a
                                                        href={post.post_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200/70 px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                                                        title={`Mở video trên ${getPlatformDisplayName(post.platform)}`}
                                                    >
                                                        <span>Xem video</span>
                                                        <ExternalLink className="h-2.5 w-2.5 text-indigo-500" />
                                                    </a>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyLink(post)}
                                                        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                                                            isCopiedThis
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                                        }`}
                                                        title={isCopiedThis ? 'Đã sao chép link!' : `Sao chép link: ${post.post_url}`}
                                                    >
                                                        {isCopiedThis ? (
                                                            <>
                                                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                                                                <span>Đã chép!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-2.5 w-2.5 text-slate-400" />
                                                                <span className="text-slate-400 font-mono text-[9px] truncate max-w-[85px]">
                                                                    {shortDomain}
                                                                </span>
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">Chưa có link video</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {/* 2. Chiến dịch */}
                            <td className="px-4 py-3.5">
                                {post.campaign_creator?.campaign ? (
                                    <Link
                                        href={route('campaigns.show', post.campaign_creator.campaign.id)}
                                        className="text-xs font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-2"
                                        title={post.campaign_creator.campaign.name}
                                    >
                                        {post.campaign_creator.campaign.name}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-slate-500">Chiến dịch chung</span>
                                )}
                            </td>

                            {/* 3. Trạng thái nghiệm thu */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                                <Badge variant={getStatusVariant(post.status)} size="sm">
                                    {getStatusLabel(post.status)}
                                </Badge>
                            </td>

                            {/* 4. Tuân thủ & Sức khỏe */}
                            <td className="px-4 py-3.5">
                                <div className="space-y-1">
                                    <div>{getComplianceBadge(post)}</div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                post.health_status !== 'unavailable'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-rose-500 animate-ping'
                                            }`}
                                        />
                                        <span className={post.health_status === 'unavailable' ? 'font-bold text-rose-600' : ''}>
                                            {post.health_status !== 'unavailable' ? 'Khả dụng' : 'Bị xóa / Ẩn'}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            {/* 5. Hiệu quả video (Views, Likes, Comments, Benchmark) */}
                            <td className="px-4 py-3.5">
                                <div className="space-y-1 min-w-[150px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-sm text-slate-900 inline-flex items-center gap-1 tracking-tight">
                                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                                            {post.views_count.toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400">views</span>
                                    </div>

                                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                                        <span className="inline-flex items-center gap-1">
                                            <ThumbsUp className="h-3 w-3 text-rose-500" />
                                            {post.likes_count.toLocaleString('vi-VN')}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <MessageCircle className="h-3 w-3 text-amber-500" />
                                            {post.comments_count.toLocaleString('vi-VN')}
                                        </span>
                                    </div>

                                    {post.benchmark && (
                                        <div className="pt-0.5">
                                            <span
                                                title={`Lượt xem hiện tại: ${post.views_count.toLocaleString('vi-VN')} / Trung bình kênh: ${post.benchmark.average_channel_views.toLocaleString('vi-VN')}`}
                                                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                                    post.benchmark.status === 'viral'
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : post.benchmark.status === 'exceeded'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : post.benchmark.status === 'expected'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : post.benchmark.status === 'below'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}
                                            >
                                                <TrendingUp className="h-2.5 w-2.5" />
                                                {post.benchmark.label}
                                            </span>
                                        </div>
                                    )}

                                    {post.last_synced_at && (
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                                            <Clock className="h-2.5 w-2.5 text-slate-400" />
                                            <span>
                                                {new Date(post.last_synced_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                                                {new Date(post.last_synced_at).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* 6. GMV */}
                            <td className="px-4 py-3.5 text-right font-bold text-sm text-emerald-700 tabular-nums whitespace-nowrap">
                                {formatCurrency(post.gmv_amount)}
                            </td>

                            {/* 7. Thao tác Tinh Gọn (Action Toolbar) */}
                            <td className="px-4 py-3.5 text-right">
                                <div className="flex flex-col items-end gap-1.5">
                                    {/* Hàng 1: Nút Nghiệm Thu Chính */}
                                    <button
                                        type="button"
                                        onClick={() => setReviewModalPost(post as ReviewPost)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                                        title="Kiểm tra tuân thủ & nghiệm thu video"
                                    >
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        <span>Nghiệm thu</span>
                                    </button>

                                    {/* Hàng 2: Nhóm nút icon tiện ích 1-chạm */}
                                    <div className="flex items-center gap-1">
                                        {/* Nút Duyệt nhanh */}
                                        {post.status !== 'approved' && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(post.id, 'approved')}
                                                className="p-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-2xs transition-colors cursor-pointer"
                                                title="Duyệt nhanh bài đăng này"
                                            >
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            </button>
                                        )}

                                        {/* Nút Yêu cầu sửa */}
                                        {post.status === 'pending_approval' && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(post.id, 'changes_requested')}
                                                className="p-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-2xs transition-colors cursor-pointer"
                                                title="Yêu cầu KOC chỉnh sửa video"
                                            >
                                                <X className="h-3.5 w-3.5 text-rose-600" />
                                            </button>
                                        )}

                                        {/* Nút Đồng bộ API */}
                                        <button
                                            type="button"
                                            disabled={isSyncingThis}
                                            onClick={() => handleSyncSingle(post.id)}
                                            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                            title="Đồng bộ chỉ số tự động từ API"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingThis ? 'animate-spin text-indigo-600' : ''}`} />
                                        </button>

                                        {/* Nút Đối soát thủ công */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenManualMetric(post)}
                                            className="p-1 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-700 shadow-2xs transition-colors cursor-pointer"
                                            title="Nhập chỉ số đối soát thực tế từ TikTok Studio / KOC"
                                        >
                                            <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                                        </button>

                                        {/* Nút Biểu đồ tăng trưởng */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenChart(post)}
                                            className="p-1 rounded-lg border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-700 shadow-2xs transition-colors cursor-pointer"
                                            title="Xem biểu đồ lịch sử tăng trưởng"
                                        >
                                            <BarChart2 className="h-3.5 w-3.5 text-purple-600" />
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* Modal Biểu Đồ Lịch Sử Tăng Trưởng Chỉ Số (Recharts) */}
            {chartModalPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart2 className="h-5 w-5 text-indigo-600" />
                                    Lịch Sử Tăng Trưởng Chỉ Số Theo Ngày
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Video: <strong>{getVideoDisplayTitle(chartModalPost)}</strong> (Creator: {chartModalPost.campaign_creator?.creator?.name})
                                </p>
                            </div>
                            <button
                                onClick={() => setChartModalPost(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {isLoadingChart ? (
                                <div className="h-72 flex items-center justify-center text-sm text-slate-500">
                                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
                                    Đang tải dữ liệu biểu đồ...
                                </div>
                            ) : chartData.length === 0 ? (
                                <div className="h-72 flex flex-col items-center justify-center text-sm text-slate-500 space-y-2">
                                    <Clock className="h-8 w-8 text-slate-300" />
                                    <p>Chưa có dữ liệu lịch sử theo ngày.</p>
                                    <p className="text-xs text-slate-400">Dữ liệu sẽ được ghi nhận hàng ngày qua Job SyncPostMetricsDailyJob.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="recorded_date" stroke="#94a3b8" fontSize={11} />
                                                <YAxis stroke="#94a3b8" fontSize={11} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: '12px',
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="views_count"
                                                    name="Lượt xem (Views)"
                                                    stroke="#4f46e5"
                                                    strokeWidth={2.5}
                                                    dot={{ r: 3 }}
                                                    activeDot={{ r: 5 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="likes_count"
                                                    name="Lượt thích (Likes)"
                                                    stroke="#f43f5e"
                                                    strokeWidth={2}
                                                    dot={{ r: 3 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="comments_count"
                                                    name="Bình luận (Comments)"
                                                    stroke="#f59e0b"
                                                    strokeWidth={1.5}
                                                    dot={{ r: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                                        <span>Lượt xem hiện tại: <strong className="text-slate-900">{chartModalPost.views_count.toLocaleString('vi-VN')}</strong></span>
                                        {chartModalPost.benchmark && (
                                            <span>Đánh giá phong độ: <strong className="text-indigo-700">{chartModalPost.benchmark.label}</strong> (TB kênh: {chartModalPost.benchmark.average_channel_views.toLocaleString('vi-VN')})</span>
                                        )}
                                        <span>Tổng GMV ghi nhận: <strong className="text-emerald-700">{formatCurrency(chartModalPost.gmv_amount)}</strong></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <Button variant="secondary" onClick={() => setChartModalPost(null)}>
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nghiệm Thu Nhanh & Tuân Thủ Video (Fast Review Drawer / Modal) */}
            <FastReviewComplianceModal
                post={reviewModalPost}
                onClose={() => setReviewModalPost(null)}
            />

            {/* Modal Cập Nhật Chỉ Số Đối Soát Thực Tế */}
            {manualMetricPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Edit3 className="h-5 w-5 text-amber-600" />
                                    Cập Nhật Chỉ Số Đối Soát Thực Tế
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    Video: {getVideoDisplayTitle(manualMetricPost)}
                                </p>
                            </div>
                            <button
                                onClick={() => setManualMetricPost(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveManualMetric}>
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                                    Nhập số liệu đối soát trực tiếp từ ảnh chụp màn hình TikTok Studio / Creator Center. Số liệu này sẽ được lưu vào lịch sử đối soát và báo cáo của chiến dịch.
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Lượt xem (Views) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={manualForm.views_count}
                                        onChange={(e) => setManualForm({ ...manualForm, views_count: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Lượt thích (Likes)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={manualForm.likes_count}
                                            onChange={(e) => setManualForm({ ...manualForm, likes_count: parseInt(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Bình luận (Comments)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={manualForm.comments_count}
                                            onChange={(e) => setManualForm({ ...manualForm, comments_count: parseInt(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Lượt chia sẻ (Shares)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={manualForm.shares_count}
                                            onChange={(e) => setManualForm({ ...manualForm, shares_count: parseInt(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Doanh thu GMV (VNĐ)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={manualForm.gmv_amount}
                                            onChange={(e) => setManualForm({ ...manualForm, gmv_amount: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                <Button variant="secondary" type="button" onClick={() => setManualMetricPost(null)}>
                                    Hủy
                                </Button>
                                <Button variant="primary" type="submit" loading={isSavingManual}>
                                    Lưu số liệu đối soát
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
