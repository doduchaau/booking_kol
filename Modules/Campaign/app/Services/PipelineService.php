<?php

namespace Modules\Campaign\Services;

use App\Models\User;
use App\Notifications\KocAssignedNotification;
use App\Notifications\KocNoShowAlertNotification;
use Exception;
use Illuminate\Support\Facades\Log;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\CampaignCreator;

class PipelineService
{
    /**
     * Cập nhật trạng thái Pipeline của Creator trong chiến dịch kèm kiểm tra ràng buộc nghiệp vụ
     *
     * @throws Exception
     */
    public function updateCreatorStatus(
        CampaignCreator $campaignCreator,
        PipelineStatusEnum $newStatus,
        ?string $notes = null
    ): CampaignCreator {
        $campaignCreator->loadMissing(['creator']);
        $creator = $campaignCreator->creator;

        // RÀNG BUỘC CHI PHÍ CAST:
        // Nếu có phát sinh chi phí cast (booking_fee > 0) và chưa được duyệt (approved_cost_at is null)
        $hasCastFee = (float) $campaignCreator->booking_fee > 0;
        $isCastApproved = !is_null($campaignCreator->approved_cost_at);

        if ($hasCastFee && !$isCastApproved) {
            // Nếu chuyển sang "agreed", tự động chuyển hướng thành "waiting_approval"
            if ($newStatus === PipelineStatusEnum::AGREED) {
                $newStatus = PipelineStatusEnum::WAITING_APPROVAL;
            } elseif (in_array($newStatus, [
                PipelineStatusEnum::ADDRESS_CONFIRMED,
                PipelineStatusEnum::SAMPLE_SENT,
                PipelineStatusEnum::SAMPLE_RECEIVED,
                PipelineStatusEnum::POSTED,
                PipelineStatusEnum::COMPLETED,
            ])) {
                $feeFormatted = number_format((float) $campaignCreator->booking_fee, 0, ',', '.') . ' đ';
                throw new Exception("KOC {$creator->name} có phát sinh chi phí cast ({$feeFormatted}) chưa được duyệt. Vui lòng bấm [Xác nhận Lãnh đạo đã duyệt] trước khi tiếp tục các bước tiếp theo.");
            }
        }

        // RÀNG BUỘC 1: Không thể chuyển sang "sample_sent" (Đã gửi mẫu) nếu chưa có địa chỉ nhận hàng
        if ($newStatus === PipelineStatusEnum::SAMPLE_SENT) {
            $shippingAddress = trim($creator->shipping_address ?? '');
            if ($shippingAddress === '') {
                throw new Exception("Không thể chuyển sang bước [Đã gửi mẫu] vì Creator {$creator->name} chưa có địa chỉ nhận hàng trong hồ sơ.");
            }
        }

        // RÀNG BUỘC 2: Không thể chuyển sang "sample_received" (Đã nhận mẫu) nếu chưa gửi mẫu
        if ($newStatus === PipelineStatusEnum::SAMPLE_RECEIVED) {
            $isSent = !is_null($campaignCreator->sample_sent_at) || $campaignCreator->status === PipelineStatusEnum::SAMPLE_SENT;
            if (!$isSent) {
                throw new Exception("Không thể chuyển sang bước [Đã nhận mẫu] vì chưa gửi mẫu cho KOC {$creator->name}.");
            }
        }

        // RÀNG BUỘC 3: Không thể chuyển sang "posted" (Đã lên video) nếu chưa gửi mẫu hoặc chưa có link video
        if ($newStatus === PipelineStatusEnum::POSTED) {
            $isSent = !is_null($campaignCreator->sample_sent_at) || in_array($campaignCreator->status, [
                PipelineStatusEnum::SAMPLE_SENT,
                PipelineStatusEnum::SAMPLE_RECEIVED,
                PipelineStatusEnum::POSTED,
                PipelineStatusEnum::COMPLETED,
            ]);
            if (!$isSent) {
                throw new Exception("Không thể chuyển sang bước [Đã lên video] vì chưa gửi mẫu cho KOC {$creator->name}.");
            }

            // Bắt buộc phải có đường link video nghiệm thu trong bảng content_posts
            $campaignCreator->loadMissing(['contentPosts']);
            $hasVideo = $campaignCreator->contentPosts && $campaignCreator->contentPosts->count() > 0;
            if (!$hasVideo) {
                throw new Exception("Không thể chuyển sang bước [Đã lên video] vì KOC {$creator->name} chưa có link video nghiệm thu. Vui lòng điền link video.");
            }
        }

        // RÀNG BUỘC 2: Khi bị đánh dấu "no_show" (Bom hàng / Mất tích)
        // Tự động trừ 30 điểm uy tín. Nếu điểm < 40, tự động đưa vào Blacklist
        if ($newStatus === PipelineStatusEnum::NO_SHOW && $campaignCreator->status !== PipelineStatusEnum::NO_SHOW) {
            $newScore = max(0, $creator->trust_score - 30);
            $updateData = ['trust_score' => $newScore];

            if ($newScore < 40) {
                $updateData['blacklist_status'] = true;
                $updateData['blacklist_reason'] = "Tự động đưa vào Blacklist do bom hàng trong chiến dịch ID #{$campaignCreator->campaign_id}";
            }

            $creator->update($updateData);

            // Bắn thông báo CẢNH BÁO BOM HÀNG cho Admin & Leader
            try {
                $campaignCreator->loadMissing(['creator', 'campaign']);
                $managers = User::whereHas('roles', function ($q) {
                    $q->whereIn('name', ['Admin', 'Leader']);
                })->get();
                if ($managers->isEmpty()) {
                    $managers = User::take(1)->get();
                }
                foreach ($managers as $manager) {
                    $manager->notify(new KocNoShowAlertNotification($campaignCreator));
                }
            } catch (\Throwable $e) {
                Log::warning('Lỗi gửi cảnh báo bom hàng: ' . $e->getMessage());
            }
        }

        // Cập nhật timestamp tương ứng với trạng thái
        $timestampCol = $newStatus->timestampColumn();
        $updates = [
            'status' => $newStatus,
        ];

        if ($timestampCol && is_null($campaignCreator->{$timestampCol})) {
            $updates[$timestampCol] = now();
        }

        if ($notes) {
            $updates['notes'] = $notes;
        }

        $campaignCreator->update($updates);

        // Tự động làm mới cache báo cáo ROI / Phễu của chiến dịch, Dashboard và Workspace
        if (class_exists(\Modules\Report\Services\ReportCalculationService::class)) {
            \Modules\Report\Services\ReportCalculationService::flushReportCache($campaignCreator->campaign_id);
        }
        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushDashboardCache();
            \App\Services\SystemCacheService::flushWorkspaceCache();
        }

