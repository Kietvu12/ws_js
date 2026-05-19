import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import { JOB_APPLICATION_STATUS_LABELS } from '../../utils/jobApplicationStatus';

const STATUS_THEME_MAP = {
  1: { headerBg: '#dc2626', bodyBg: '#fef2f2', outerBorder: '#fca5a5', innerBorder: '#fecaca', innerBg: '#fee2e2', accentText: '#991b1b' },
  2: { headerBg: '#0891b2', bodyBg: '#ecfeff', outerBorder: '#67e8f9', innerBorder: '#a5f3fc', innerBg: '#cffafe', accentText: '#155e75' },
  3: { headerBg: '#ca8a04', bodyBg: '#fffbeb', outerBorder: '#fcd34d', innerBorder: '#fde68a', innerBg: '#fef3c7', accentText: '#92400e' },
  4: { headerBg: '#dc2626', bodyBg: '#fef2f2', outerBorder: '#fca5a5', innerBorder: '#fecaca', innerBg: '#fee2e2', accentText: '#991b1b' },
  5: { headerBg: '#2563eb', bodyBg: '#eff6ff', outerBorder: '#93c5fd', innerBorder: '#bfdbfe', innerBg: '#dbeafe', accentText: '#1e40af' },
  6: { headerBg: '#dc2626', bodyBg: '#fef2f2', outerBorder: '#fca5a5', innerBorder: '#fecaca', innerBg: '#fee2e2', accentText: '#991b1b' },
  7: { headerBg: '#7c3aed', bodyBg: '#f5f3ff', outerBorder: '#c4b5fd', innerBorder: '#ddd6fe', innerBg: '#ede9fe', accentText: '#5b21b6' },
  8: { headerBg: '#4f46e5', bodyBg: '#eef2ff', outerBorder: '#a5b4fc', innerBorder: '#c7d2fe', innerBg: '#e0e7ff', accentText: '#3730a3' },
  9: { headerBg: '#0e7490', bodyBg: '#ecfeff', outerBorder: '#67e8f9', innerBorder: '#a5f3fc', innerBg: '#cffafe', accentText: '#155e75' },
  10: { headerBg: '#dc2626', bodyBg: '#fef2f2', outerBorder: '#fca5a5', innerBorder: '#fecaca', innerBg: '#fee2e2', accentText: '#991b1b' },
  11: { headerBg: '#0f766e', bodyBg: '#f0fdfa', outerBorder: '#5eead4', innerBorder: '#99f6e4', innerBg: '#ccfbf1', accentText: '#115e59' },
  12: { headerBg: '#059669', bodyBg: '#ecfdf5', outerBorder: '#86efac', innerBorder: '#bbf7d0', innerBg: '#dcfce7', accentText: '#166534' },
  13: { headerBg: '#be123c', bodyBg: '#fff1f2', outerBorder: '#fda4af', innerBorder: '#fecdd3', innerBg: '#ffe4e6', accentText: '#9f1239' },
  14: { headerBg: '#16a34a', bodyBg: '#f0fdf4', outerBorder: '#86efac', innerBorder: '#bbf7d0', innerBg: '#dcfce7', accentText: '#166534' },
  15: { headerBg: '#16a34a', bodyBg: '#ecfdf5', outerBorder: '#86efac', innerBorder: '#bbf7d0', innerBg: '#dcfce7', accentText: '#166534' },
  16: { headerBg: '#6b7280', bodyBg: '#f9fafb', outerBorder: '#d1d5db', innerBorder: '#e5e7eb', innerBg: '#f3f4f6', accentText: '#4b5563' },
};

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();

