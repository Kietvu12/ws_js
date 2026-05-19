import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/** Chuẩn hóa % cột sao cho tổng = 100 */
export function normalizeColPercents(arr) {
  if (!arr?.length) return [];
  const sum = arr.reduce((a, b) => a + Math.max(0.1, b), 0);
  return arr.map((x) => (Math.max(0.1, x) / sum) * 100);
}

function sumColspan(tr) {
  if (!tr?.cells?.length) return 0;
  let s = 0;
  for (let i = 0; i < tr.cells.length; i += 1) {
    s += tr.cells[i].colSpan || 1;
  }
  return s;
}

function collectVerticalBoundaries(rows, wrapRect, nCols) {
  const candidates = [];
  const maxR = Math.min(rows.length, 8);
  for (let ri = 0; ri < maxR; ri += 1) {
    const tr = rows[ri];
    for (let i = 0; i < tr.cells.length; i += 1) {
      const cell = tr.cells[i];
      const x = cell.getBoundingClientRect().right - wrapRect.left;
      if (x < wrapRect.width - 0.5) candidates.push(x);
    }
  }
  candidates.sort((a, b) => a - b);
  const uniq = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const x = candidates[i];
    if (!uniq.length || x - uniq[uniq.length - 1] > 0.5) uniq.push(x);
  }
  return uniq.slice(0, Math.max(0, nCols - 1));
}

/**
 * Bảng kéo đổi độ rộng cột / chiều cao hàng.
 * - layoutKey + onLayoutCommit: đồng bộ preview/PDF (lưu { cols, rows } vào formData.cvTableLayout).
 */
