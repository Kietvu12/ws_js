import emailService from './emailService.js';
import config from '../config/index.js';

/** Cơ sở URL (CTV, ứng viên). */
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.WEB_URL || 'http://localhost:5173').replace(/\/+$/, '');
/**
 * Link trang admin trong email (ví dụ /admin/nominations/...).
 * Luôn có giá trị: ưu tiên FRONTEND_URL_ADMIN trên .env, không set thì dùng FRONTEND_URL (tránh ReferenceError nếu thiếu khai báo trên bản build).
 */
const FRONTEND_URL_ADMIN = (process.env.FRONTEND_URL_ADMIN || FRONTEND_URL).replace(/\/+$/, '');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildNominationSubmittedEmail({
  applicationCode,
  candidateName,
  positionNameVi,
  positionNameEn,
  positionNameJp,
  detailUrl
}) {
  const jpPosition = positionNameJp || positionNameVi || positionNameEn || 'N/A';
  const enPosition = positionNameEn || positionNameVi || positionNameJp || 'N/A';
  const viPosition = positionNameVi || positionNameEn || positionNameJp || 'N/A';

  const safeAppCode = escapeHtml(applicationCode || 'N/A');
  const safeCandidate = escapeHtml(candidateName || 'N/A');
  const safePositionJp = escapeHtml(jpPosition);
  const safePositionEn = escapeHtml(enPosition);
  const safePositionVi = escapeHtml(viPosition);
  const safeUrl = escapeHtml(detailUrl);

  const subject = '[WS Job Share] 推薦完了のお知らせ / Application Submitted / Hồ sơ đã được tiến cử';
  const text = `いつもご利用いただき、ありがとうございます。
以下の内容で推薦が完了いたしました。

・推薦番号： ${applicationCode || 'N/A'}
・候補者名： ${candidateName || 'N/A'}
・ポジション： ${jpPosition}

詳細は以下よりご確認ください。
${detailUrl}

==================================================
Thank you for your continued support.
The application has been submitted successfully.

Application No: ${applicationCode || 'N/A'}
Candidate: ${candidateName || 'N/A'}
Position: ${enPosition}

Please check the details in the system.
${detailUrl}

==================================================
Cảm ơn bạn đã sử dụng hệ thống.
Hồ sơ đã được tiến cử thành công với thông tin sau:

Mã đơn tiến cử: ${applicationCode || 'N/A'}
Ứng viên: ${candidateName || 'N/A'}
Vị trí: ${viPosition}

Vui lòng xem chi tiết trên hệ thống.
${detailUrl}

ご不明な点がございましたら、お気軽にお問い合わせください。
Workstation JobShare
Email: jobshare@work-station.vn
Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
      <p style="margin: 0 0 8px;">
        いつもご利用いただき、ありがとうございます。<br/>
        以下の内容で推薦が完了いたしました。<br/><br/>
        ・推薦番号： ${safeAppCode}<br/>
        ・候補者名： ${safeCandidate}<br/>
        ・ポジション： ${safePositionJp}<br/><br/>
        詳細は<a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">こちら</a>よりご確認ください。
      </p>

      <p style="margin: 12px 0;">==================================================</p>

      <p style="margin: 0 0 8px;">
        Thank you for your continued support.<br/>
        The application has been submitted successfully.<br/><br/>
        Application No: ${safeAppCode}<br/>
        Candidate: ${safeCandidate}<br/>
        Position: ${safePositionEn}<br/><br/>
        Please check the <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">details</a> in the system.
      </p>

      <p style="margin: 12px 0;">==================================================</p>

      <p style="margin: 0 0 8px;">
        Cảm ơn bạn đã sử dụng hệ thống.<br/>
        Hồ sơ đã được tiến cử thành công với thông tin sau:<br/><br/>
        Mã đơn tiến cử: ${safeAppCode}<br/>
        Ứng viên: ${safeCandidate}<br/>
        Vị trí: ${safePositionVi}<br/><br/>
        Vui lòng xem <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">chi tiết</a> trên hệ thống.
      </p>

      <p style="margin: 14px 0 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      <p style="margin: 10px 0 0; font-weight: 700;">Workstation JobShare</p>
      <p style="margin: 4px 0 0;">Email: <a href="mailto:jobshare@work-station.vn" style="color: #111827;">jobshare@work-station.vn</a></p>
      <p style="margin: 2px 0 0;">Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）</p>
    </div>
  `;

  return { subject, text, html };
}

