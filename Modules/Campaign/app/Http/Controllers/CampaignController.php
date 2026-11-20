<?php

namespace Modules\Campaign\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthHelper;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Http\Requests\AddCreatorsToCampaignRequest;
use Modules\Campaign\Http\Requests\StoreCampaignRequest;
use Modules\Campaign\Http\Requests\UpdateCampaignRequest;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\CampaignCreatorImportService;
use Modules\Campaign\Services\CampaignCreatorTemplateService;
use Modules\Campaign\Services\CampaignService;
use Modules\Campaign\Services\PipelineService;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Models\Creator;
use Modules\Creator\Services\CreatorNormalizationService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CampaignController extends Controller
{
    public function __construct(
        protected CampaignService $campaignService,
        protected PipelineService $pipelineService
    ) {}

    /**
     * Danh sách chiến dịch
     */
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'status']);

        $campaigns = Campaign::query()
            ->filter($filters)
            ->with([
                'creatorUser:id,name',
                'campaignCreators' => function ($q) {
                    $q->select(['id', 'campaign_id', 'status', 'booking_fee'])
                        ->with(['contentPosts:id,campaign_creator_id']);
                },
            ])
            ->withCount('campaignCreators')
            ->latest('id')
            ->paginate(12)
            ->withQueryString();

        // Tính toán các chỉ số bổ sung cho từng campaign
        $campaigns->getCollection()->transform(function ($c) {
            $stats = $this->campaignService->calculateCampaignStats($c);
            $c->stats = $stats;
            return $c;
        });

        return Inertia::render('Campaign/Index', [
            'campaigns' => $campaigns,
            'filters' => $filters,
            'statuses' => array_map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatusEnum::cases()),
        ]);
    }

    /**
     * Form tạo mới chiến dịch
     */
    public function create(): Response
    {
        $totalCreatorsCount = Creator::query()
            ->whereNull('merged_into_creator_id')
            ->count();

        return Inertia::render('Campaign/Create', [
            'statuses' => array_map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatusEnum::cases()),
            'totalCreatorsCount' => $totalCreatorsCount,
        ]);
    }

    /**
     * Lưu chiến dịch mới
     */
    public function store(StoreCampaignRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $assignAllCreators = $request->boolean('assign_all_creators');
        $validated['created_by'] = $request->user()?->id;

        if ($request->hasFile('content_guidelines_file')) {
            $validated['content_guidelines_file'] = $request->file('content_guidelines_file')->store('campaigns/guidelines', 'public');
        }

        if ($request->hasFile('sample_requirement_file')) {
            $validated['sample_requirement_file'] = $request->file('sample_requirement_file')->store('campaigns/sample_requirements', 'public');
        }

        $campaign = Campaign::create($validated);

        // Lưu danh sách sản phẩm & brief riêng cho từng sản phẩm
        $this->syncCampaignProducts($campaign, $request);

        if ($assignAllCreators) {
            $result = $this->campaignService->addCreatorsToCampaign(
                campaign: $campaign,
                creatorIds: [],
                selectAllInDb: true
            );

            return redirect()->route('campaigns.show', $campaign->id)
                ->with('success', "Đã tạo chiến dịch [{$campaign->name}] và tự động gán toàn bộ {$result['added']} KOC từ kho dữ liệu thành công.");
        }

        return redirect()->route('campaigns.show', $campaign->id)
            ->with('success', "Đã tạo chiến dịch [{$campaign->name}] thành công.");
    }

    /**
     * Chi tiết chiến dịch & quản lý Creator gán vào
     */
    public function show(int $id): Response
    {
        $currentUser = auth()->user();
        $isLeaderOrAdmin = AuthHelper::isLeaderOrAdmin($currentUser);
        $isStaffOnly = !$isLeaderOrAdmin;

        $campaign = Campaign::with([
            'products',
            'creatorUser:id,name,email',
            'campaignCreators' => function ($q) use ($currentUser, $isStaffOnly) {
                $q->when($isStaffOnly, fn ($sq) => $sq->where('assigned_to', $currentUser->id))
                  ->with([
                      'creator:id,name,phone,shipping_address,city_province,district,ward,niche,tier,trust_score,blacklist_status',
                      'creator.accounts:id,creator_id,platform,handle,followers_count,engagement_rate,average_views,url',
                      'creatorProducts.campaignProduct',
                      'assignee:id,name,email',
                      'contentPosts:id,campaign_creator_id,platform,post_url,video_title,posted_at,status,views_count,likes_count,comments_count,gmv_amount',
                  ]);
            },
        ])->findOrFail($id);

        $stats = $this->campaignService->calculateCampaignStats($campaign);

        // Đính kèm deadline_info cho từng KOC và gán quan hệ ngược 2 chiều để loại bỏ hoàn toàn N+1 queries
        $campaign->campaignCreators->transform(function ($cc) use ($campaign) {
            $cc->setRelation('campaign', $campaign);
            if ($cc->relationLoaded('contentPosts')) {
                $cc->contentPosts->each(function ($post) use ($cc) {
                    $post->setRelation('campaignCreator', $cc);
                });
            }
            $cc->deadline_info = $this->pipelineService->calculateDeadline($cc);
            return $cc;
        });

        // Thống kê nhanh số lượng KOC theo 4 chặng tiến độ
        $allCc = $campaign->campaignCreators;
        $stageCounts = [
            'all' => $allCc->count(),
            'waiting_approval' => $allCc->filter(fn ($cc) => $cc->status === PipelineStatusEnum::WAITING_APPROVAL)->count(),
            'outreach' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::NEW,
                PipelineStatusEnum::CONTACTED,
                PipelineStatusEnum::WAITING_APPROVAL,
                PipelineStatusEnum::AGREED,
            ]))->count(),
            'shipping' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::ADDRESS_CONFIRMED,
                PipelineStatusEnum::SAMPLE_SENT,
                PipelineStatusEnum::SAMPLE_RECEIVED,
            ]))->count(),
            'production' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::SAMPLE_RECEIVED,
                PipelineStatusEnum::POSTED,
            ]))->count(),
            'completion' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::COMPLETED,
                PipelineStatusEnum::DECLINED,
                PipelineStatusEnum::NO_SHOW,
            ]))->count(),
        ];

        // Đếm tổng số Creator khả dụng trong kho dữ liệu chưa gán vào chiến dịch này (sử dụng whereNotExists tối ưu index)
        $totalAvailableCount = Creator::query()
            ->whereNull('merged_into_creator_id')
            ->whereNotExists(function ($subQuery) use ($id) {
                $subQuery->select(\Illuminate\Support\Facades\DB::raw(1))
                    ->from('campaign_creators')
                    ->whereColumn('campaign_creators.creator_id', 'creators.id')
                    ->where('campaign_creators.campaign_id', $id)
                    ->whereNull('campaign_creators.deleted_at');
            })
            ->count();

        // Lấy danh sách nhân viên nội bộ
        $staffUsers = User::query()->select(['id', 'name', 'email'])->get();

        return Inertia::render('Campaign/Show', [
            'campaign' => $campaign,
            'stats' => $stats,
            'stageCounts' => $stageCounts,
            'availableCreators' => Inertia::lazy(fn () => Creator::query()
                ->whereNull('merged_into_creator_id')
                ->whereNotExists(function ($subQuery) use ($id) {
                    $subQuery->select(\Illuminate\Support\Facades\DB::raw(1))
                        ->from('campaign_creators')
                        ->whereColumn('campaign_creators.creator_id', 'creators.id')
                        ->where('campaign_creators.campaign_id', $id)
                        ->whereNull('campaign_creators.deleted_at');
                })
                ->with(['accounts:id,creator_id,platform,handle,followers_count'])
                ->select(['id', 'name', 'phone', 'niche', 'tier'])
                ->latest('id')
                ->limit(150)
                ->get()
            ),
            'totalAvailableCount' => $totalAvailableCount,
            'staffUsers' => $staffUsers,
        ]);
    }

    /**
     * Form chỉnh sửa chiến dịch
     */
    public function edit(int $id): Response
    {
        $campaign = Campaign::with('products')->findOrFail($id);

        return Inertia::render('Campaign/Edit', [
            'campaign' => $campaign,
            'statuses' => array_map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatusEnum::cases()),
        ]);
    }

    /**
     * Cập nhật thông tin chiến dịch
     */
    public function update(UpdateCampaignRequest $request, int $id): RedirectResponse
    {
        $campaign = Campaign::findOrFail($id);
        $data = $request->validated();

        // Phân quyền: Chỉ Admin/Leader mới được duyệt thay đổi ngân sách
        if (isset($data['budget']) && (float)$data['budget'] !== (float)$campaign->budget) {
            $currentUser = auth()->user();
            if (!AuthHelper::isLeaderOrAdmin($currentUser)) {
                return back()->withErrors(['budget' => 'Chỉ Admin hoặc Leader mới có quyền duyệt thay đổi ngân sách chiến dịch.']);
            }
        }

        // Xử lý file kịch bản chung
        if ($request->boolean('remove_content_guidelines_file')) {
            if ($campaign->content_guidelines_file && Storage::disk('public')->exists($campaign->content_guidelines_file)) {
                Storage::disk('public')->delete($campaign->content_guidelines_file);
            }
            $data['content_guidelines_file'] = null;
        } elseif ($request->hasFile('content_guidelines_file')) {
            if ($campaign->content_guidelines_file && Storage::disk('public')->exists($campaign->content_guidelines_file)) {
                Storage::disk('public')->delete($campaign->content_guidelines_file);
            }
            $data['content_guidelines_file'] = $request->file('content_guidelines_file')->store('campaigns/guidelines', 'public');
        }

        // Xử lý file quy định gửi mẫu chung
        if ($request->boolean('remove_sample_requirement_file')) {
            if ($campaign->sample_requirement_file && Storage::disk('public')->exists($campaign->sample_requirement_file)) {
                Storage::disk('public')->delete($campaign->sample_requirement_file);
            }
            $data['sample_requirement_file'] = null;
        } elseif ($request->hasFile('sample_requirement_file')) {
            if ($campaign->sample_requirement_file && Storage::disk('public')->exists($campaign->sample_requirement_file)) {
                Storage::disk('public')->delete($campaign->sample_requirement_file);
            }
            $data['sample_requirement_file'] = $request->file('sample_requirement_file')->store('campaigns/sample_requirements', 'public');
        }

        $campaign->update($data);

        // Xử lý danh sách sản phẩm, ảnh & brief riêng từng sản phẩm
        $this->syncCampaignProducts($campaign, $request);

        return redirect()->route('campaigns.show', $campaign->id)
            ->with('success', "Đã cập nhật chiến dịch [{$campaign->name}] thành công.");
    }

    /**
     * Đồng bộ danh sách sản phẩm, hình ảnh và tài liệu brief cho chiến dịch
     */
    protected function syncCampaignProducts(Campaign $campaign, Request $request): void
    {
        $productsInput = $request->input('products', []);
        if (is_string($productsInput)) {
            $productsInput = json_decode($productsInput, true) ?: [];
        }

        if (empty($productsInput) || !is_array($productsInput)) {
            if (!empty($campaign->product_name) && $campaign->products()->count() === 0) {
                $campaign->products()->create([
                    'name' => $campaign->product_name,
                    'sku' => $campaign->product_sku,
                    'product_url' => $campaign->affiliate_link,
                    'brief_content' => $campaign->content_guidelines,
                    'brief_file' => $campaign->content_guidelines_file,
                    'hashtags' => $campaign->hashtags,
                    'sample_requirement' => $campaign->sample_requirement,
                    'retail_price' => 0.00,
                    'sort_order' => 0,
                ]);
            }
            return;
        }

        $keptProductIds = [];

        foreach ($productsInput as $idx => $p) {
            if (empty($p['name'])) {
                continue;
            }

            $prodId = !empty($p['id']) ? (int) $p['id'] : null;
            $existingProd = $prodId ? $campaign->products()->find($prodId) : null;

            // 1. Xử lý Ảnh sản phẩm (Gallery / Multiple Images)
            $currentImages = $existingProd?->images ?? [];
            if (!is_array($currentImages)) {
                $currentImages = [];
            }

            // Gỡ bỏ các ảnh cũ theo danh sách removed_image_paths
            $removedImagePaths = $p['removed_image_paths'] ?? [];
            if (!empty($removedImagePaths) && is_array($removedImagePaths)) {
                foreach ($removedImagePaths as $rmPath) {
                    if (Storage::disk('public')->exists($rmPath)) {
                        Storage::disk('public')->delete($rmPath);
                    }
                }
                $currentImages = array_values(array_filter($currentImages, function ($img) use ($removedImagePaths) {
                    $imgPath = is_array($img) ? ($img['path'] ?? null) : $img;
                    return !in_array($imgPath, $removedImagePaths);
                }));
            }

            // Upload ảnh mới
            if ($request->hasFile("products.{$idx}.images")) {
                $uploadedImages = $request->file("products.{$idx}.images");
                if (!is_array($uploadedImages)) {
                    $uploadedImages = [$uploadedImages];
                }
                foreach ($uploadedImages as $imgFile) {
                    if ($imgFile && $imgFile->isValid()) {
                        $storedPath = $imgFile->store('campaigns/products/images', 'public');
                        $currentImages[] = [
                            'path' => $storedPath,
                            'name' => $imgFile->getClientOriginalName(),
                            'size' => $imgFile->getSize(),
                        ];
                    }
                }
            }

            // Xác định thumbnail_url
            $thumbnailUrl = null;
            if (!empty($currentImages)) {
                $first = $currentImages[0];
                $thumbnailUrl = is_array($first) ? ($first['path'] ?? null) : $first;
            }

            // 2. Xử lý File Brief (Multiple Brief Files & Legacy single file)
            $currentBriefFiles = $existingProd?->brief_files ?? [];
            if (!is_array($currentBriefFiles)) {
                $currentBriefFiles = [];
            }

            // Gỡ bỏ file brief cũ theo removed_brief_file_paths
            $removedBriefPaths = $p['removed_brief_file_paths'] ?? [];
            if (!empty($removedBriefPaths) && is_array($removedBriefPaths)) {
                foreach ($removedBriefPaths as $rmPath) {
                    if (Storage::disk('public')->exists($rmPath)) {
                        Storage::disk('public')->delete($rmPath);
                    }
                }
                $currentBriefFiles = array_values(array_filter($currentBriefFiles, function ($bf) use ($removedBriefPaths) {
                    $bfPath = is_array($bf) ? ($bf['path'] ?? null) : $bf;
                    return !in_array($bfPath, $removedBriefPaths);
                }));
            }

            // Gỡ bỏ brief_file cũ nếu có flag remove_brief_file
            $legacyBriefPath = $existingProd?->brief_file;
            if (!empty($p['remove_brief_file']) && $legacyBriefPath) {
                if (Storage::disk('public')->exists($legacyBriefPath)) {
                    Storage::disk('public')->delete($legacyBriefPath);
                }
                $legacyBriefPath = null;
            }

            // Upload nhiều file brief mới
            if ($request->hasFile("products.{$idx}.brief_files")) {
                $uploadedBriefs = $request->file("products.{$idx}.brief_files");
                if (!is_array($uploadedBriefs)) {
                    $uploadedBriefs = [$uploadedBriefs];
                }
                foreach ($uploadedBriefs as $bFile) {
                    if ($bFile && $bFile->isValid()) {
                        $storedPath = $bFile->store('campaigns/products/briefs', 'public');
                        $currentBriefFiles[] = [
                            'path' => $storedPath,
                            'name' => $bFile->getClientOriginalName(),
                            'size' => $bFile->getSize(),
                            'type' => $bFile->getClientMimeType(),
                        ];
                    }
                }
            }

            // Upload single file brief cũ (nếu có)
            if ($request->hasFile("products.{$idx}.brief_file")) {
                $singleFile = $request->file("products.{$idx}.brief_file");
                if ($legacyBriefPath && Storage::disk('public')->exists($legacyBriefPath)) {
                    Storage::disk('public')->delete($legacyBriefPath);
                }
                $legacyBriefPath = $singleFile->store('campaigns/product_briefs', 'public');
                $currentBriefFiles[] = [
                    'path' => $legacyBriefPath,
                    'name' => $singleFile->getClientOriginalName(),
                    'size' => $singleFile->getSize(),
                    'type' => $singleFile->getClientMimeType(),
                ];
            }

            if (empty($legacyBriefPath) && !empty($currentBriefFiles)) {
                $firstBrief = $currentBriefFiles[0];
                $legacyBriefPath = is_array($firstBrief) ? ($firstBrief['path'] ?? null) : $firstBrief;
            }

            $productData = [
                'name' => trim($p['name']),
                'sku' => !empty($p['sku']) ? trim($p['sku']) : null,
                'thumbnail_url' => $thumbnailUrl,
                'images' => $currentImages,
                'product_url' => !empty($p['product_url']) ? trim($p['product_url']) : null,
                'retail_price' => (float) ($p['retail_price'] ?? 0),
                'brief_content' => $p['brief_content'] ?? null,
                'brief_file' => $legacyBriefPath,
                'brief_files' => $currentBriefFiles,
                'hashtags' => !empty($p['hashtags']) ? trim($p['hashtags']) : null,
                'sample_requirement' => $p['sample_requirement'] ?? null,
                'sort_order' => $idx,
            ];

            if ($existingProd) {
                $existingProd->update($productData);
                $keptProductIds[] = $existingProd->id;
            } else {
                $newProd = $campaign->products()->create($productData);
                $keptProductIds[] = $newProd->id;
            }
        }

        // Xóa các sản phẩm đã bị remove trong form edit
        if ($campaign->exists && !empty($keptProductIds)) {
            $campaign->products()->whereNotIn('id', $keptProductIds)->delete();
        }
    }

    /**
     * Gán Creator vào chiến dịch
     */
    public function addCreators(
        AddCreatorsToCampaignRequest $request,
        int $id
    ): RedirectResponse {
        $campaign = Campaign::findOrFail($id);

        if ($campaign->status === CampaignStatusEnum::COMPLETED) {
            return back()->withErrors([
                'error' => 'Chiến dịch đã kết thúc, không thể gán thêm Creator mới.',
            ]);
        }

        $validated = $request->validated();
        $selectAllInDb = $request->boolean('select_all_in_db');

        $result = $this->campaignService->addCreatorsToCampaign(
            campaign: $campaign,
            creatorIds: $validated['creator_ids'] ?? [],
            assignedTo: $validated['assigned_to'] ?? null,
            bookingFee: (float) ($validated['booking_fee'] ?? 0),
            selectAllInDb: $selectAllInDb,
            collaborationType: $validated['collaboration_type'] ?? 'video',
            productIds: $validated['product_ids'] ?? [],
            productQuantities: $validated['product_quantities'] ?? [],
            bookingPlatforms: $validated['booking_platforms'] ?? null
        );

        $msg = $selectAllInDb
            ? "Đã gán toàn bộ {$result['added']} KOC từ kho dữ liệu vào chiến dịch thành công."
            : "Đã gán {$result['added']} Creator vào chiến dịch thành công.";

        return back()->with('success', $msg);
    }

    /**
     * Xóa chiến dịch (Soft delete)
     */
    public function destroy(int $id): RedirectResponse
    {
        // Phân quyền: Chỉ Admin/Leader mới được xóa chiến dịch
        $currentUser = auth()->user();
        if (!AuthHelper::isLeaderOrAdmin($currentUser)) {
            return back()->withErrors(['error' => 'Chỉ Admin hoặc Leader mới có quyền xóa chiến dịch.']);
        }

        $campaign = Campaign::withCount('campaignCreators')->findOrFail($id);

        // Kiểm tra ràng buộc an toàn
        if ($campaign->campaign_creators_count > 0) {
            // Kiểm tra có Creator nào đã gửi mẫu hoặc lên video chưa
            $hasSentSample = $campaign->campaignCreators()
                ->whereNotNull('sample_sent_at')
                ->exists();

            if ($hasSentSample) {
                return back()->withErrors([
                    'error' => 'Không thể xóa chiến dịch đã phát sinh việc gửi mẫu hoặc duyệt bài.',
                ]);
            }
        }

        $name = $campaign->name;
        $campaign->delete();

        return redirect()->route('campaigns.index')
            ->with('success', "Đã xóa chiến dịch [{$name}].");
    }

    /**
     * Xóa KOC khỏi chiến dịch
     */
    public function removeCreator(int $id, int $pivotId): RedirectResponse
    {
        $campaignCreator = CampaignCreator::where('campaign_id', $id)->findOrFail($pivotId);

        // Phân quyền: Staff chỉ được xóa KOC mình được phân công
        $currentUser = auth()->user();
        if (!AuthHelper::isLeaderOrAdmin($currentUser)) {
            if ($campaignCreator->assigned_to !== null && $campaignCreator->assigned_to !== $currentUser->id) {
                return back()->withErrors(['error' => 'Bạn chỉ được xóa KOC mà mình được phân công khỏi chiến dịch.']);
            }

            if (in_array($campaignCreator->status, [PipelineStatusEnum::POSTED, PipelineStatusEnum::COMPLETED])) {
                return back()->withErrors([
                    'error' => 'KOC đã hoàn thành video hoặc kết thúc hợp tác, không thể xóa.',
                ]);
            }
        }

        $campaignCreator->delete();

        return back()->with('success', 'Đã xóa KOC khỏi chiến dịch thành công.');
    }

    /**
     * Xóa hàng loạt KOC khỏi chiến dịch
     */
    public function bulkRemoveCreators(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        $currentUser = auth()->user();
        $isLeader = AuthHelper::isLeaderOrAdmin($currentUser);

        $query = CampaignCreator::where('campaign_id', $id)
            ->whereIn('id', $validated['ids']);

        if (!$isLeader) {
            $query->where(function ($q) use ($currentUser) {
                $q->whereNull('assigned_to')->orWhere('assigned_to', $currentUser->id);
            })->whereNotIn('status', [PipelineStatusEnum::POSTED, PipelineStatusEnum::COMPLETED]);
        }

        $deletedCount = $query->delete();

        return back()->with('success', "Đã xóa {$deletedCount} KOC khỏi chiến dịch thành công.");
    }

    /**
     * Xác nhận gửi mẫu cho KOC trong chiến dịch (tinh giản - không quản lý vận đơn)
     * Hỗ trợ cập nhật nhanh địa chỉ nhận hàng nếu KOC chưa có trong hồ sơ
     */
    public function addShipment(Request $request, int $id, int $pivotId): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
            'shipped_at' => ['nullable', 'date'],
            'shipping_address' => ['nullable', 'string', 'max:255'],
            'city_province' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'ward' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'products' => ['nullable', 'array'],
            'products.*.product_id' => ['required_with:products', 'exists:campaign_products,id'],
            'products.*.quantity' => ['required_with:products', 'integer', 'min:1'],
            'products.*.variant' => ['nullable', 'string', 'max:100'],
        ]);

        $campaignCreator = CampaignCreator::where('campaign_id', $id)->with('creator')->findOrFail($pivotId);
        $creator = $campaignCreator->creator;

        // Phân quyền: Staff chỉ được sửa KOC mình được phân công
        $currentUser = auth()->user();
        if (!AuthHelper::isLeaderOrAdmin($currentUser)) {
            if ($campaignCreator->assigned_to !== null && $campaignCreator->assigned_to !== $currentUser->id) {
                $msg = 'Bạn chỉ được xác nhận gửi mẫu cho KOC mà mình được phân công.';
                return $request->wantsJson()
                    ? response()->json(['success' => false, 'message' => $msg], 403)
                    : back()->withErrors(['error' => $msg]);
            }
        }

        // Nếu nhân viên có nhập nhanh địa chỉ giao hàng tại modal, lưu ngay vào hồ sơ Creator
        // Bắt buộc: Số nhà/đường, SĐT, Tỉnh/TP, Phường/Xã
        $hasQuickAddressInput = $request->filled('shipping_address')
            || $request->filled('city_province')
            || $request->filled('ward')
            || $request->filled('phone');

        if ($hasQuickAddressInput || empty($creator->shipping_address)) {
            $effectiveAddress = trim((string) ($request->input('shipping_address') ?: ($creator->shipping_address ?? '')));
            $effectivePhone = trim((string) ($request->input('phone') ?: ($creator->phone ?? '')));
            $effectiveCity = trim((string) ($request->input('city_province') ?: ($creator->city_province ?? '')));
            $effectiveWard = trim((string) ($request->input('ward') ?: ($creator->ward ?? '')));

            $errors = [];
            if ($effectiveAddress === '') {
                $errors['shipping_address'] = "Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường) để gửi hàng cho KOC {$creator->name}.";
            }
            if ($effectivePhone === '') {
                $errors['phone'] = "Vui lòng nhập số điện thoại nhận hàng của KOC {$creator->name}.";
            }
            if ($effectiveCity === '') {
                $errors['city_province'] = "Vui lòng nhập Tỉnh / Thành phố để gửi hàng cho KOC {$creator->name}.";
            }
            if ($effectiveWard === '') {
                $errors['ward'] = "Vui lòng nhập Phường / Xã để gửi hàng cho KOC {$creator->name}.";
            }

            if (!empty($errors)) {
                $firstMessage = reset($errors);
                $errors['error'] = $firstMessage;
                if ($request->wantsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => $firstMessage,
                        'errors' => $errors,
                    ], 422);
                }
                return back()->withErrors($errors);
            }

            $creatorData = [
                'shipping_address' => $effectiveAddress,
                'city_province' => $effectiveCity,
                'ward' => $effectiveWard,
                'phone' => CreatorNormalizationService::normalizePhone($effectivePhone),
            ];

            if ($request->filled('district')) {
                $creatorData['district'] = trim($request->input('district'));
            }

            $creator->update($creatorData);

            // Cập nhật mốc thời gian chốt địa chỉ nếu đang ở các trạng thái trước đó
            if (in_array($campaignCreator->status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED, PipelineStatusEnum::AGREED])) {
                $campaignCreator->update([
                    'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
                    'address_confirmed_at' => $campaignCreator->address_confirmed_at ?? now(),
                ]);
            }
        }

        try {
            $shippedAt = !empty($validated['shipped_at']) ? Carbon::parse($validated['shipped_at']) : now();

            // Chuyển sang sample_sent thông qua PipelineService với đầy đủ ràng buộc kiểm tra địa chỉ
            $this->pipelineService->updateCreatorStatus(
                campaignCreator: $campaignCreator,
                newStatus: PipelineStatusEnum::SAMPLE_SENT,
                notes: $validated['notes'] ?? null
            );

            $campaignCreator->update([
                'sample_sent_at' => $shippedAt,
            ]);

            // Cập nhật chi tiết các sản phẩm gửi đi nếu có chỉ định từ modal
            $productsToSend = $request->input('products', []);
            if (!empty($productsToSend) && is_array($productsToSend)) {
                $totalSent = 0;
                foreach ($productsToSend as $p) {
                    $pId = (int) $p['product_id'];
                    $qty = max(1, (int) ($p['quantity'] ?? 1));
                    $variant = !empty($p['variant']) ? trim($p['variant']) : null;

                    $ccProduct = \Modules\Campaign\Models\CampaignCreatorProduct::firstOrNew([
                        'campaign_creator_id' => $campaignCreator->id,
                        'campaign_product_id' => $pId,
                    ]);

                    $ccProduct->quantity_sent = $qty;
                    $ccProduct->quantity_assigned = max((int) ($ccProduct->quantity_assigned ?: 0), $qty);
                    if ($variant) {
                        $ccProduct->sample_variant = $variant;
                    }
                    $ccProduct->sample_status = \Modules\Campaign\Enums\SampleStatusEnum::SENT;
                    $ccProduct->sent_at = $shippedAt;
                    $ccProduct->save();

                    $totalSent += $qty;
                }

                $campaignCreator->update([
                    'total_samples_sent' => $totalSent,
                    'total_samples_assigned' => max((int) $campaignCreator->total_samples_assigned, $totalSent),
                ]);
            }

            $msg = "Đã xác nhận gửi mẫu thành công cho KOC {$creator->name}.";

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $msg,
                ]);
            }

            return back()->with('success', $msg);
        } catch (Exception $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Thêm video nghiệm thu mới cho KOC trong chiến dịch (hỗ trợ 1 KOC lên nhiều video)
     */
    public function addVideo(Request $request, int $id, int $pivotId): RedirectResponse
    {
        $validated = $request->validate([
            'platform' => ['required', 'in:tiktok,facebook,youtube,shopee,instagram'],
            'post_url' => ['required', 'url', 'max:500'],
            'video_title' => ['nullable', 'string', 'max:255'],
            'posted_at' => ['nullable', 'date'],
        ]);

        $campaignCreator = CampaignCreator::where('campaign_id', $id)->with('creator')->findOrFail($pivotId);

        // Phân quyền: Staff chỉ được thêm video cho KOC mình được phân công
        $currentUser = auth()->user();
        if (!AuthHelper::isLeaderOrAdmin($currentUser)) {
            if ($campaignCreator->assigned_to !== null && $campaignCreator->assigned_to !== $currentUser->id) {
                return back()->withErrors(['error' => 'Bạn chỉ được thêm video cho KOC mà mình được phân công.']);
            }
        }

        // KIỂM TRA RÀNG BUỘC: Không thể lên video khi chưa gửi mẫu
        $isSent = !empty($campaignCreator->sample_sent_at) || in_array($campaignCreator->status, [
            PipelineStatusEnum::SAMPLE_SENT,
            PipelineStatusEnum::SAMPLE_RECEIVED,
            PipelineStatusEnum::POSTED,
            PipelineStatusEnum::COMPLETED,
        ]);

        if (!$isSent) {
            return back()->withErrors([
                'error' => "Không thể thêm video cho KOC {$campaignCreator->creator->name} vì chưa gửi mẫu sản phẩm.",
            ]);
        }

        $postedAt = !empty($validated['posted_at'])
            ? Carbon::parse($validated['posted_at'])
            : now();

        ContentPost::create([
            'campaign_creator_id' => $campaignCreator->id,
            'platform' => $validated['platform'],
            'post_url' => $validated['post_url'],
            'video_title' => $validated['video_title'] ?? null,
            'posted_at' => $postedAt,
            'status' => 'approved',
        ]);

        // Tự động chuyển pipeline sang "posted" nếu đang ở sample_sent hoặc sample_received
        if (in_array($campaignCreator->status, [
            PipelineStatusEnum::SAMPLE_SENT,
            PipelineStatusEnum::SAMPLE_RECEIVED,
        ])) {
            $this->pipelineService->updateCreatorStatus($campaignCreator, PipelineStatusEnum::POSTED);
        }

        return back()->with('success', "Đã ghi nhận thêm video mới cho KOC {$campaignCreator->creator->name}.");
    }

    /**
     * Tải file mẫu Excel import KOC cho chiến dịch
     */
    public function downloadCreatorImportTemplate(
        Request $request,
        int $id,
        CampaignCreatorTemplateService $templateService
    ): BinaryFileResponse {
        Campaign::findOrFail($id);
        return $templateService->downloadTemplate();
    }

    /**
     * Phân tích và kiểm tra trùng trước khi import KOC từ file mẫu
     */
    public function previewCreatorImport(
        Request $request,
        int $id,
        CampaignCreatorImportService $importService
    ): JsonResponse {
        $campaign = Campaign::findOrFail($id);

        if ($campaign->status === CampaignStatusEnum::COMPLETED) {
            return response()->json([
                'success' => false,
                'message' => 'Chiến dịch đã kết thúc, không thể import thêm KOC mới.',
            ], 422);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:15360'],
        ], [
            'file.required' => 'Vui lòng chọn file Excel hoặc CSV để tải lên.',
            'file.mimes' => 'Hệ thống chỉ hỗ trợ định dạng file .xlsx, .xls hoặc .csv.',
            'file.max' => 'Dung lượng file không được vượt quá 15MB.',
        ]);

        try {
            $result = $importService->previewImport($request->file('file'), $campaign);

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi đọc file Excel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Xác nhận import KOC vào chiến dịch và đồng bộ vào kho CRM
     */
    public function confirmCreatorImport(
        Request $request,
        int $id,
        CampaignCreatorImportService $importService
    ): JsonResponse|RedirectResponse {
        $campaign = Campaign::findOrFail($id);

        if ($campaign->status === CampaignStatusEnum::COMPLETED) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chiến dịch đã kết thúc, không thể import thêm KOC mới.',
                ], 422);
            }
            return back()->withErrors(['error' => 'Chiến dịch đã kết thúc, không thể import thêm KOC mới.']);
        }

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'resolutions' => ['nullable', 'array'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'default_booking_fee' => ['nullable', 'numeric', 'min:0'],
            'default_platforms' => ['nullable', 'array'],
        ]);

        try {
            $result = $importService->confirmImport(
                campaign: $campaign,
                token: $validated['token'],
                resolutions: $validated['resolutions'] ?? [],
                assignedTo: !empty($validated['assigned_to']) ? (int) $validated['assigned_to'] : null,
                defaultBookingFee: (float) ($validated['default_booking_fee'] ?? 0),
                defaultPlatforms: !empty($validated['default_platforms']) ? $validated['default_platforms'] : ($campaign->target_platforms ?: ['tiktok']),
                user: $request->user()
            );

            $msg = "Đã import thành công: {$result['created_crm']} KOC mới vào kho CRM, cập nhật {$result['updated_crm']} KOC cũ và gán {$result['assigned_campaign']} KOC vào chiến dịch.";
            if ($result['skipped'] > 0) {
                $msg .= " ({$result['skipped']} KOC được bỏ qua theo yêu cầu).";
            }

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $msg,
                    'data' => $result,
                ]);
            }

            return back()->with('success', $msg);
        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 500);
            }
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