export default function ResizableCvTable({
  colPercents: initialColPercents,
  children,
  className,
  style,
  tableStyle,
  layoutKey,
  onLayoutCommit,
}) {
  const wrapRef = useRef(null);
  const tableRef = useRef(null);
  const [colCount, setColCount] = useState(0);
  const [colPercents, setColPercents] = useState(() =>
    initialColPercents?.length ? normalizeColPercents(initialColPercents) : []
  );
  const [rowHeights, setRowHeights] = useState({});
  const [vHandles, setVHandles] = useState([]);
  const [hHandles, setHHandles] = useState([]);
  const dragRef = useRef(null);
  const lastInitStrRef = useRef('');
  const commitTimerRef = useRef(null);
  const colPercentsRef = useRef(colPercents);
  const rowHeightsRef = useRef(rowHeights);
  colPercentsRef.current = colPercents;
  rowHeightsRef.current = rowHeights;

  const initStr = JSON.stringify(initialColPercents || []);

  const measureHandles = useCallback(() => {
    const table = tableRef.current;
    const wrap = wrapRef.current;
    if (!table || !wrap) return;
    const rows = table.querySelectorAll('tbody > tr, thead > tr');
    if (!rows.length) {
      setVHandles([]);
      setHHandles([]);
      return;
    }
    const n = sumColspan(rows[0]);
    if (n === 0) {
      setVHandles([]);
      setHHandles([]);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const boundaries = collectVerticalBoundaries(rows, wrapRect, n);
    const v = boundaries.map((left, i) => ({ left, colIndex: i }));
    const h = [];
    rows.forEach((tr, ri) => {
      if (ri >= rows.length - 1) return;
      const rect = tr.getBoundingClientRect();
      h.push({ top: rect.bottom - wrapRect.top, rowIndex: ri });
    });
    setVHandles(v);
    setHHandles(h);
  }, []);

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const rows = table.querySelectorAll('tbody > tr, thead > tr');
    if (!rows.length) return;
    const n = sumColspan(rows[0]);
    if (n === 0) return;
    setColCount(n);

    const ext = initialColPercents;
    const extLenOk = Array.isArray(ext) && ext.length === n;

    if (initStr !== lastInitStrRef.current) {
      lastInitStrRef.current = initStr;
      if (extLenOk) {
        setColPercents(normalizeColPercents(ext));
      } else {
        setColPercents((prev) => (prev.length === n ? prev : Array(n).fill(100 / n)));
      }
    } else {
      setColPercents((prev) => {
        if (prev.length === n) return prev;
        if (extLenOk) return normalizeColPercents(ext);
        return Array(n).fill(100 / n);
      });
    }
  }, [children, initStr, initialColPercents]);

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (table) {
      const rows = table.querySelectorAll('tbody > tr, thead > tr');
      rows.forEach((tr, ri) => {
        const h = rowHeights[ri];
        if (h != null) {
          tr.style.minHeight = `${h}px`;
          tr.style.height = `${h}px`;
        } else {
          tr.style.minHeight = '';
          tr.style.height = '';
        }
      });
    }
    measureHandles();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measureHandles()) : null;
    const el = wrapRef.current;
    if (ro && el) ro.observe(el);
    window.addEventListener('resize', measureHandles);
    return () => {
      window.removeEventListener('resize', measureHandles);
      if (ro && el) ro.unobserve(el);
    };
  }, [measureHandles, colPercents, children, rowHeights]);

  useEffect(() => {
    if (!layoutKey || !onLayoutCommit) return undefined;
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      onLayoutCommit(layoutKey, {
        cols: colPercentsRef.current.map((x) => +x.toFixed(4)),
        rows: { ...rowHeightsRef.current },
      });
    }, 450);
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, [layoutKey, onLayoutCommit, colPercents, rowHeights]);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      if (d.type === 'col') {
        const tableW = tableRef.current?.getBoundingClientRect().width || 1;
        const deltaPct = ((e.clientX - d.startX) / tableW) * 100;
        const i = d.colIndex;
        setColPercents((prev) => {
          if (i < 0 || i >= prev.length - 1) return prev;
          const next = [...prev];
          const a = Math.max(3, d.startPct[i] + deltaPct);
          const b = Math.max(3, d.startPct[i + 1] - deltaPct);
          next[i] = a;
          next[i + 1] = b;
          return normalizeColPercents(next);
        });
      } else if (d.type === 'row') {
        const dy = e.clientY - d.startY;
        const ri = d.rowIndex;
        const base = d.startHeight;
        const h = Math.max(20, base + dy);
        setRowHeights((prev) => ({ ...prev, [ri]: h }));
      }
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const colgroup = useMemo(() => {
    if (!colCount || colPercents.length !== colCount) return null;
    return (
      <colgroup>
        {colPercents.map((p, i) => (
          <col key={i} style={{ width: `${p}%` }} />
        ))}
      </colgroup>
    );
  }, [colCount, colPercents]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <table
        ref={tableRef}
        className={className}
        style={{
          ...style,
          tableLayout: 'fixed',
          width: '100%',
          ...tableStyle,
        }}
      >
        {colgroup}
        {children}
      </table>
      {vHandles.map((h) => (
        <div
          key={`v-${h.colIndex}`}
          role="separator"
          aria-orientation="vertical"
          className="absolute top-0 bottom-0 z-[5] -translate-x-1/2"
          style={{
            left: h.left,
            width: 8,
            cursor: 'col-resize',
            backgroundColor: 'transparent',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragRef.current = {
              type: 'col',
              colIndex: h.colIndex,
              startX: e.clientX,
              startPct: [...colPercents],
            };
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.12)';
          }}
          onMouseLeave={(e) => {
            if (dragRef.current?.type !== 'col') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        />
      ))}
      {hHandles.map((h) => (
        <div
          key={`h-${h.rowIndex}`}
          role="separator"
          aria-orientation="horizontal"
          className="absolute left-0 right-0 z-[5] -translate-y-1/2"
          style={{
            top: h.top,
            height: 8,
            cursor: 'row-resize',
            backgroundColor: 'transparent',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rows = tableRef.current?.querySelectorAll('tbody > tr, thead > tr');
            const tr = rows?.[h.rowIndex];
            const startHeight = tr?.getBoundingClientRect().height ?? 32;
            dragRef.current = {
              type: 'row',
              rowIndex: h.rowIndex,
              startY: e.clientY,
              startHeight,
            };
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.12)';
          }}
          onMouseLeave={(e) => {
            if (dragRef.current?.type !== 'row') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        />
      ))}
    </div>
  );
}