/** Mail CTV khi admin gửi tin nhắn về đơn tiến cử (trilingue, link đến /agent/nominations/:id). */
function buildCollaboratorAdminNewMessageEmail({
  applicationCode,
  candidateName,
  positionNameVi,
  positionNameEn,
  positionNameJp,
  detailUrl
}) {
  const jpPosition = positionNameJp || positionNameVi || positionNameEn || 'N/A';
  const enPosition = positionNameEn || positionNameVi || positionNameJp || 'N/A';
  const viPosition = positionNameVi || positionNameEn || positionNameJp || 'N/A';

  const safeAppCode = escapeHtml(applicationCode || 'N/A');
  const safeCandidate = escapeHtml(candidateName || 'N/A');
  const safePositionJp = escapeHtml(jpPosition);
  const safePositionEn = escapeHtml(enPosition);
  const safePositionVi = escapeHtml(viPosition);
  const safeUrl = escapeHtml(detailUrl);

  const subject = '[WS JobShare] 新着メッセージのお知らせ / New Message / Tin nhắn mới';
  const text = `いつもご利用いただき、ありがとうございます。
以下の案件について新しいメッセージがあります。

・推薦番号： ${applicationCode || 'N/A'}
・候補者名： ${candidateName || 'N/A'}
・ポジション： ${jpPosition}

詳細はこちらよりご確認ください。
${detailUrl}

==================================================
Thank you for your continued support.
You have received a new message regarding the following application:

Application No: ${applicationCode || 'N/A'}
Candidate: ${candidateName || 'N/A'}
Position: ${enPosition}

Please check the details in the system.
${detailUrl}

==================================================
Cảm ơn bạn đã sử dụng hệ thống.
Bạn có tin nhắn mới liên quan đến hồ sơ sau:

Mã đơn: ${applicationCode || 'N/A'}
Ứng viên: ${candidateName || 'N/A'}
Vị trí: ${viPosition}

Vui lòng xem chi tiết và lý do trên hệ thống.
${detailUrl}

ご不明な点がございましたら、お気軽にお問い合わせください。
Workstation JobShare
Email: jobshare@work-station.vn
Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
      <p style="margin: 0 0 8px;">
        いつもご利用いただき、ありがとうございます。<br/>
        以下の案件について新しいメッセージがあります。<br/><br/>
        ・推薦番号： ${safeAppCode}<br/>
        ・候補者名： ${safeCandidate}<br/>
        ・ポジション： ${safePositionJp}<br/><br/>
        詳細は<a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">こちら</a>よりご確認ください。
      </p>

      <p style="margin: 12px 0;">==================================================</p>

      <p style="margin: 0 0 8px;">
        Thank you for your continued support.<br/>
        You have received a new message regarding the following application:<br/><br/>
        Application No: ${safeAppCode}<br/>
        Candidate: ${safeCandidate}<br/>
        Position: ${safePositionEn}<br/><br/>
        Please check the <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">details</a> in the system.
      </p>

      <p style="margin: 12px 0;">==================================================</p>

      <p style="margin: 0 0 8px;">
        Cảm ơn bạn đã sử dụng hệ thống.<br/>
        Bạn có tin nhắn mới liên quan đến hồ sơ sau:<br/><br/>
        Mã đơn: ${safeAppCode}<br/>
        Ứng viên: ${safeCandidate}<br/>
        Vị trí: ${safePositionVi}<br/><br/>
        Vui lòng xem <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">chi tiết</a> và lý do trên hệ thống.
      </p>

      <p style="margin: 14px 0 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      <p style="margin: 10px 0 0; font-weight: 700;">Workstation JobShare</p>
      <p style="margin: 4px 0 0;">Email: <a href="mailto:jobshare@work-station.vn" style="color: #111827;">jobshare@work-station.vn</a></p>
      <p style="margin: 2px 0 0;">Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）</p>
    </div>
  `;

  return { subject, text, html };
}

const DEFAULT_EMAIL_TIME_ZONE = process.env.EMAIL_TIME_ZONE || process.env.TZ || 'Asia/Tokyo';

