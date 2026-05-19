import {
  JobApplication,
  Job,
  CVStorage,
  PaymentRequest,
  Message
} from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { collaboratorNotificationService } from '../services/collaboratorNotificationService.js';

/** Status 14 = Đã vào công ty */
const STATUS_JOINED_COMPANY = 14;

/**
 * Test 1 phút: đặt true (mặc định) — hoặc ghi đè bằng PAYMENT_DUE_AFTER_MINUTES=N.
 * Production: đặt false và không set PAYMENT_DUE_AFTER_MINUTES → cửa sổ 3 tháng.
 */
const USE_ONE_MINUTE_TEST_WINDOW = true;

const PAYMENT_DUE_AFTER_MINUTES_RAW =
  process.env.PAYMENT_DUE_AFTER_MINUTES ?? (USE_ONE_MINUTE_TEST_WINDOW ? '1' : undefined);
const useMinuteDueWindow =
  PAYMENT_DUE_AFTER_MINUTES_RAW != null &&
  PAYMENT_DUE_AFTER_MINUTES_RAW !== '' &&
  !Number.isNaN(Number(PAYMENT_DUE_AFTER_MINUTES_RAW));

function getNyushaDueThreshold() {
  const now = new Date();
  if (useMinuteDueWindow) {
    const mins = Math.max(1, parseInt(PAYMENT_DUE_AFTER_MINUTES_RAW, 10) || 1);
    return new Date(now.getTime() - mins * 60 * 1000);
  }
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setHours(0, 0, 0, 0);
  return threeMonthsAgo;
}

export function getPaymentSchedulerIntervalMs() {
  if (useMinuteDueWindow) {
    const raw = process.env.PAYMENT_SCHEDULER_INTERVAL_MS;
    return Math.max(5000, parseInt(raw || '60000', 10) || 60000);
  }
  return 24 * 60 * 60 * 1000;
}

/**
 * Scheduled job: Khi đủ điều kiện (mặc định: 3 tháng sau ngày vào công ty; test: PAYMENT_DUE_AFTER_MINUTES=1),
 * tạo PaymentRequest (số tiền 0, chờ duyệt) và tin nhắn từ phía CTV trong chat.
 */
/**
 * Điều kiện đủ hạn để tạo yêu cầu thanh toán:
 * - Production (3 tháng): bắt buộc có nyusha_date và nyusha_date <= ngưỡng (đã qua đủ tháng).
 * - Test (theo phút): (có nyusha và nyusha <= ngưỡng) HOẶC (chưa có nyusha nhưng đơn đã cập nhật trước ngưỡng — thường gặp khi chỉ đổi status 14 mà chưa nhập ngày nhập công ty).
 */
function buildEligibleWhere(dueThreshold) {
  const hasCtv = { collaboratorId: { [Op.ne]: null } };

  if (!useMinuteDueWindow) {
    return {
      status: STATUS_JOINED_COMPANY,
      ...hasCtv,
      nyushaDate: {
        [Op.lte]: dueThreshold,
        [Op.ne]: null
      }
    };
  }

  return {
    status: STATUS_JOINED_COMPANY,
    ...hasCtv,
    [Op.or]: [
      {
        nyushaDate: {
          [Op.ne]: null,
          [Op.lte]: dueThreshold
        }
      },
      {
        [Op.and]: [
          { nyushaDate: { [Op.is]: null } },
          // Sequelize có thể map sai updatedAt → updated_at trong Op.and lồng nhau → dùng tên cột DB
          sequelize.where(sequelize.col('JobApplication.updated_at'), Op.lte, dueThreshold)
        ]
      }
    ]
  };
}

