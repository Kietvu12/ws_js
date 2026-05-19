const TITLE_MAP = {
  'Đơn tiến cử mới': {
    en: 'New nomination',
    ja: '新しい推薦'
  },
  'Cập nhật trạng thái đơn tiến cử': {
    en: 'Nomination status updated',
    ja: '推薦ステータス更新'
  },
  'Tin nhắn mới': {
    en: 'New message',
    ja: '新着メッセージ'
  },
  'Thanh toán hoàn tất': {
    en: 'Payment completed',
    ja: '支払い完了'
  },
  'Đơn thanh toán được phê duyệt': {
    en: 'Payment request approved',
    ja: '支払い申請が承認されました'
  }
};

const CONTENT_PATTERNS = [
  {
    regex: /^Hồ sơ (.+) đã được tạo đơn tiến cử hộ - đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} was nominated by admin - nomination ${b}`,
    ja: (a, b) => `候補者${a}は管理者により推薦されました - 推薦${b}`
  },
  {
    regex: /^Hồ sơ (.+) đã được tiến cử thành công - đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} was successfully nominated - nomination ${b}`,
    ja: (a, b) => `候補者${a}の推薦が完了しました - 推薦${b}`
  },
  {
    regex: /^Hồ sơ (.+) đã có lịch phỏng vấn đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} has an interview schedule for nomination ${b}`,
    ja: (a, b) => `候補者${a}の推薦${b}に面接日程が設定されました`
  },
  {
    regex: /^Hồ sơ (.+) đã trượt tại đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} was rejected for nomination ${b}`,
    ja: (a, b) => `候補者${a}は推薦${b}で不採用となりました`
  },
  {
    regex: /^Hồ sơ (.+) đã có thông báo trúng tuyển tại đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} received an offer for nomination ${b}`,
    ja: (a, b) => `候補者${a}に推薦${b}の内定通知がありました`
  },
  {
    regex: /^Hồ sơ (.+) đã xác nhận thông báo trúng tuyển tại đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} confirmed the offer for nomination ${b}`,
    ja: (a, b) => `候補者${a}は推薦${b}の内定を承諾しました`
  },
  {
    regex: /^Hồ sơ (.+) đã từ chối nhận việc tại đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} declined the offer for nomination ${b}`,
    ja: (a, b) => `候補者${a}は推薦${b}の内定を辞退しました`
  },
  {
    regex: /^Hồ sơ (.+) đã vào công ty - đơn tiến cử (.+?)(?: ngày (.+))?$/u,
    en: (a, b, c) => `Candidate ${a} joined the company - nomination ${b}${c ? ` on ${c}` : ''}`,
    ja: (a, b, c) => `候補者${a}が入社しました - 推薦${b}${c ? `（${c}）` : ''}`
  },
  {
    regex: /^Hồ sơ (.+) đã hủy giữa chừng tại đơn tiến cử (.+)$/u,
    en: (a, b) => `Candidate ${a} withdrew midway for nomination ${b}`,
    ja: (a, b) => `候補者${a}は推薦${b}を途中辞退しました`
  },
  {
    regex: /^Bạn đã được thanh toán phí giới thiệu với hồ sơ (.+) - đơn tiến cử (.+)$/u,
    en: (a, b) => `You have been paid referral fee for candidate ${a} - nomination ${b}`,
    ja: (a, b) => `候補者${a}の推薦${b}に対する紹介手数料が支払われました`
  },
  {
    regex: /^Đơn thanh toán của bạn đã được phê duyệt với hồ sơ (.+) - đơn tiến cử (.+)$/u,
    en: (a, b) => `Your payment request was approved for candidate ${a} - nomination ${b}`,
    ja: (a, b) => `候補者${a}の推薦${b}に対する支払い申請が承認されました`
  },
  {
    regex: /^Bạn có tin nhắn mới về đơn tiến cử (.+)$/u,
    en: (a) => `You have a new message for nomination ${a}`,
    ja: (a) => `推薦${a}に新しいメッセージがあります`
  }
];

export function localizeNotificationTitle(rawTitle, language) {
  if (!rawTitle || language === 'vi') return rawTitle || '';
  const mapped = TITLE_MAP[rawTitle];
  if (!mapped) return rawTitle;
  return mapped[language] || rawTitle;
}

export function localizeNotificationContent(rawContent, language) {
  if (!rawContent || language === 'vi') return rawContent || '';

  for (const p of CONTENT_PATTERNS) {
    const m = rawContent.match(p.regex);
    if (m) {
      const args = m.slice(1);
      const fn = p[language];
      if (typeof fn === 'function') {
        return fn(...args);
      }
      break;
    }
  }
  return rawContent;
}

export function localizeNotification(notification, language) {
  const title = localizeNotificationTitle(notification?.title || '', language);
  const content = localizeNotificationContent(notification?.content || '', language);
  return { title, content };
}