function formatDateTimeByLocale(dateValue, locale, timeZone = DEFAULT_EMAIL_TIME_ZONE) {
  const d = dateValue ? new Date(dateValue) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatAppliedAtVi(dateValue) {
  return formatDateTimeByLocale(dateValue, 'vi-VN');
}

function jobTitleDisplay({ jobTitleVi, jobTitleEn, jobTitleJp }) {
  return (jobTitleVi || jobTitleEn || jobTitleJp || '—').trim() || '—';
}

/**
 * Gửi cho nội bộ admin khi có đơn tiến cử mới (tiêu đề + nội dung tiếng Việt).
 * Danh sách nhận: `config.nominationNewAdminEmails` hoặc env NOMINATION_NEW_ADMIN_EMAILS.
 */
function buildNewNominationAdminEmail({
  jobApplicationId,
  candidateName,
  jobTitleVi,
  jobTitleEn,
  jobTitleJp,
  appliedAt,
  collaboratorLabel
}) {
  const appId = jobApplicationId != null ? String(jobApplicationId) : '—';
  /** Giống mail mẫu: mã đơn = id bản ghi job_applications */
  const codeLine = appId;
  const idForUrl =
    jobApplicationId != null && String(jobApplicationId).trim() !== '' && /^\d+$/.test(String(jobApplicationId).trim())
      ? String(jobApplicationId).trim()
      : null;
  const adminNominationUrl = idForUrl ? `${FRONTEND_URL_ADMIN}/admin/nominations/${idForUrl}` : null;

  const candidate = String(candidateName || '—').trim() || '—';
  const jobTitle = jobTitleDisplay({ jobTitleVi, jobTitleEn, jobTitleJp });
  const submitted = formatAppliedAtVi(appliedAt);
  const ctv = String(collaboratorLabel || '—').trim() || '—';

  const codeLinePlain = adminNominationUrl
    ? `Mã đơn tiến cử: ${codeLine} (${adminNominationUrl})`
    : `Mã đơn tiến cử: ${codeLine}`;

  const subject = '[JobShare] Thông báo: Đơn tiến cử mới trên hệ thống';
  const text = `[JobShare] Thông báo: Đơn tiến cử mới trên hệ thống
Kính gửi Quý admin,

Hệ thống JobShare vừa ghi nhận một đơn tiến cử mới với thông tin như sau:

${codeLinePlain}
Tên ứng viên: ${candidate}
Tên job: ${jobTitle}
Ngày nộp đơn: ${submitted}
CTV tiến cử: ${ctv}

Quý anh/chị vui lòng nhanh chóng kiểm tra và xử lý theo quy trình.

Trân trọng,

WS JobShare`;

  const safeCode = escapeHtml(codeLine);
  const safeUrl = adminNominationUrl ? escapeHtml(adminNominationUrl) : '';
  const codeLineHtml = adminNominationUrl
    ? `Mã đơn tiến cử: <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;"><strong>${safeCode}</strong></a>`
    : `Mã đơn tiến cử: <strong>${safeCode}</strong>`;
  const safeCandidate = escapeHtml(candidate);
  const safeJob = escapeHtml(jobTitle);
  const safeSubmitted = escapeHtml(submitted);
  const safeCtv = escapeHtml(ctv);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6;">
      <p style="margin: 0 0 10px; font-weight: 700;">[JobShare] Thông báo: Đơn tiến cử mới trên hệ thống</p>
      <p style="margin: 0 0 10px;">Kính gửi Quý admin,</p>
      <p style="margin: 0 0 10px;">Hệ thống JobShare vừa ghi nhận một đơn tiến cử mới với thông tin như sau:</p>
      <p style="margin: 0 0 8px;">
        ${codeLineHtml}<br/>
        Tên ứng viên: <strong>${safeCandidate}</strong><br/>
        Tên job: <strong>${safeJob}</strong><br/>
        Ngày nộp đơn: <strong>${safeSubmitted}</strong><br/>
        CTV tiến cử: <strong>${safeCtv}</strong>
      </p>
      <p style="margin: 12px 0 10px;">Quý anh/chị vui lòng nhanh chóng kiểm tra và xử lý theo quy trình.</p>
      <p style="margin: 0;">Trân trọng,</p>
      <p style="margin: 8px 0 0; font-weight: 700;">WS JobShare</p>
    </div>
  `;

  return { subject, text, html };
}

export const nominationEmailService = {
  /**
   * @param {Object} params
   * @param {string|number} params.jobApplicationId
   * @param {string} [params.candidateName]
   * @param {string} [params.jobTitleVi]
   * @param {string} [params.jobTitleEn]
   * @param {string} [params.jobTitleJp]
   * @param {Date|string} [params.appliedAt]
   * @param {string} [params.collaboratorLabel] — tên CTV hoặc mô tả (ứng viên tự nộp, admin tạo, …)
   */
  async sendNewNominationAdminNotification(params) {
    const list = Array.isArray(config.nominationNewAdminEmails)
      ? config.nominationNewAdminEmails
      : [];
    if (!list.length) {
      return { skipped: true, reason: 'no_admin_recipients' };
    }
    const content = buildNewNominationAdminEmail(params);
    return emailService.sendEmail({
      to: list,
      subject: content.subject,
      text: content.text,
      html: content.html
    });
  },

  async sendNominationSubmittedEmail({ to, jobApplicationId, jobCode, candidateName, jobTitleVi, jobTitleEn, jobTitleJp }) {
    if (!to) return { skipped: true, reason: 'missing_email' };
    const detailUrl = `${FRONTEND_URL}/agent/nominations/${jobApplicationId}`;
    const content = buildNominationSubmittedEmail({
      applicationCode: jobCode || String(jobApplicationId),
      candidateName,
      positionNameVi: jobTitleVi,
      positionNameEn: jobTitleEn,
      positionNameJp: jobTitleJp,
      detailUrl
    });

    return emailService.sendEmail({
      to,
      subject: content.subject,
      text: content.text,
      html: content.html
    });
  },

  /** Admin chat về đơn tiến cử → mail cho CTV (mẫu tin nhắn mới). */
  async sendCollaboratorAdminNewMessageEmail({
    to,
    jobApplicationId,
    jobCode,
    candidateName,
    jobTitleVi,
    jobTitleEn,
    jobTitleJp
  }) {
    if (!to) return { skipped: true, reason: 'missing_email' };
    const detailUrl = `${FRONTEND_URL}/agent/nominations/${jobApplicationId}`;
    const content = buildCollaboratorAdminNewMessageEmail({
      applicationCode: jobCode || String(jobApplicationId),
      candidateName,
      positionNameVi: jobTitleVi,
      positionNameEn: jobTitleEn,
      positionNameJp: jobTitleJp,
      detailUrl
    });

    return emailService.sendEmail({
      to,
      subject: content.subject,
      text: content.text,
      html: content.html
    });
  },

  async sendInterviewScheduledEmail({
    to,
    jobApplicationId,
    jobCode,
    candidateName,
    jobTitleVi,
    jobTitleEn,
    jobTitleJp,
    interviewDate
  }) {
    if (!to) return { skipped: true, reason: 'missing_email' };

    const jpPosition = jobTitleJp || jobTitleVi || jobTitleEn || 'N/A';
    const enPosition = jobTitleEn || jobTitleVi || jobTitleJp || 'N/A';
    const viPosition = jobTitleVi || jobTitleEn || jobTitleJp || 'N/A';
    const jpTime = formatDateTimeByLocale(interviewDate, 'ja-JP');
    const enTime = formatDateTimeByLocale(interviewDate, 'en-US');
    const viTime = formatDateTimeByLocale(interviewDate, 'vi-VN');
    const detailUrl = `${FRONTEND_URL}/agent/nominations/${jobApplicationId}`;

    const subject = '[WS Job Share] 面接日程確定のお知らせ / Interview Scheduled / Đã có lịch phỏng vấn';
    const text = `いつもご利用いただき、ありがとうございます。
面接日程が確定いたしました。

・推薦番号： ${jobCode || String(jobApplicationId)}
・候補者名： ${candidateName || 'N/A'}
・ポジション： ${jpPosition}
・面接日時： ${jpTime}

詳細は以下よりご確認ください。
${detailUrl}

==================================================
Thank you for your continued support.
The interview has been scheduled.

Application No: ${jobCode || String(jobApplicationId)}
Candidate: ${candidateName || 'N/A'}
Position: ${enPosition}
Interview Time: ${enTime}

Please check the details in the system.
${detailUrl}

==================================================
Cảm ơn bạn đã sử dụng hệ thống.
Lịch phỏng vấn đã được xác nhận:

Mã đơn tiến cử: ${jobCode || String(jobApplicationId)}
Ứng viên: ${candidateName || 'N/A'}
Vị trí: ${viPosition}
Thời gian phỏng vấn: ${viTime}

Vui lòng xem chi tiết trên hệ thống.
${detailUrl}`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
        <p style="margin: 0 0 8px;">
          いつもご利用いただき、ありがとうございます。<br/>
          面接日程が確定いたしました。<br/><br/>
          ・推薦番号： ${escapeHtml(jobCode || String(jobApplicationId))}<br/>
          ・候補者名： ${escapeHtml(candidateName || 'N/A')}<br/>
          ・ポジション： ${escapeHtml(jpPosition)}<br/>
          ・面接日時： ${escapeHtml(jpTime)}<br/><br/>
          詳細は<a href="${escapeHtml(detailUrl)}" style="color: #2563eb; text-decoration: underline;">こちら</a>よりご確認ください。
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Thank you for your continued support.<br/>
          The interview has been scheduled.<br/><br/>
          Application No: ${escapeHtml(jobCode || String(jobApplicationId))}<br/>
          Candidate: ${escapeHtml(candidateName || 'N/A')}<br/>
          Position: ${escapeHtml(enPosition)}<br/>
          Interview Time: ${escapeHtml(enTime)}<br/><br/>
          Please check the <a href="${escapeHtml(detailUrl)}" style="color: #2563eb; text-decoration: underline;">details</a> in the system.
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Cảm ơn bạn đã sử dụng hệ thống.<br/>
          Lịch phỏng vấn đã được xác nhận:<br/><br/>
          Mã đơn tiến cử: ${escapeHtml(jobCode || String(jobApplicationId))}<br/>
          Ứng viên: ${escapeHtml(candidateName || 'N/A')}<br/>
          Vị trí: ${escapeHtml(viPosition)}<br/>
          Thời gian phỏng vấn: ${escapeHtml(viTime)}<br/><br/>
          Vui lòng xem <a href="${escapeHtml(detailUrl)}" style="color: #2563eb; text-decoration: underline;">chi tiết</a> trên hệ thống.
        </p>
      </div>
    `;

    return emailService.sendEmail({ to, subject, text, html });
  },

  async sendNominationFailedEmail({
    to,
    jobApplicationId,
    jobCode,
    candidateName,
    jobTitleVi,
    jobTitleEn,
    jobTitleJp,
    rejectReason
  }) {
    if (!to) return { skipped: true, reason: 'missing_email' };

    const jpPosition = jobTitleJp || jobTitleVi || jobTitleEn || 'N/A';
    const enPosition = jobTitleEn || jobTitleVi || jobTitleJp || 'N/A';
    const viPosition = jobTitleVi || jobTitleEn || jobTitleJp || 'N/A';
    const reasonText = String(rejectReason || '').trim();
    const jpReason = reasonText || 'システム上の詳細をご確認ください。';
    const enReason = reasonText || 'Please check details in the system.';
    const viReason = reasonText || 'Vui lòng xem chi tiết trên hệ thống.';
    const detailUrl = `${FRONTEND_URL}/agent/nominations/${jobApplicationId}`;
    const appCode = jobCode || String(jobApplicationId);

    const subject = '[WS Job Share] 書類選考結果のお知らせ / Application Result / Kết quả hồ sơ';
    const text = `いつもご利用いただき、ありがとうございます。
書類選考の結果は不合格となりました。

・推薦番号： ${appCode}
・候補者名： ${candidateName || 'N/A'}
・ポジション： ${jpPosition}

詳細および理由は以下よりご確認ください。
${detailUrl}
理由: ${jpReason}

==================================================
Thank you for your continued support.
The application has not passed the screening stage.

Application No: ${appCode}
Candidate: ${candidateName || 'N/A'}
Position: ${enPosition}

Please check the details and reason in the system.
${detailUrl}
Reason: ${enReason}

==================================================
Cảm ơn bạn đã sử dụng hệ thống.
Hồ sơ đã không đạt ở vòng xét duyệt.

Mã đơn: ${appCode}
Ứng viên: ${candidateName || 'N/A'}
Vị trí: ${viPosition}

Vui lòng xem chi tiết và lý do trên hệ thống.
${detailUrl}
Lý do: ${viReason}

ご不明な点がございましたら、お気軽にお問い合わせください。
Workstation JobShare
Email: jobshare@work-station.vn
Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）`;

    const safeUrl = escapeHtml(detailUrl);
    const safeAppCode = escapeHtml(appCode);
    const safeCandidate = escapeHtml(candidateName || 'N/A');
    const safePositionJp = escapeHtml(jpPosition);
    const safePositionEn = escapeHtml(enPosition);
    const safePositionVi = escapeHtml(viPosition);
    const safeReasonJp = escapeHtml(jpReason);
    const safeReasonEn = escapeHtml(enReason);
    const safeReasonVi = escapeHtml(viReason);

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
        <p style="margin: 0 0 8px;">
          いつもご利用いただき、ありがとうございます。<br/>
          書類選考の結果は不合格となりました。<br/><br/>
          ・推薦番号： ${safeAppCode}<br/>
          ・候補者名： ${safeCandidate}<br/>
          ・ポジション： ${safePositionJp}<br/><br/>
          詳細および理由は<a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">こちら</a>よりご確認ください。<br/>
          理由: ${safeReasonJp}
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Thank you for your continued support.<br/>
          The application has not passed the screening stage.<br/><br/>
          Application No: ${safeAppCode}<br/>
          Candidate: ${safeCandidate}<br/>
          Position: ${safePositionEn}<br/><br/>
          Please check the <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">details</a> and reason in the system.<br/>
          Reason: ${safeReasonEn}
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Cảm ơn bạn đã sử dụng hệ thống.<br/>
          Hồ sơ đã không đạt ở vòng xét duyệt:<br/><br/>
          Mã đơn: ${safeAppCode}<br/>
          Ứng viên: ${safeCandidate}<br/>
          Vị trí: ${safePositionVi}<br/><br/>
          Vui lòng xem <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">chi tiết</a> và lý do trên hệ thống.<br/>
          Lý do: ${safeReasonVi}
        </p>

        <p style="margin: 14px 0 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p style="margin: 10px 0 0; font-weight: 700;">Workstation JobShare</p>
        <p style="margin: 4px 0 0;">Email: <a href="mailto:jobshare@work-station.vn" style="color: #111827;">jobshare@work-station.vn</a></p>
        <p style="margin: 2px 0 0;">Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）</p>
      </div>
    `;

    return emailService.sendEmail({ to, subject, text, html });
  },

  async sendJobOfferEmail({
    to,
    jobApplicationId,
    jobCode,
    candidateName,
    jobTitleVi,
    jobTitleEn,
    jobTitleJp
  }) {
    if (!to) return { skipped: true, reason: 'missing_email' };

    const jpPosition = jobTitleJp || jobTitleVi || jobTitleEn || 'N/A';
    const enPosition = jobTitleEn || jobTitleVi || jobTitleJp || 'N/A';
    const viPosition = jobTitleVi || jobTitleEn || jobTitleJp || 'N/A';
    const detailUrl = `${FRONTEND_URL}/agent/nominations/${jobApplicationId}`;
    const appCode = jobCode || String(jobApplicationId);

    const subject = '[WS Job Share] 内定のお知らせ / Job Offer / Ứng viên đã có thông báo trúng tuyển';
    const text = `いつもご利用いただき、ありがとうございます。
この度、選考の結果、内定となりました。誠におめでとうございます。

・推薦番号： ${appCode}
・候補者名： ${candidateName || 'N/A'}
・ポジション： ${jpPosition}

詳細は以下よりご確認ください。
${detailUrl}

==================================================
Thank you for your continued support.
We are pleased to inform you that the candidate has received a job offer (Naitei). Congratulations.

Application No: ${appCode}
Candidate: ${candidateName || 'N/A'}
Position: ${enPosition}

Please check the details in the system.
${detailUrl}

==================================================
Cảm ơn bạn đã sử dụng hệ thống.
Chúng tôi xin thông báo ứng viên đã nhận được nội định. Xin chúc mừng.

Mã đơn: ${appCode}
Ứng viên: ${candidateName || 'N/A'}
Vị trí: ${viPosition}

Vui lòng xem chi tiết và lý do trên hệ thống.
${detailUrl}

ご不明な点がございましたら、お気軽にお問い合わせください。
Workstation JobShare
Email: jobshare@work-station.vn
Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）`;

    const safeUrl = escapeHtml(detailUrl);
    const safeAppCode = escapeHtml(appCode);
    const safeCandidate = escapeHtml(candidateName || 'N/A');
    const safePositionJp = escapeHtml(jpPosition);
    const safePositionEn = escapeHtml(enPosition);
    const safePositionVi = escapeHtml(viPosition);

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
        <p style="margin: 0 0 8px;">
          いつもご利用いただき、ありがとうございます。<br/>
          この度、選考の結果、内定となりました。誠におめでとうございます。<br/><br/>
          ・推薦番号： ${safeAppCode}<br/>
          ・候補者名： ${safeCandidate}<br/>
          ・ポジション： ${safePositionJp}<br/><br/>
          詳細は<a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">こちら</a>よりご確認ください。
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Thank you for your continued support.<br/>
          We are pleased to inform you that the candidate has received a job offer (Naitei). Congratulations.<br/><br/>
          Application No: ${safeAppCode}<br/>
          Candidate: ${safeCandidate}<br/>
          Position: ${safePositionEn}<br/><br/>
          Please check the <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">details</a> in the system.
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Cảm ơn bạn đã sử dụng hệ thống.<br/>
          Chúng tôi xin thông báo ứng viên đã nhận được nội định. Xin chúc mừng.<br/><br/>
          Mã đơn: ${safeAppCode}<br/>
          Ứng viên: ${safeCandidate}<br/>
          Vị trí: ${safePositionVi}<br/><br/>
          Vui lòng xem <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">chi tiết</a> trong hệ thống.
        </p>

        <p style="margin: 14px 0 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p style="margin: 10px 0 0; font-weight: 700;">Workstation JobShare</p>
        <p style="margin: 4px 0 0;">Email: <a href="mailto:jobshare@work-station.vn" style="color: #111827;">jobshare@work-station.vn</a></p>
        <p style="margin: 2px 0 0;">Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）</p>
      </div>
    `;

    return emailService.sendEmail({ to, subject, text, html });
  },

  async sendOfferAcceptedEmail({
    to,
    jobApplicationId,
    jobCode,
    candidateName,
    jobTitleVi,
    jobTitleEn,
    jobTitleJp
  }) {
    if (!to) return { skipped: true, reason: 'missing_email' };

    const jpPosition = jobTitleJp || jobTitleVi || jobTitleEn || 'N/A';
    const enPosition = jobTitleEn || jobTitleVi || jobTitleJp || 'N/A';
    const viPosition = jobTitleVi || jobTitleEn || jobTitleJp || 'N/A';
    const detailUrl = `${FRONTEND_URL}/agent/nominations/${jobApplicationId}`;
    const appCode = jobCode || String(jobApplicationId);

    const subject = '[WS Job Share] 内定承諾のお知らせ / Offer Accepted / Ứng viên đã đồng ý nhận việc';
    const text = `いつもご利用いただき、ありがとうございます。
候補者が内定を承諾いたしました。

・推薦番号： ${appCode}
・候補者名： ${candidateName || 'N/A'}
・ポジション： ${jpPosition}

詳細は以下よりご確認ください。
${detailUrl}

==================================================
Thank you for your continued support.
The candidate has accepted the job offer.

Application No: ${appCode}
Candidate: ${candidateName || 'N/A'}
Position: ${enPosition}

Please check the details in the system.
${detailUrl}

==================================================
Cảm ơn bạn đã sử dụng hệ thống.
Ứng viên đã đồng ý nhận việc.

Mã đơn: ${appCode}
Ứng viên: ${candidateName || 'N/A'}
Vị trí: ${viPosition}

Vui lòng xem chi tiết và lý do trên hệ thống.
${detailUrl}

ご不明な点がございましたら、お気軽にお問い合わせください。
Workstation JobShare
Email: jobshare@work-station.vn
Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）`;

    const safeUrl = escapeHtml(detailUrl);
    const safeAppCode = escapeHtml(appCode);
    const safeCandidate = escapeHtml(candidateName || 'N/A');
    const safePositionJp = escapeHtml(jpPosition);
    const safePositionEn = escapeHtml(enPosition);
    const safePositionVi = escapeHtml(viPosition);

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
        <p style="margin: 0 0 8px;">
          いつもご利用いただき、ありがとうございます。<br/>
          候補者が内定を承諾いたしました。<br/><br/>
          ・推薦番号： ${safeAppCode}<br/>
          ・候補者名： ${safeCandidate}<br/>
          ・ポジション： ${safePositionJp}<br/><br/>
          詳細は<a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">こちら</a>よりご確認ください。
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Thank you for your continued support.<br/>
          The candidate has accepted the job offer.<br/><br/>
          Application No: ${safeAppCode}<br/>
          Candidate: ${safeCandidate}<br/>
          Position: ${safePositionEn}<br/><br/>
          Please check the <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">details</a> in the system.
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Cảm ơn bạn đã sử dụng hệ thống.<br/>
          Ứng viên đã đồng ý nhận việc.<br/><br/>
          Mã đơn: ${safeAppCode}<br/>
          Ứng viên: ${safeCandidate}<br/>
          Vị trí: ${safePositionVi}<br/><br/>
          Vui lòng xem <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">chi tiết</a> trong hệ thống.
        </p>

        <p style="margin: 14px 0 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p style="margin: 10px 0 0; font-weight: 700;">Workstation JobShare</p>
        <p style="margin: 4px 0 0;">Email: <a href="mailto:jobshare@work-station.vn" style="color: #111827;">jobshare@work-station.vn</a></p>
        <p style="margin: 2px 0 0;">Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）</p>
      </div>
    `;

    return emailService.sendEmail({ to, subject, text, html });
  },

  async sendJoinedCompanyEmail({
    to,
    jobApplicationId,
    jobCode,
    candidateName,
    jobTitleVi,
    jobTitleEn,
    jobTitleJp,
    startDate
  }) {
    if (!to) return { skipped: true, reason: 'missing_email' };

    const jpPosition = jobTitleJp || jobTitleVi || jobTitleEn || 'N/A';
    const enPosition = jobTitleEn || jobTitleVi || jobTitleJp || 'N/A';
    const viPosition = jobTitleVi || jobTitleEn || jobTitleJp || 'N/A';
    const dateObj = startDate ? new Date(startDate) : null;
    const jpStartDate = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('ja-JP') : 'N/A';
    const enStartDate = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US') : 'N/A';
    const viStartDate = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN') : 'N/A';
    const detailUrl = `${FRONTEND_URL}/agent/nominations/${jobApplicationId}`;
    const appCode = jobCode || String(jobApplicationId);

    const subject = '[WS Job Share] 入社のお知らせ / Joined Company / Ứng viên đã vào công ty';
    const text = `いつもご利用いただき、ありがとうございます。
候補者が入社いたしました。

・推薦番号： ${appCode}
・候補者名： ${candidateName || 'N/A'}
・ポジション： ${jpPosition}
・入社日： ${jpStartDate}

詳細は以下よりご確認ください。
${detailUrl}

==================================================
Thank you for your continued support.
The candidate has joined the company.

Application No: ${appCode}
Candidate: ${candidateName || 'N/A'}
Position: ${enPosition}
Start Date: ${enStartDate}

Please check the details in the system.
${detailUrl}

==================================================
Cảm ơn bạn đã sử dụng hệ thống.
Ứng viên đã nhập công ty.

Mã đơn: ${appCode}
Ứng viên: ${candidateName || 'N/A'}
Vị trí: ${viPosition}
Ngày vào làm: ${viStartDate}

Vui lòng xem chi tiết và lý do trên hệ thống.
${detailUrl}

ご不明な点がございましたら、お気軽にお問い合わせください。
Workstation JobShare
Email: jobshare@work-station.vn
Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）`;

    const safeUrl = escapeHtml(detailUrl);
    const safeAppCode = escapeHtml(appCode);
    const safeCandidate = escapeHtml(candidateName || 'N/A');
    const safePositionJp = escapeHtml(jpPosition);
    const safePositionEn = escapeHtml(enPosition);
    const safePositionVi = escapeHtml(viPosition);
    const safeJpStartDate = escapeHtml(jpStartDate);
    const safeEnStartDate = escapeHtml(enStartDate);
    const safeViStartDate = escapeHtml(viStartDate);

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
        <p style="margin: 0 0 8px;">
          いつもご利用いただき、ありがとうございます。<br/>
          候補者が入社いたしました。<br/><br/>
          ・推薦番号： ${safeAppCode}<br/>
          ・候補者名： ${safeCandidate}<br/>
          ・ポジション： ${safePositionJp}<br/>
          ・入社日： ${safeJpStartDate}<br/><br/>
          詳細は<a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">こちら</a>よりご確認ください。
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Thank you for your continued support.<br/>
          The candidate has joined the company.<br/><br/>
          Application No: ${safeAppCode}<br/>
          Candidate: ${safeCandidate}<br/>
          Position: ${safePositionEn}<br/>
          Start Date: ${safeEnStartDate}<br/><br/>
          Please check the <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">details</a> in the system.
        </p>

        <p style="margin: 12px 0;">==================================================</p>

        <p style="margin: 0 0 8px;">
          Cảm ơn bạn đã sử dụng hệ thống.<br/>
          Ứng viên đã nhập công ty.<br/><br/>
          Mã đơn: ${safeAppCode}<br/>
          Ứng viên: ${safeCandidate}<br/>
          Vị trí: ${safePositionVi}<br/>
          Ngày vào làm: ${safeViStartDate}<br/><br/>
          Vui lòng xem <a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;">chi tiết</a> trong hệ thống.
        </p>

        <p style="margin: 14px 0 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p style="margin: 10px 0 0; font-weight: 700;">Workstation JobShare</p>
        <p style="margin: 4px 0 0;">Email: <a href="mailto:jobshare@work-station.vn" style="color: #111827;">jobshare@work-station.vn</a></p>
        <p style="margin: 2px 0 0;">Hotline: (+81) 8094411975（日本）/ (+84) 906130296（ベトナム）</p>
      </div>
    `;

    return emailService.sendEmail({ to, subject, text, html });
  }
};