        return $campaignCreator;
    }

    /**
     * Gán nhân viên phụ trách Creator trong chiến dịch
     */
    public function assignStaff(CampaignCreator $campaignCreator, ?int $userId): CampaignCreator
    {
        $oldAssignee = $campaignCreator->assigned_to;
        $campaignCreator->update(['assigned_to' => $userId]);

        if ($userId && $userId !== $oldAssignee) {
            try {
                $user = User::find($userId);
                if ($user) {
                    $assignerName = auth()->user()?->name ?? 'Quản lý';
                    $campaignCreator->loadMissing(['creator', 'campaign']);
                    $user->notify(new KocAssignedNotification($campaignCreator, $assignerName));
                }
            } catch (\Throwable $e) {
                Log::warning('Lỗi gửi thông báo phân công phụ trách: ' . $e->getMessage());
            }
        }

        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushWorkspaceCache();
        }

        return $campaignCreator;
    }

    /**
     * Cập nhật trạng thái hàng loạt cho nhiều Creator trong chiến dịch
     *
     * @param int[] $ids Danh sách ID campaign_creators
     * @param PipelineStatusEnum $newStatus Trạng thái mới
     * @param string|null $notes Ghi chú bổ sung
     * @return array{updated: int, errors: string[]}
     */
    public function bulkUpdateStatus(array $ids, PipelineStatusEnum $newStatus, ?string $notes = null): array
    {
        $updated = 0;
        $errors = [];

        // Chuẩn hóa và sắp xếp ID tăng dần để loại bỏ nguy cơ MySQL InnoDB Deadlock
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        sort($ids);

        $items = CampaignCreator::query()
            ->whereIn('id', $ids)
            ->orderBy('id')
            ->with(['creator'])
            ->get();

        foreach ($items as $item) {
            try {
                $this->updateCreatorStatus(
                    campaignCreator: $item,
                    newStatus: $newStatus,
                    notes: $notes
                );
                $updated++;
            } catch (Exception $e) {
                $errors[] = "{$item->creator->name}: {$e->getMessage()}";
            }
        }

        return [
            'updated' => $updated,
            'errors' => $errors,
        ];
    }

    /**
     * Phân bổ nhân sự phụ trách hàng loạt cho nhiều Creator
     *
     * @param int[] $ids
     * @param int|null $userId
     * @return int Số bản ghi đã cập nhật
     */
    public function bulkAssignStaff(array $ids, ?int $userId): int
    {
        // Chuẩn hóa và sắp xếp ID tăng dần để loại bỏ nguy cơ MySQL InnoDB Deadlock
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        sort($ids);

        $updated = CampaignCreator::query()
            ->whereIn('id', $ids)
            ->update(['assigned_to' => $userId]);

        if ($userId && $updated > 0) {
            try {
                $user = User::find($userId);
                if ($user) {
                    $assignerName = auth()->user()?->name ?? 'Quản lý';
                    $sampleCreator = CampaignCreator::whereIn('id', $ids)->with(['creator', 'campaign'])->first();
                    if ($sampleCreator) {
                        $user->notify(new KocAssignedNotification($sampleCreator, $assignerName));
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Lỗi gửi thông báo phân công hàng loạt: ' . $e->getMessage());
            }
        }

        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushWorkspaceCache();
        }

        return $updated;
    }

    /**
     * Cập nhật nhanh thông tin dòng (Inline Edit)
     */
    public function quickUpdate(CampaignCreator $campaignCreator, array $data): CampaignCreator
    {
        $fillableData = [];

        if (array_key_exists('booking_fee', $data)) {
            $newFee = (float) $data['booking_fee'];
            $oldFee = (float) $campaignCreator->booking_fee;
            $fillableData['booking_fee'] = $newFee;

            // Nếu thay đổi chi phí cast thành mức mới > 0 khác mức cũ, reset phê duyệt
            if ($newFee > 0 && abs($newFee - $oldFee) > 0.01) {
                $fillableData['approved_cost_at'] = null;
            }
        }

        if (array_key_exists('notes', $data)) {
            $fillableData['notes'] = $data['notes'];
        }

        if (array_key_exists('assigned_to', $data)) {
            $fillableData['assigned_to'] = $data['assigned_to'] ? (int) $data['assigned_to'] : null;
        }

        if (!empty($fillableData)) {
            $campaignCreator->update($fillableData);
        }

        // Nếu có cập nhật trạng thái
        if (!empty($data['status'])) {
            $newStatus = $data['status'] instanceof PipelineStatusEnum
                ? $data['status']
                : PipelineStatusEnum::from((string) $data['status']);

            $this->updateCreatorStatus($campaignCreator, $newStatus, $data['notes'] ?? null);
        } elseif (array_key_exists('booking_fee', $data) && (float) $data['booking_fee'] > 0 && is_null($campaignCreator->approved_cost_at)) {
            // Nếu chỉ cập nhật phí > 0 mà KOC đang ở contacted/new, tự động chuyển sang waiting_approval
            if (in_array($campaignCreator->status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED])) {
                $this->updateCreatorStatus($campaignCreator, PipelineStatusEnum::WAITING_APPROVAL);
            }
        }

        return $campaignCreator->fresh(['creator', 'assignee']);
    }

    /**
     * Xác nhận chi phí cast đã được ban lãnh đạo thông qua (nhân viên thao tác trực tiếp)
     */
    public function confirmCastApproved(
        CampaignCreator $campaignCreator,
        array $data = []
    ): CampaignCreator {
        $updates = [
            'status' => PipelineStatusEnum::AGREED,
            'approved_cost_at' => now(),
        ];

        if (!empty($data['approver_name'])) {
            $updates['approver_name'] = trim($data['approver_name']);
        }

        if (!empty($data['approval_notes'])) {
            $updates['approval_notes'] = trim($data['approval_notes']);
        }

        if (is_null($campaignCreator->agreed_at)) {
            $updates['agreed_at'] = now();
        }

        $campaignCreator->update($updates);

        if (class_exists(\Modules\Report\Services\ReportCalculationService::class)) {
            \Modules\Report\Services\ReportCalculationService::flushReportCache($campaignCreator->campaign_id);
        }
        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushDashboardCache();
            \App\Services\SystemCacheService::flushWorkspaceCache();
        }

        return $campaignCreator->fresh(['creator', 'assignee']);
    }

    /**
     * Chuyển KOC về trạng thái Đã liên hệ để đàm phán lại nếu lãnh đạo không đồng ý mức phí
     */
    public function reopenDeal(
        CampaignCreator $campaignCreator,
        ?string $reason = null
    ): CampaignCreator {
        $updates = [
            'status' => PipelineStatusEnum::CONTACTED,
            'approved_cost_at' => null,
        ];

        if ($reason) {
            $updates['notes'] = $reason;
        }

        $campaignCreator->update($updates);

        if (class_exists(\Modules\Report\Services\ReportCalculationService::class)) {
            \Modules\Report\Services\ReportCalculationService::flushReportCache($campaignCreator->campaign_id);
        }
        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushDashboardCache();
            \App\Services\SystemCacheService::flushWorkspaceCache();
        }

        return $campaignCreator->fresh(['creator', 'assignee']);
    }

    /**
     * Tính toán deadline nộp video: theo cấu hình của chiến dịch (mặc định 7 ngày kể từ khi nhận mẫu)
     */
    public function calculateDeadline(CampaignCreator $item): ?array
    {
        if (!$item->sample_received_at || in_array($item->status, [PipelineStatusEnum::POSTED, PipelineStatusEnum::COMPLETED])) {
            return null;
        }

        $item->loadMissing(['campaign']);
        $deadlineDays = (int) ($item->campaign?->video_deadline_days ?: 7);

        $receivedDate = $item->sample_received_at->copy()->startOfDay();
        $deadline = $receivedDate->copy()->addDays($deadlineDays);
        $today = now()->startOfDay();

        $diffDays = (int) $today->diffInDays($deadline, false);

        if ($diffDays < 0) {
            return [
                'status' => 'overdue',
                'days' => abs($diffDays),
                'text' => 'Quá hạn ' . abs($diffDays) . ' ngày',
                'date' => $deadline->format('d/m/Y'),
            ];
        } elseif ($diffDays <= 2) {
            return [
                'status' => 'warning',
                'days' => $diffDays,
                'text' => 'Còn ' . $diffDays . ' ngày',
                'date' => $deadline->format('d/m/Y'),
            ];
        }

        return [
            'status' => 'safe',
            'days' => $diffDays,
            'text' => 'Hạn: ' . $deadline->format('d/m/Y'),
            'date' => $deadline->format('d/m/Y'),
        ];
    }
}