const resolveStatusCodeFromName = (statusName) => {
  const normalizedStatus = normalizeText(statusName);
  if (!normalizedStatus) return null;

  for (let i = 1; i <= 16; i += 1) {
    const vi = normalizeText(JOB_APPLICATION_STATUS_LABELS.vi?.[i]);
    const en = normalizeText(JOB_APPLICATION_STATUS_LABELS.en?.[i]);
    const ja = normalizeText(JOB_APPLICATION_STATUS_LABELS.ja?.[i]);
    if (normalizedStatus === vi || normalizedStatus === en || normalizedStatus === ja) {
      return i;
    }
  }

  // fallback nhẹ cho nội dung thay đổi trạng thái không đồng nhất format
  if (normalizedStatus.includes('thanh toán') || normalizedStatus.includes('paid') || normalizedStatus.includes('支払')) return 15;
  if (normalizedStatus.includes('hủy') || normalizedStatus.includes('huỷ') || normalizedStatus.includes('withdrew') || normalizedStatus.includes('辞退')) return 16;
  if (normalizedStatus.includes('trượt') || normalizedStatus.includes('rejected') || normalizedStatus.includes('failed') || normalizedStatus.includes('不合格')) return 10;
  return null;
};

/**
 * Thẻ tin nhắn khi đổi trạng thái – màu theo phía (admin / CTV).
 */
const StatusChangeMessageCard = ({ statusName, reason, paymentAmount, tags = [], createdAt, formatDate, variant = 'default' }) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const isPaidStatus = statusName && (statusName.includes('thanh toán') || statusName.includes('Đã thanh toán') || statusName.includes('Paid') || statusName.includes('支払'));
  const statusCode = resolveStatusCodeFromName(statusName);
  const isAdminSide = variant === 'adminSide';
  const isCtvSide = variant === 'ctvSide';
  const statusTheme = statusCode ? STATUS_THEME_MAP[statusCode] : null;
  const headerBg = statusTheme?.headerBg || (isAdminSide ? '#7c3aed' : isCtvSide ? '#0d9488' : '#4b5563');
  const headerColor = '#ffffff';
  const bodyBg = statusTheme?.bodyBg || (isAdminSide ? '#f5f3ff' : isCtvSide ? '#f0fdfa' : '#ffffff');
  const innerBorder = statusTheme?.innerBorder || (isAdminSide ? '#c4b5fd' : isCtvSide ? '#5eead4' : '#e5e7eb');
  const innerBg = statusTheme?.innerBg || (isAdminSide ? '#ede9fe' : isCtvSide ? '#ccfbf1' : '#f9fafb');
  const accentText = statusTheme?.accentText || (isAdminSide ? '#5b21b6' : isCtvSide ? '#115e59' : '#6b7280');
  const outerBorder = statusTheme?.outerBorder || (isAdminSide ? '#6d28d9' : isCtvSide ? '#0f766e' : '#d1d5db');

  return (
    <div
      className="rounded-xl overflow-hidden max-w-[85%] shadow-md border-2"
      style={{
        borderColor: outerBorder,
        backgroundColor: bodyBg,
      }}
    >
      <div
        className="px-3 py-2 text-center font-bold text-sm border-b"
        style={{ backgroundColor: headerBg, color: headerColor, borderColor: headerBg }}
      >
        {statusName || t.chatStatusDefaultName}
      </div>

      <div className="px-3 py-3 space-y-2">
        {isPaidStatus && paymentAmount ? (
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: accentText }}>
              {t.chatPaymentAmountLabel}
            </p>
            <div
              className="text-sm rounded-lg border-2 px-2 py-1.5 min-h-[2rem] font-semibold"
              style={{ borderColor: innerBorder, backgroundColor: innerBg, color: '#111827' }}
            >
              {paymentAmount}
            </div>
          </div>
        ) : null}

        {reason && reason.trim() ? (
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: accentText }}>
              Lý do:
            </p>
            <div
              className="text-sm rounded-lg border-2 px-2 py-1.5 min-h-[2rem]"
              style={{ borderColor: innerBorder, backgroundColor: innerBg, color: '#111827' }}
            >
              {reason.trim()}
            </div>
          </div>
        ) : null}

        {(tags && tags.length > 0) && (
          <div className="space-y-1 pt-1">
            {tags.map((tag, i) => (
              <p key={i} className="text-sm pl-2" style={{ color: '#374151' }}>
                + {typeof tag === 'string' ? tag : tag.label || tag}
              </p>
            ))}
          </div>
        )}
      </div>

      {formatDate && createdAt && (
        <p className="text-xs px-3 py-1.5 border-t font-medium" style={{ borderColor: innerBorder, color: accentText }}>
          {formatDate(createdAt)}
        </p>
      )}
    </div>
  );
};

export default StatusChangeMessageCard;
