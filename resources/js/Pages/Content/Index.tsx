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
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';
import FilterBar from '@/Components/Table/FilterBar';
import DataTable, { Column, PaginationMeta } from '@/Components/Table/DataTable';
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

interface ContentPost {
    id: number;
    campaign_creator_id: number;
    platform: 'tiktok' | 'facebook' | 'youtube' | 'instagram' | 'shopee';
    post_url: string;
    video_title?: string;
    posted_at?: string;
    status: 'pending_approval' | 'approved' | 'changes_requested';
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    gmv_amount: number | string;
    last_synced_at?: string;
    campaign_creator?: CampaignCreator;
    latest_metric?: ContentPostMetric;
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
        campaign_id?: string;
    };
    campaigns: { id: number; name: string }[];
    stats: {
        total_posts: number;
        approved_posts: number;
        pending_posts: number;
        total_views: number;
        total_gmv: number;
    };
}

export default function Index({ posts, filters, campaigns, stats }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [platform, setPlatform] = useState(filters.platform || '');
    const [status, setStatus] = useState(filters.status || '');
    const [campaignId, setCampaignId] = useState(filters.campaign_id || '');

    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncingPostId, setSyncingPostId] = useState<number | null>(null);

    // State cho Modal xem biểu đồ tăng trưởng
    const [chartModalPost, setChartModalPost] = useState<ContentPost | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    // Kích hoạt tìm kiếm
    const triggerFilter = (newSearch: string, newPlatform: string, newStatus: string, newCampaign: string) => {
        router.get(
            route('content.index'),
            {
                search: newSearch || undefined,
                platform: newPlatform || undefined,
                status: newStatus || undefined,
                campaign_id: newCampaign || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        triggerFilter(val, platform, status, campaignId);
    };

    const handleResetFilters = () => {
        setSearch('');
        setPlatform('');
        setStatus('');
        setCampaignId('');
        triggerFilter('', '', '', '');
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
        { key: 'video', label: 'Video / Creator', className: 'w-1/3' },
        { key: 'campaign', label: 'Chiến dịch' },
        { key: 'status', label: 'Trạng thái duyệt' },
        { key: 'metrics', label: 'Chỉ số tương tác' },
        { key: 'gmv', label: 'GMV ghi nhận' },
        { key: 'actions', label: 'Thao tác', align: 'right' },
    ];

    const paginationMeta: PaginationMeta = {
        current_page: posts.current_page,
        last_page: posts.last_page,
        per_page: posts.per_page,
        total: posts.total,
        links: posts.links,
    };

    const activeFiltersCount = (search ? 1 : 0) + (platform ? 1 : 0) + (status ? 1 : 0) + (campaignId ? 1 : 0);

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
                                    triggerFilter(search, e.target.value, status, campaignId);
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

                            {/* Lọc trạng thái */}
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    triggerFilter(search, platform, e.target.value, campaignId);
                                }}
                                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="pending_approval">Chờ duyệt</option>
                                <option value="approved">Đã duyệt</option>
                                <option value="changes_requested">Yêu cầu sửa</option>
                            </select>

                            {/* Lọc chiến dịch */}
                            <select
                                value={campaignId}
                                onChange={(e) => {
                                    setCampaignId(e.target.value);
                                    triggerFilter(search, platform, status, e.target.value);
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
                    return (
                        <tr key={post.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Video & Creator */}
                            <td className="px-6 py-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default">{post.platform.toUpperCase()}</Badge>
                                        <a
                                            href={post.post_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-bold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-1 group line-clamp-1"
                                        >
                                            {post.video_title || post.post_url}
                                            <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                                        </a>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span>Creator: <strong>{post.campaign_creator?.creator?.name || 'Không xác định'}</strong></span>
                                        {post.posted_at && (
                                            <>
                                                <span>•</span>
                                                <span>Lên ngày: {new Date(post.posted_at).toLocaleDateString('vi-VN')}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* Chiến dịch */}
                            <td className="px-6 py-4 text-xs font-medium text-slate-700">
                                {post.campaign_creator?.campaign?.name || 'Chiến dịch chung'}
                            </td>

                            {/* Trạng thái duyệt */}
                            <td className="px-6 py-4">
                                <Badge variant={getStatusVariant(post.status)}>
                                    {getStatusLabel(post.status)}
                                </Badge>
                            </td>

                            {/* Chỉ số */}
                            <td className="px-6 py-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="font-bold text-slate-900 inline-flex items-center gap-1">
                                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                                            {post.views_count.toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-slate-600 inline-flex items-center gap-1">
                                            <ThumbsUp className="h-3.5 w-3.5 text-rose-500" />
                                            {post.likes_count.toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-slate-600 inline-flex items-center gap-1">
                                            <MessageCircle className="h-3.5 w-3.5 text-amber-500" />
                                            {post.comments_count.toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    {post.last_synced_at && (
                                        <div className="text-[11px] text-slate-400">
                                            Đồng bộ: {new Date(post.last_synced_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(post.last_synced_at).toLocaleDateString('vi-VN')}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* GMV */}
                            <td className="px-6 py-4 text-xs font-bold text-emerald-700">
                                {formatCurrency(post.gmv_amount)}
                            </td>

                            {/* Thao tác */}
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    {post.status !== 'approved' && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(post.id, 'approved')}
                                            iconLeft={<Check className="h-3.5 w-3.5 text-emerald-600" />}
                                            title="Duyệt bài đăng này"
                                        >
                                            Duyệt
                                        </Button>
                                    )}

                                    {post.status === 'pending_approval' && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(post.id, 'changes_requested')}
                                            iconLeft={<X className="h-3.5 w-3.5" />}
                                            title="Yêu cầu sửa"
                                        >
                                            Sửa
                                        </Button>
                                    )}

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        loading={isSyncingThis}
                                        onClick={() => handleSyncSingle(post.id)}
                                        iconLeft={<RefreshCw className="h-3.5 w-3.5 text-indigo-600" />}
                                        title="Đồng bộ chỉ số"
                                    >
                                        Đồng bộ
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleOpenChart(post)}
                                        iconLeft={<BarChart2 className="h-3.5 w-3.5 text-purple-600" />}
                                        title="Xem biểu đồ tăng trưởng"
                                    >
                                        Biểu đồ
                                    </Button>
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
                                    Video: <strong>{chartModalPost.video_title || chartModalPost.post_url}</strong> (Creator: {chartModalPost.campaign_creator?.creator?.name})
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

                                    <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs text-slate-600">
                                        <span>Lượt xem hiện tại: <strong className="text-slate-900">{chartModalPost.views_count.toLocaleString('vi-VN')}</strong></span>
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
        </AppLayout>
    );
}
