import { useState, useCallback } from 'react';
import { randomUUID } from '../../utils/randomUUID.js';
import { rangeOffsetsRelativeTo } from './CandidateDetailSupplementMarks.jsx';

const defaultLabels = () => ({
  markSupplement: 'Đánh dấu bổ sung thông tin',
  unmarkSupplement: 'Bỏ đánh dấu',
});

/**
 * Đánh dấu bổ sung thông tin (chuột phải) — dùng chung CandidateDetail / AddCandidateForm / CvTemplate*.
 * @param {object} opts
 * @param {boolean} opts.enabled - Admin hoặc điều kiện hiển thị menu
 * @param {Array} opts.marks
 * @param {function} opts.setMarks - (prev => next) | next
 * @param {function} [opts.persist] - async (nextMarks) => void sau khi đổi marks (optional)
 */
export function useSupplementMarking({ enabled, marks, setMarks, persist }) {
  const [supplementCtx, setSupplementCtx] = useState(null);

  const handleFieldContextMenu = useCallback(
    (e, fieldKey) => {
      if (!enabled) return;
      const markEl = e.target.closest?.('[data-supp-mark-id]');
      if (markEl) {
        e.preventDefault();
        e.stopPropagation();
        setSupplementCtx({
          kind: 'unmark',
          markId: markEl.getAttribute('data-supp-mark-id'),
          x: e.clientX,
          y: e.clientY,
        });
        return;
      }

      // <input> / <textarea>: Selection API thường không trả về vùng chọn — dùng selectionStart/End
      const el = e.target;
      if (
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') &&
        typeof el.selectionStart === 'number' &&
        typeof el.selectionEnd === 'number'
      ) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start === end || end < start) return;
        const val = el.value ?? '';
        const selectedText = val.slice(start, end);
        if (!selectedText.trim()) return;
        e.preventDefault();
        e.stopPropagation();
        setSupplementCtx({
          kind: 'mark',
          fieldKey,
          start,
          end,
          selectedText: selectedText.slice(0, 2000),
          x: e.clientX,
          y: e.clientY,
        });
        return;
      }

      const wrapHost =
        typeof e.target?.closest === 'function'
          ? e.target.closest('[data-supplement-field-wrap]')
          : null;
      const fieldEl = wrapHost || e.currentTarget;
      const sel = window.getSelection();
      const tx = sel?.toString?.()?.trim();
      if (!tx) return;
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (!range) return;
      const anchor = range.commonAncestorContainer;
      const inside =
        fieldEl.contains(anchor) ||
        fieldEl === anchor ||
        (anchor.nodeType === Node.TEXT_NODE && fieldEl.contains(anchor.parentNode));
      if (!inside) return;
      e.preventDefault();
      e.stopPropagation();
      const off = rangeOffsetsRelativeTo(fieldEl, range);
      if (!off || off.end <= off.start) return;
      setSupplementCtx({
        kind: 'mark',
        fieldKey,
        start: off.start,
        end: off.end,
        selectedText: tx.slice(0, 2000),
        x: e.clientX,
        y: e.clientY,
      });
    },
    [enabled]
  );

  const confirmAddSupplementMark = useCallback(() => {
    if (!supplementCtx || supplementCtx.kind !== 'mark') return;
    const id = randomUUID();
    const ctx = supplementCtx;
    setMarks((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const next = [
        ...base,
        {
          id,
          fieldKey: ctx.fieldKey,
          start: ctx.start,
          end: ctx.end,
          selectedText: ctx.selectedText,
        },
      ];
      if (persist) queueMicrotask(() => persist(next));
      return next;
    });
    setSupplementCtx(null);
  }, [supplementCtx, setMarks, persist]);

  const confirmRemoveSupplementMark = useCallback(
    (markId) => {
      setMarks((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const next = base.filter((m) => String(m.id) !== String(markId));
        if (persist) queueMicrotask(() => persist(next));
        return next;
      });
      setSupplementCtx(null);
    },
    [setMarks, persist]
  );

  const getContextMenuProps = useCallback(
    (labels = defaultLabels()) => ({
      open: !!supplementCtx,
      x: supplementCtx?.x ?? 0,
      y: supplementCtx?.y ?? 0,
      onClose: () => setSupplementCtx(null),
      items:
        supplementCtx?.kind === 'mark'
          ? [{ key: 'add', label: labels.markSupplement, onSelect: confirmAddSupplementMark }]
          : supplementCtx?.kind === 'unmark'
            ? [
                {
                  key: 'un',
                  label: labels.unmarkSupplement,
                  onSelect: () => confirmRemoveSupplementMark(supplementCtx.markId),
                },
              ]
            : [],
    }),
    [supplementCtx, confirmAddSupplementMark, confirmRemoveSupplementMark]
  );

  return {
    supplementCtx,
    setSupplementCtx,
    handleFieldContextMenu,
    confirmAddSupplementMark,
    confirmRemoveSupplementMark,
    getContextMenuProps,
  };
}
