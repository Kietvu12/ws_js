import React, { useMemo, useEffect } from 'react';

export function rangeOffsetsRelativeTo(container, range) {
  if (!container || !range || !container.contains(range.commonAncestorContainer)) return null;
  try {
    const pre = document.createRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    if (end <= start) return null;
    return { start, end };
  } catch {
    return null;
  }
}

/**
 * Áp mark từ field form (khác fieldKey template) — khớp selectedText hoặc đoạn ký tự Nhật trong selection.
 */
export function linkedRangeFromMark(text, mark) {
  const t = text ?? '';
  if (!t || !mark) return null;
  const st = (mark.selectedText || '').trim();
  if (!st) return null;
  if (t.includes(st)) {
    const i = t.indexOf(st);
    return { id: mark.id, start: i, end: i + st.length };
  }
  if (st.includes(t)) {
    return { id: mark.id, start: 0, end: t.length };
  }
  const jp = st.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g);
  if (jp) {
    for (const seg of jp) {
      if (seg.length >= 1 && t.includes(seg)) {
        const i = t.indexOf(seg);
        return { id: mark.id, start: i, end: i + seg.length };
      }
    }
  }
  return null;
}

export function buildMarkedParts(text, ranges) {
  const t = text ?? '';
  const sorted = [...(ranges || [])]
    .filter((r) => r && r.end > r.start)
    .sort((a, b) => a.start - b.start);
  const parts = [];
  let i = 0;
  for (const r of sorted) {
    const a = Math.max(0, Math.min(r.start, t.length));
    const b = Math.max(0, Math.min(r.end, t.length));
    if (b <= a) continue;
    if (a > i) parts.push({ kind: 'text', key: `p-${i}`, text: t.slice(i, a) });
    parts.push({ kind: 'mark', key: r.id || `m-${a}-${b}`, id: r.id, text: t.slice(a, b) });
    i = b;
  }
  if (i < t.length) parts.push({ kind: 'text', key: `p-end`, text: t.slice(i) });
  return parts.length ? parts : [{ kind: 'text', key: 'empty', text: t }];
}

/**
 * @param {string[]} [linkedFieldKeys] — mark từ form (cùng semantic) hiển thị trên chuỗi `text` khác (template JP).
 */
export function SupplementMarkedText({ text, fieldKey, allMarks, linkedFieldKeys }) {
  const ranges = useMemo(() => {
    const out = [];
    for (const m of allMarks || []) {
      if (!m) continue;
      if (m.fieldKey === fieldKey) {
        if (m.end > m.start) out.push({ id: m.id, start: m.start, end: m.end });
        continue;
      }
      if (linkedFieldKeys?.includes(m.fieldKey)) {
        const r = linkedRangeFromMark(text, m);
        if (r) out.push(r);
      }
    }
    return out;
  }, [allMarks, fieldKey, text, linkedFieldKeys]);
  const parts = useMemo(() => buildMarkedParts(text, ranges), [text, ranges]);

  return (
    <>
      {parts.map((p) => {
        if (p.kind === 'text') {
          return <span key={p.key}>{p.text}</span>;
        }
        return (
          <mark
            key={p.key}
            data-supp-mark-id={p.id}
            className="rounded-sm px-0.5"
            style={{ backgroundColor: '#fef08a', color: '#111827' }}
          >
            {p.text}
          </mark>
        );
      })}
    </>
  );
}

/**
 * Menu ngữ cảnh cố định — gọi onMark / onUnmark từ parent
 */
export function SupplementContextMenu({ open, x, y, items, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const close = () => onClose?.();
    // Tránh chuột phải vừa mở menu vừa kích hoạt "click" đóng ngay (defer sau tick mở menu)
    const t = window.setTimeout(() => {
      window.addEventListener('click', close);
    }, 100);
    window.addEventListener('scroll', close, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open, onClose]);

  if (!open || !items?.length) return null;
  return (
    <div
      className="fixed z-[9999] min-w-[200px] rounded-lg border bg-white py-1 shadow-lg text-sm"
      style={{ left: x, top: y, borderColor: '#e5e7eb' }}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
          style={{ color: '#111827' }}
          onClick={() => {
            it.onSelect();
            onClose?.();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/**
 * fieldKey: gắn data-supplement-field-wrap để resolve đúng container khi chọn text (kể cả capture phase).
 * onContextMenu: gắn vào onContextMenuCapture để chặn menu mặc định trước khi trình duyệt hiển thị.
 */
export function SupplementFieldWrap({ children, className, onContextMenu, style, fieldKey }) {
  return (
    <div
      data-supplement-field-wrap={fieldKey || undefined}
      className={className || 'select-text'}
      onContextMenuCapture={onContextMenu}
      style={style}
    >
      {children}
    </div>
  );
}
