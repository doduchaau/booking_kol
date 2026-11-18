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
use Modules\Campaign\Services\CampaignService;
use Modules\Campaign\Services\PipelineService;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Models\Creator;
use Modules\Creator\Services\CreatorNormalizationService;

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
        $productsInput = $request->input('products', []);
        if (is_string($productsInput)) {
            $productsInput = json_decode($productsInput, true) ?: [];
        }

        if (!empty($productsInput) && is_array($productsInput)) {
            foreach ($productsInput as $idx => $p) {
                if (empty($p['name'])) continue;

                $briefFilePath = null;
                if ($request->hasFile("products.{$idx}.brief_file")) {
                    $briefFilePath = $request->file("products.{$idx}.brief_file")->store('campaigns/product_briefs', 'public');
                }

                $campaign->products()->create([
                    'name' => trim($p['name']),
                    'sku' => !empty($p['sku']) ? trim($p['sku']) : null,
                    'product_url' => !empty($p['product_url']) ? trim($p['product_url']) : null,
                    'retail_price' => (float) ($p['retail_price'] ?? 0),
                    'brief_content' => $p['brief_content'] ?? null,
                    'brief_file' => $briefFilePath,
                    'hashtags' => !empty($p['hashtags']) ? trim($p['hashtags']) : null,
                    'sample_requirement' => $p['sample_requirement'] ?? null,
                    'sort_order' => $idx,
                ]);
            }
        } elseif (!empty($campaign->product_name)) {
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
                      'creator.accounts:id,creator_id,platform,handle,followers_count,engagement_rate,average_views',
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

        // Xử lý danh sách sản phẩm & brief riêng từng sản phẩm
        $productsInput = $request->input('products', []);
        if (is_string($productsInput)) {
            $productsInput = json_decode($productsInput, true) ?: [];
        }

        if (is_array($productsInput) && count($productsInput) > 0) {
            $keptProductIds = [];
            foreach ($productsInput as $idx => $p) {
                if (empty($p['name'])) continue;

                $prodId = !empty($p['id']) ? (int) $p['id'] : null;
                $existingProd = $prodId ? $campaign->products()->find($prodId) : null;

                $briefFilePath = $existingProd?->brief_file;

                if (!empty($p['remove_brief_file']) && $briefFilePath) {
                    if (Storage::disk('public')->exists($briefFilePath)) {
                        Storage::disk('public')->delete($briefFilePath);
                    }
                    $briefFilePath = null;
                }

                if ($request->hasFile("products.{$idx}.brief_file")) {
                    if ($briefFilePath && Storage::disk('public')->exists($briefFilePath)) {
                        Storage::disk('public')->delete($briefFilePath);
                    }
                    $briefFilePath = $request->file("products.{$idx}.brief_file")->store('campaigns/product_briefs', 'public');
                }

                $productData = [
                    'name' => trim($p['name']),
                    'sku' => !empty($p['sku']) ? trim($p['sku']) : null,
                    'product_url' => !empty($p['product_url']) ? trim($p['product_url']) : null,
                    'retail_price' => (float) ($p['retail_price'] ?? 0),
                    'brief_content' => $p['brief_content'] ?? null,
                    'brief_file' => $briefFilePath,
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
            if (!empty($keptProductIds)) {
                $campaign->products()->whereNotIn('id', $keptProductIds)->delete();
            }
        }

        return redirect()->route('campaigns.show', $campaign->id)
            ->with('success', "Đã cập nhật chiến dịch [{$campaign->name}] thành công.");
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
            productQuantities: $validated['product_quantities'] ?? []
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
     * Xóa KOC khỏi chiến dịch (chỉ cho phép khi chưa gửi mẫu)
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
        }

        if (!in_array($campaignCreator->status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED, PipelineStatusEnum::DECLINED])) {
            return back()->withErrors([
                'error' => 'Chỉ có thể xóa KOC đang ở trạng thái Mới thêm, Đã liên hệ hoặc Từ chối khỏi chiến dịch.',
            ]);
        }

        $campaignCreator->delete();

        return back()->with('success', 'Đã xóa KOC khỏi chiến dịch thành công.');
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
}
