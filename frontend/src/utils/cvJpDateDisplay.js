/**
 * Hiển thị ngày/tháng/năm kiểu CV tiếng Nhật: `YYYY 年 M 月`, khoảng cách `～`, v.v.
 */

export function parseApiDateToYearMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { year: '', month: '' };
  const s = String(dateStr).trim();
  const iso = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
  if (iso) return { year: iso[1], month: String(parseInt(iso[2], 10)) };
  const jp = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*(?:月)?/);
  if (jp) return { year: jp[1], month: String(parseInt(jp[2], 10)) };
  return { year: '', month: '' };
}

export function isEndDateCurrent(endDate) {
  if (endDate == null || endDate === '') return false;
  const s = String(endDate).trim();
  const lower = s.toLowerCase();
  return s === '現在' || lower === 'đến nay' || lower === 'present' || lower === 'current' || s.includes('現在');
}

export function splitWorkPeriodRange(period) {
  if (period == null || period === '') return ['', ''];
  const normalized = String(period).replace(/\u301c|\uff5e|\u223c/g, '~').trim();
  const parts = normalized.split(/\s*~\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[parts.length - 1]];
  return [parts[0] || '', ''];
}

export function formatShokumuPeriodRangeJa(startRaw, endRaw) {
  const startYm = parseApiDateToYearMonth(String(startRaw || '').trim());
  const endStr = String(endRaw || '').trim();
  const endCurrent = isEndDateCurrent(endStr);
  const endYm = endCurrent ? null : parseApiDateToYearMonth(endStr);
  const part = (ym) => `${ym.year} 年 ${ym.month} 月`;
  const startOk = startYm.year !== '' && startYm.month !== '';
  const endOk = endYm && endYm.year !== '' && endYm.month !== '';
  if (startOk && endCurrent) return `${part(startYm)}～現在`;
  if (startOk && endOk) return `${part(startYm)}～${part(endYm)}`;
  if (startOk) return part(startYm);
  if (endOk) return part(endYm);
  return '';
}

/** Chuỗi một ô「期間」(履歴書 / 職務経歴). */
export function formatShokumuPeriodCell(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const [a, b] = splitWorkPeriodRange(s);
  return formatShokumuPeriodRangeJa(a, b) || s;
}

export function formatCvYearMonthJa(year, month) {
  const y = year != null && String(year).trim() !== '' ? String(year).trim() : '';
  let m = '';
  if (month != null && String(month).trim() !== '') {
    const n = parseInt(String(month).trim().replace(/^0+(?=\d)/, ''), 10);
    if (!Number.isNaN(n)) m = String(n);
  }
  if (y && m) return `${y} 年 ${m} 月`;
  if (y) return `${y} 年`;
  return '';
}

export function parseYearMonthFlexible(raw) {
  const text = String(raw || '').trim();
  const jp = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月?/);
  if (jp) return { year: jp[1], month: String(parseInt(jp[2], 10)) };
  const m = text.match(/(\d{4})\D*(\d{1,2})?/);
  return {
    year: m?.[1] || '',
    month: m?.[2] ? String(parseInt(m[2], 10)) : '',
  };
}

export function formatCvBirthDateJa(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '　') return '';
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]} 年 ${parseInt(iso[2], 10)} 月 ${parseInt(iso[3], 10)} 日`;
  const slash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slash) return `${slash[1]} 年 ${parseInt(slash[2], 10)} 月 ${parseInt(slash[3], 10)} 日`;
  if (/年|月/.test(s)) return s;
  return '';
}

export function normalizeBirthDateToStorage(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  const jp = s.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*$/);
  if (jp) {
    const mm = String(parseInt(jp[2], 10)).padStart(2, '0');
    const dd = String(parseInt(jp[3], 10)).padStart(2, '0');
    return `${jp[1]}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slash) {
    const mm = String(parseInt(slash[2], 10)).padStart(2, '0');
    const dd = String(parseInt(slash[3], 10)).padStart(2, '0');
    return `${slash[1]}-${mm}-${dd}`;
  }
  return s;
}

export function formatCvDocumentHeaderJa(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  const m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (m) return `${m[1]} 年 ${parseInt(m[2], 10)} 月 ${parseInt(m[3], 10)} 日`;
  const d = formatCvBirthDateJa(s);
  return d || s;
}

/** 在留期限・備考など: ISO / スラッシュ / 既に和文は整形して表示 */
export function formatCvAnyDateJa(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  const head = formatCvDocumentHeaderJa(s);
  if (head !== s) return head;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]} 年 ${parseInt(iso[2], 10)} 月 ${parseInt(iso[3], 10)} 日`;
  const ym = s.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) return `${ym[1]} 年 ${parseInt(ym[2], 10)} 月`;
  const sl = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (sl) return `${sl[1]} 年 ${parseInt(sl[2], 10)} 月 ${parseInt(sl[3], 10)} 日`;
  const slm = s.match(/^(\d{4})\/(\d{1,2})$/);
  if (slm) return `${slm[1]} 年 ${parseInt(slm[2], 10)} 月`;
  return s;
}