export async function checkAndCreatePaymentRequestsAfter3Months() {
  try {
    const dueThreshold = getNyushaDueThreshold();

    // Tìm job_application có:
    // - status = 14 (Đã vào công ty), có CTV
    // - đủ điều kiện ngày (xem buildEligibleWhere)
    // - chưa có payment_request nào
    const jobApplications = await JobApplication.findAll({
      where: buildEligibleWhere(dueThreshold),
      include: [
        {
          model: PaymentRequest,
          as: 'paymentRequests',
          required: false
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'jobCode', 'title'],
          required: false
        },
        {
          model: CVStorage,
          as: 'cv',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    let createdCount = 0;

    for (const jobApp of jobApplications) {
      // Bỏ qua nếu đã có payment request
      if (jobApp.paymentRequests && jobApp.paymentRequests.length > 0) {
        continue;
      }
      if (!jobApp.collaboratorId) {
        continue;
      }

      const autoNote = useMinuteDueWindow
        ? `Yêu cầu thanh toán tạo tự động khi đủ điều kiện (test: ${PAYMENT_DUE_AFTER_MINUTES_RAW} phút sau ngày vào công ty). Số tiền mặc định 0đ — Admin nhập số tiền và phê duyệt.`
        : 'Yêu cầu thanh toán được tạo tự động sau 3 tháng kể từ ngày vào công ty. Số tiền mặc định 0đ — Admin nhập số tiền và phê duyệt.';

      // Tạo PaymentRequest (amount = 0, chờ admin nhập / phê duyệt)
      const paymentRequest = await PaymentRequest.create({
        collaboratorId: jobApp.collaboratorId,
        jobApplicationId: jobApp.id,
        amount: 0,
        status: 0, // Chờ duyệt
        note: autoNote
      });

      const candidateName = (jobApp.cv && jobApp.cv.name && String(jobApp.cv.name).trim()) || 'ứng viên';
      const jobTitle = (jobApp.job && jobApp.job.title && String(jobApp.job.title).trim()) || '—';
      const content = `Yêu cầu thanh toán cho đơn tiến cử ${candidateName} vào job ${jobTitle}`;

      await Message.create({
        jobApplicationId: jobApp.id,
        adminId: null,
        collaboratorId: jobApp.collaboratorId,
        senderType: 2, // Collaborator (hiển thị như CTV gửi)
        content,
        isReadByAdmin: false,
        isReadByCollaborator: true
      });

      try {
        await collaboratorNotificationService.notifyAdminsPaymentRequestCreated({
          candidateName,
          jobCode: (jobApp.job && jobApp.job.jobCode) || String(jobApp.id),
          paymentRequestId: paymentRequest.id,
          jobApplicationId: jobApp.id
        });
      } catch (notifyErr) {
        console.error('[Payment Scheduler] Error notifying admins for payment request:', notifyErr);
      }

      createdCount++;
      console.log(`[Payment Scheduler] Đã tạo payment request #${paymentRequest.id} và message cho job application #${jobApp.id}`);
    }

    if (createdCount > 0) {
      console.log(`[Payment Scheduler] Đã tạo ${createdCount} yêu cầu thanh toán mới`);
    }
    return createdCount;
  } catch (error) {
    console.error('[Payment Scheduler] Error:', error);
    throw error;
  }
}

/** @deprecated Dùng checkAndCreatePaymentRequestsAfter3Months thay thế */
export async function checkAndUpdatePaymentStatus() {
  return checkAndCreatePaymentRequestsAfter3Months();
}

/**
 * Khởi chạy scheduler: production mỗi 24h; khi PAYMENT_DUE_AFTER_MINUTES được set (vd: 1) thì mặc định mỗi 60s.
 */
export function startPaymentScheduler() {
  checkAndCreatePaymentRequestsAfter3Months().catch(console.error);

  const intervalMs = getPaymentSchedulerIntervalMs();
  setInterval(() => {
    checkAndCreatePaymentRequestsAfter3Months().catch(console.error);
  }, intervalMs);

  if (useMinuteDueWindow) {
    console.log(
      `[Payment Scheduler] Chế độ test: PAYMENT_DUE_AFTER_MINUTES=${PAYMENT_DUE_AFTER_MINUTES_RAW}, interval=${intervalMs}ms`
    );
  } else {
    console.log('[Payment Scheduler] Đã khởi động scheduler (3 tháng sau nyusha, lặp mỗi 24 giờ)');
  }
}

