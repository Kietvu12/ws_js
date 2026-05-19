import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X, Table, FileSpreadsheet, Archive, UserCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { translations } from '../../translations/translations';

function normHeader(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mapHeaderToField(headerCell) {
  const n = normHeader(headerCell);
  if (!n) return null;

  // Keep order similar to backend for more predictable matching
  if (n === 'chi tiết' || n === 'chi tiet') return 'detailDate';
  if (/họ\s*[&＆]?\s*tên|^ho ten$|^name$/.test(n) || n === 'họ tên') return 'name';
  if (n.includes('tiến độ') || n.includes('tien do')) return 'progress';
  if (n.includes('phản hồi') || n.includes('phan hoi')) return 'feedback';
  if (n === 'nguồn' || n === 'nguon' || n === 'source') return 'source';

  if (
    n.includes('nguyện vọng') ||
    n.includes('nguyen vong') ||
    n.includes('vị trí') ||
    n.includes('vi tri') ||
    n.includes('desired position')
  ) return 'desiredPosition';

  if (n.includes('chuyên ngành') || n.includes('chuyen nganh')) return 'major';

  if (
    n.includes('tiếng nhật') ||
    n.includes('tieng nhat') ||
    n.includes('jlpt') ||
    n.includes('kinh nghiệm tiếng nhật')
  ) return 'jlptRaw';

  if (n.includes('điện thoại') || n.includes('dien thoai') || n === 'phone' || n === 'sđt') return 'phone';
  if (n === 'email' || n.includes('e-mail')) return 'email';
  if (n.includes('địa chỉ') || n.includes('dia chi')) return 'address';
  if (n.includes('đang ở') || n.includes('dang o') || n.includes('current residence')) return 'residenceRaw';
  if (n.includes('link fb') || n.includes('facebook')) return 'fbLink';
  if (n.includes('giới tính') || n.includes('gioi tinh') || n === 'gender') return 'genderRaw';

  if (
    n.includes('cv đính kèm') ||
    n.includes('cv dinh kem') ||
    n.includes('đính kèm') ||
    (n.includes('cv') && n.includes('đính')) ||
    n === 'cv'
  ) return 'cvAttach';

  return null;
}

function safeZipName(s) {
  return String(s ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '');
}

function buildReplacementZipKey({ sheetName, rowNumber, fileIndex, fileName }) {
  const sn = safeZipName(sheetName || 'sheet');
  const fn = safeZipName(fileName || `cv_${fileIndex + 1}.pdf`);
  return `cv_${sn}_${rowNumber}_${fileIndex + 1}_${fn}`;
}

/**
 * Popup import hàng loạt ứng viên từ Excel (Admin).
 */
const BulkImportCandidatesModal = ({ isOpen, onClose, onSuccess }) => {
  const { language } = useLanguage();
  const notify = useNotification();
  const t = translations[language] || translations.vi;

  const [bulkExcelFile, setBulkExcelFile] = useState(null);
  const [bulkZipFile, setBulkZipFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState({
    percent: 0,
    stage: '',
    etaText: ''
  });
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const [collaboratorId, setCollaboratorId] = useState('');
  const [activePreviewSheet, setActivePreviewSheet] = useState(null);
  const [activeResultSheet, setActiveResultSheet] = useState(null);
  const bulkExcelInputRef = useRef(null);
  const bulkZipInputRef = useRef(null);
  const [editedByRowKey, setEditedByRowKey] = useState({});
  const [cvReplacementsByRowKey, setCvReplacementsByRowKey] = useState({});
  const bulkImportStartAtRef = useRef(null);
  const bulkImportWaitTimerRef = useRef(null);

  const makeRowKey = (sheetName, rowNumber) => `${sheetName}__${rowNumber}`;

  useEffect(() => {
    if (!isOpen) {
      setBulkExcelFile(null);
      setBulkZipFile(null);
      setBulkPreview(null);
      setBulkImportResult(null);
      setCollaboratorId('');
      setActivePreviewSheet(null);
      setActiveResultSheet(null);
      setEditedByRowKey({});
      setCvReplacementsByRowKey({});
    }
  }, [isOpen]);

  useEffect(() => {
    const order = bulkPreview?.sheetOrder;
    if (!order?.length) {
      setActivePreviewSheet(null);
      return;
    }
    setActivePreviewSheet((prev) => (prev && order.includes(prev) ? prev : order[0]));
  }, [bulkPreview]);

  const resultSheetTabs = useMemo(() => {
    if (!bulkImportResult) return [];
    const s = new Set([
      ...Object.keys(bulkImportResult.createdBySheet || {}),
      ...Object.keys(bulkImportResult.skippedBySheet || {}),
      ...Object.keys(bulkImportResult.failedBySheet || {}),
    ]);
    return [...s];
  }, [bulkImportResult]);

  useEffect(() => {
    if (!resultSheetTabs.length) {
      setActiveResultSheet(null);
      return;
    }
    setActiveResultSheet((prev) => (prev && resultSheetTabs.includes(prev) ? prev : resultSheetTabs[0]));
  }, [resultSheetTabs]);

  // Initialize editable values once preview is available.
  useEffect(() => {
    if (!bulkPreview?.bySheet) {
      setEditedByRowKey({});
      setCvReplacementsByRowKey({});
      return;
    }

    const nextEdited = {};
    const sheetOrder = bulkPreview?.sheetOrder?.length ? bulkPreview.sheetOrder : Object.keys(bulkPreview.bySheet || {});
    for (const sheetName of sheetOrder) {
      const rows = bulkPreview.bySheet?.[sheetName] || [];
      for (const r of rows) {
        const rowKey = makeRowKey(sheetName, r.row);
        const d = r.display || {};
        nextEdited[rowKey] = {
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          desiredPosition: d.desiredPosition || '',
          major: d.major || '',
          jlptRaw: d.jlptRaw || '',
          genderRaw: d.genderRaw || '',
          residenceRaw: d.residenceRaw || '',
          cvAttachRaw: (d.cvAttachRaw || '').trim(),
          cvAttachRawOriginal: (d.cvAttachRaw || '').trim()
        };
      }
    }
    setEditedByRowKey(nextEdited);
    setCvReplacementsByRowKey({});
  }, [bulkPreview]);

  const handleBulkExcelPick = (e) => {
    const f = e.target.files?.[0];
    setBulkPreview(null);
    setBulkImportResult(null);
    setBulkExcelFile(f || null);
    e.target.value = '';
  };

  const handleBulkZipPick = (e) => {
    const f = e.target.files?.[0];
    setBulkPreview(null);
    setBulkImportResult(null);
    setBulkZipFile(f || null);
    e.target.value = '';
  };

  const handleBulkPreview = async () => {
    if (!bulkExcelFile) {
      notify.warning(t.addCandidateBulkNeedExcel || 'Vui lòng chọn file Excel .xlsx');
      return;
    }
    setBulkPreviewLoading(true);
    setBulkImportResult(null);
    try {
      const fd = new FormData();
      fd.append('excelFile', bulkExcelFile);
      if (bulkZipFile) fd.append('cvZip', bulkZipFile);
      const res = await apiService.bulkImportAdminCVsPreview(fd);
      if (res?.success && res.data) {
        setBulkPreview(res.data);
        notify.success(t.addCandidateBulkPreviewOk || 'Đã tải bản xem trước');
      } else {
        notify.error(res?.message || 'Xem trước thất bại');
      }
    } catch (error) {
      notify.error(error.message || 'Xem trước thất bại');
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const handleBulkConfirmImport = async () => {
    if (!bulkExcelFile || !bulkPreview) {
      notify.warning(t.addCandidateBulkPreviewFirst || 'Hãy xem trước trước khi import');
      return;
    }
    setBulkImportLoading(true);
    setBulkImportProgress({ percent: 0, stage: 'Chuẩn bị...', etaText: '' });
    if (bulkImportWaitTimerRef.current) {
      clearInterval(bulkImportWaitTimerRef.current);
      bulkImportWaitTimerRef.current = null;
    }
    bulkImportStartAtRef.current = Date.now();

    const setProgress = (percent, stage, etaText) => {
      setBulkImportProgress((prev) => ({
        ...prev,
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        stage: stage ?? prev.stage,
        etaText: etaText ?? prev.etaText
      }));
    };

    const avgKey = 'bulkImportAvgMs';
    const defaultExpectedMs = 45000;
    const expectedMs = (() => {
      const raw = localStorage.getItem(avgKey);
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : defaultExpectedMs;
    })();

    try {
      // 1) Generate edited Excel file (based on editable preview table)
      setProgress(3, 'Chuẩn bị Excel...', '');

      const excelArrayBuffer = await bulkExcelFile.arrayBuffer();
      setProgress(20, 'Đang ghi Excel...', '');
      const wb = XLSX.read(excelArrayBuffer, { type: 'array' });

      const sheetOrder = bulkPreview?.sheetOrder?.length ? bulkPreview.sheetOrder : Object.keys(bulkPreview.bySheet || {});
      for (const sheetName of sheetOrder) {
        const sheet = wb.Sheets?.[sheetName];
        if (!sheet) continue;

        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        const headerRowIndex = range.s.r;
        const colToField = {};

        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddr = XLSX.utils.encode_cell({ r: headerRowIndex, c });
          const cell = sheet[cellAddr];
          const headerText = cell?.v ?? '';
          const field = mapHeaderToField(headerText);
          if (field) colToField[field] = c;
        }

        const rows = bulkPreview.bySheet?.[sheetName] || [];
        for (const r of rows) {
          const rowKey = makeRowKey(sheetName, r.row);
          const edit = editedByRowKey[rowKey];
          if (!edit) continue;

          const excelRowIndex = Math.max(0, r.row - 1); // XLSX uses 0-based row index
          const setCellString = (fieldKey, value) => {
            const colIndex = colToField[fieldKey];
            if (colIndex === undefined) return;
            const addr = XLSX.utils.encode_cell({ r: excelRowIndex, c: colIndex });
            const v = value == null ? '' : String(value);
            sheet[addr] = { t: 's', v };
          };

          setCellString('name', edit.name);
          setCellString('email', edit.email);
          setCellString('phone', edit.phone);
          setCellString('desiredPosition', edit.desiredPosition);
          setCellString('major', edit.major);
          setCellString('jlptRaw', edit.jlptRaw);
          setCellString('genderRaw', edit.genderRaw);
          setCellString('residenceRaw', edit.residenceRaw);
          setCellString('cvAttach', edit.cvAttachRaw);
        }
      }

      const editedExcelArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const editedExcelName = bulkExcelFile.name.replace(/\.xlsx$/i, '-edited.xlsx');
      const editedExcelFile = new File(
        [editedExcelArray],
        editedExcelName,
        { type: 'application/Y.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      // 2) Generate edited ZIP (if user replaced any CV attachments)
      const rowKeysWithReplacements = Object.keys(cvReplacementsByRowKey || {}).filter(
        (rk) => (cvReplacementsByRowKey[rk]?.files?.length || 0) > 0
      );

      let formZipFile = null;
      if (rowKeysWithReplacements.length > 0) {
        setProgress(55, 'Đang build ZIP CV...', '');
        let zip = new JSZip();
        if (bulkZipFile) {
          const origZipBuffer = await bulkZipFile.arrayBuffer();
          zip = await JSZip.loadAsync(origZipBuffer);
        }

        for (const rowKey of rowKeysWithReplacements) {
          const repl = cvReplacementsByRowKey[rowKey];
          for (const entry of repl.entries || []) {
            // entry.zipKey is the exact basename that backend will match
            const buf = await entry.file.arrayBuffer();
            zip.file(entry.zipKey, buf);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const editedZipName = (bulkZipFile?.name || 'cv-replacements.zip').replace(/\.zip$/i, '-edited.zip');
        formZipFile = new File([zipBlob], editedZipName, { type: 'application/zip' });
        setProgress(80, 'Đang sẵn sàng gửi dữ liệu...', '');
      }

      const fd = new FormData();
      fd.append('excelFile', editedExcelFile);
      if (formZipFile) {
        fd.append('cvZip', formZipFile);
      } else if (bulkZipFile) {
        fd.append('cvZip', bulkZipFile);
      }

      const cid = String(collaboratorId || '').trim();
      if (cid) fd.append('collaboratorId', cid);
      setProgress(88, 'Đang import...', '');

      // While waiting for backend response, display heuristic progress + ETA.
      const waitStart = Date.now();
      bulkImportWaitTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - waitStart;
        const t = Math.max(0, elapsed);
        // smooth curve from 88 -> 99 as time passes
        const k = expectedMs;
        const eased = 1 - Math.exp(-t / Math.max(1, k));
        const percent = 88 + (99 - 88) * eased;
        const remaining = Math.max(0, expectedMs - t);
        const sec = Math.ceil(remaining / 1000);
        const etaText = remaining <= 0 ? 'Ước tính: < 1 phút' : `ETA ~ ${sec}s`;
        setProgress(percent, 'Đang import...', etaText);
      }, 500);

      const res = await apiService.bulkImportAdminCVs(fd);
      if (bulkImportWaitTimerRef.current) {
        clearInterval(bulkImportWaitTimerRef.current);
        bulkImportWaitTimerRef.current = null;
      }

      setProgress(100, 'Hoàn tất', '');

      if (res?.success && res.data) {
        const groupBySheet = (arr) => {
          const g = {};
          for (const it of arr || []) {
            const sh = it.sheet || '—';
            if (!g[sh]) g[sh] = [];
            g[sh].push(it);
          }
          return g;
        };
        setBulkImportResult({
          ...res.data,
          createdBySheet: groupBySheet(res.data.created),
          skippedBySheet: groupBySheet(res.data.skipped),
          failedBySheet: groupBySheet(res.data.failed)
        });
        notify.success(res.message || 'Import xong');
        onSuccess?.();
      } else {
        notify.error(res?.message || 'Import thất bại');
      }
    } catch (error) {
      if (bulkImportWaitTimerRef.current) {
        clearInterval(bulkImportWaitTimerRef.current);
        bulkImportWaitTimerRef.current = null;
      }
      notify.error(error.message || 'Import thất bại');
    } finally {
      setBulkImportLoading(false);
      if (bulkImportStartAtRef.current) {
        const elapsed = Date.now() - bulkImportStartAtRef.current;
        // update moving average for ETA
        try {
          const avgKey = 'bulkImportAvgMs';
          const raw = localStorage.getItem(avgKey);
          const prevAvg = raw ? parseInt(raw, 10) : NaN;
          const base = Number.isFinite(prevAvg) && prevAvg > 0 ? prevAvg : elapsed;
          const nextAvg = Math.round(base * 0.7 + elapsed * 0.3);
          localStorage.setItem(avgKey, String(nextAvg));
        } catch {
          // ignore localStorage errors
        }
      }
      bulkImportStartAtRef.current = null;
    }
  };

  if (!isOpen) return null;

  const isHttp = (s) => /^https?:\/\//i.test(String(s || '').trim());

  const renderPreviewRow = (r, sheetName) => {
    const d = r.display || {};
    const rowKey = makeRowKey(sheetName, r.row);
    const edit = editedByRowKey[rowKey] || {};
    const replacement = cvReplacementsByRowKey[rowKey];
    const willSkipNow = !(String(edit.name || '').trim() || String(edit.email || '').trim());

    const cvParts = (r.cvFiles || []).map((cf, idx) => {
      const hintTitle = [cf.requested, cf.hint].filter(Boolean).join('\n\n') || undefined;
      const urlLabel = cf.googleExport
        ? (t.addCandidateBulkCvGoogle || 'Google → PDF')
        : (t.addCandidateBulkCvHttp || 'URL file');
      if (cf.source === 'url' && cf.requested && isHttp(cf.requested)) {
        return (
          <a
            key={`${cf.requested}-${idx}`}
            href={cf.requested.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate max-w-[200px] text-blue-600 hover:underline font-medium"
            title={hintTitle}
          >
            {t.addCandidateBulkOpenToView || 'Xem'}: {urlLabel}
          </a>
        );
      }
      return (
        <span
          key={`${cf.requested || cf.basename || ''}-${idx}`}
          className="block truncate max-w-[180px]"
          title={hintTitle}
        >
          {cf.basename || t.addCandidateBulkNoCvCol}
          {cf.source === 'zip' && cf.basename ? (cf.found ? ' ✓' : ' ✗') : ''}
        </span>
      );
    });
    const rawAttach = (d.cvAttachRaw || '').trim();
    const cvCellInner =
      cvParts.length > 0
        ? cvParts
        : isHttp(rawAttach)
          ? (
              <a
                href={rawAttach}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate max-w-[200px] text-blue-600 hover:underline font-medium"
                title={rawAttach}
              >
                {t.addCandidateBulkOpenToView || 'Xem'}: {t.addCandidateBulkCvLink || 'liên kết CV'}
              </a>
            )
          : (t.addCandidateBulkNoCvCol || '—');

    const cvOverrideLabel =
      replacement?.entries?.length
        ? replacement.entries.map((e) => e.file.name).join('; ')
        : '';

    return (
      <tr key={`${sheetName}-${r.row}`} style={{ borderColor: '#f1f5f9' }}>
        <td className="p-2 border-b align-top whitespace-nowrap" style={{ borderColor: '#f1f5f9' }}>{r.row}</td>
        <td className="p-2 border-b align-top max-w-[120px]" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.name || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], name: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top max-w-[140px]" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.email || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], email: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top whitespace-nowrap" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.phone || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], phone: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top max-w-[120px]" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.desiredPosition || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], desiredPosition: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top max-w-[100px]" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.major || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], major: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top whitespace-nowrap" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.jlptRaw || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], jlptRaw: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top whitespace-nowrap" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.genderRaw || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], genderRaw: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top max-w-[90px]" style={{ borderColor: '#f1f5f9' }}>
          <input
            className="w-full px-2 py-1 border rounded text-[10px] outline-none"
            style={{ borderColor: '#d1d5db' }}
            value={edit.residenceRaw || ''}
            onChange={(e) => {
              const v = e.target.value;
              setEditedByRowKey((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], residenceRaw: v } }));
            }}
          />
        </td>
        <td className="p-2 border-b align-top" style={{ borderColor: '#f1f5f9' }}>
          <div className="flex flex-col gap-1">
            <div className="min-h-[16px]">{replacement?.entries?.length ? cvOverrideLabel : cvCellInner}</div>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="text-[10px]"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;

                const entries = files.map((file, idx) => ({
                  file,
                  zipKey: buildReplacementZipKey({
                    sheetName,
                    rowNumber: r.row,
                    fileIndex: idx,
                    fileName: file.name
                  })
                }));

                setCvReplacementsByRowKey((prev) => ({
                  ...prev,
                  [rowKey]: { entries, files }
                }));

                setEditedByRowKey((prev) => ({
                  ...prev,
                  [rowKey]: {
                    ...prev[rowKey],
                    cvAttachRaw: entries.map((x) => x.zipKey).join('\n')
                  }
                }));

                e.target.value = '';
              }}
            />
            {replacement?.entries?.length ? (
              <button
                type="button"
                className="text-[10px] font-semibold text-red-600 hover:underline"
                onClick={() => {
                  setCvReplacementsByRowKey((prev) => ({ ...prev, [rowKey]: { entries: [], files: [] } }));
                  setEditedByRowKey((prev) => ({
                    ...prev,
                    [rowKey]: { ...prev[rowKey], cvAttachRaw: prev[rowKey]?.cvAttachRawOriginal || '' }
                  }));
                }}
              >
                {t.clear || 'Bỏ thay thế'}
              </button>
            ) : null}
          </div>
        </td>
        <td className="p-2 border-b align-top whitespace-nowrap" style={{ borderColor: '#f1f5f9' }}>
          {willSkipNow ? (
            <span style={{ color: '#b45309' }}>{t.addCandidateBulkWillSkip}</span>
          ) : (
            <span style={{ color: '#15803d' }}>{t.addCandidateBulkWillImport}</span>
          )}
        </td>
        <td className="p-2 border-b align-top max-w-[160px] text-[9px]" style={{ borderColor: '#f1f5f9', color: '#64748b' }} title={(r.warnings || []).join(' · ')}>
          {[
            willSkipNow ? r.skipReason : null,
            ...(r.warnings || [])
          ].filter(Boolean).join(' · ') || '—'}
        </td>
      </tr>
    );
  };

  const previewRows = activePreviewSheet && bulkPreview?.bySheet
    ? (bulkPreview.bySheet[activePreviewSheet] || [])
    : [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[98vw] h-[min(84vh,760px)] max-h-[84vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden bg-white"
        style={{ borderColor: '#e2e8f0' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-import-modal-title"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}>
          <h2 id="bulk-import-modal-title" className="text-sm font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Table className="w-4 h-4 flex-shrink-0" style={{ color: '#2563eb' }} />
            {t.addCandidateBulkImportTitle || 'Import hàng loạt từ Excel'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-slate-200/80"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: '#64748b' }} />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div
            className="px-3 pt-2 pb-2 space-y-2 border-b flex-shrink-0 max-h-[40vh] sm:max-h-[35vh] overflow-auto"
            style={{ borderColor: '#e2e8f0', backgroundColor: '#fafbfc' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-2 flex flex-col min-h-[95px]" style={{ borderColor: '#e2e8f0', backgroundColor: '#fff' }}>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold mb-1.5" style={{ color: '#334155' }}>
                  <UserCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#64748b' }} />
                  {t.addCandidateCollaboratorLabel || 'CTV (tùy chọn)'} — ID
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t.addCandidateBulkCollaboratorIdPlaceholder || 'Để trống hoặc nhập ID CTV'}
                  value={collaboratorId}
                  onChange={(e) => setCollaboratorId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-2 py-1 border rounded text-[9px] mt-auto"
                  style={{ borderColor: '#cbd5e1' }}
                />
              </div>
              <div className="rounded-lg border p-2 flex flex-col min-h-[95px]" style={{ borderColor: '#e2e8f0', backgroundColor: '#fff' }}>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold mb-1.5" style={{ color: '#334155' }}>
                  <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#2563eb' }} />
                  {t.addCandidateBulkExcelLabel}
                </label>
                <input
                  ref={bulkExcelInputRef}
                  type="file"
                  accept=".xlsx,application/Y.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="block w-full text-[10px] file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-medium file:bg-blue-50 file:text-blue-700"
                  onChange={handleBulkExcelPick}
                />
                {bulkExcelFile ? (
                  <p className="text-[9px] mt-1 truncate font-medium" style={{ color: '#334155' }} title={bulkExcelFile.name}>
                    {bulkExcelFile.name}
                  </p>
                ) : (
                  <p className="text-[9px] mt-auto pt-1" style={{ color: '#94a3b8' }}>—</p>
                )}
              </div>
              <div className="rounded-lg border p-2 flex flex-col min-h-[95px]" style={{ borderColor: '#e2e8f0', backgroundColor: '#fff' }}>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold mb-1.5" style={{ color: '#334155' }}>
                  <Archive className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#64748b' }} />
                  {t.addCandidateBulkZipLabel}
                </label>
                <input
                  ref={bulkZipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="block w-full text-[10px] file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-medium file:bg-slate-100 file:text-slate-700"
                  onChange={handleBulkZipPick}
                />
                {bulkZipFile ? (
                  <p className="text-[9px] mt-1 truncate font-medium" style={{ color: '#334155' }} title={bulkZipFile.name}>
                    {bulkZipFile.name}
                  </p>
                ) : (
                  <p className="text-[9px] mt-auto pt-1" style={{ color: '#94a3b8' }}>—</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkPreview}
                disabled={bulkPreviewLoading || !bulkExcelFile}
                className="px-2 py-1 rounded text-[10px] font-semibold transition-colors disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: '#2563eb', color: 'white' }}
              >
                {bulkPreviewLoading ? '…' : (t.addCandidateBulkPreviewBtn || 'Xem trước theo sheet')}
              </button>
              <button
                type="button"
                onClick={handleBulkConfirmImport}
                disabled={bulkImportLoading || !bulkPreview || !bulkExcelFile}
                className="px-2 py-1 rounded text-[10px] font-semibold border transition-colors disabled:opacity-50"
                style={{ borderColor: '#16a34a', color: '#15803d', backgroundColor: '#f0fdf4' }}
              >
                {bulkImportLoading ? '…' : (t.addCandidateBulkImportBtn || 'Xác nhận import')}
              </button>
            </div>

            {bulkImportLoading && (
              <div
                className="mt-3 rounded-lg border p-3"
                style={{ borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-[9px] font-semibold" style={{ color: '#0f172a' }}>
                    {bulkImportProgress.stage || 'Đang import...'}
                  </div>
                  <div className="text-[9px] font-semibold" style={{ color: '#2563eb' }}>
                    {bulkImportProgress.percent}%
                  </div>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#dbeafe' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${bulkImportProgress.percent}%`, backgroundColor: '#2563eb', transition: 'width 0.25s ease' }}
                  />
                </div>
                {bulkImportProgress.etaText ? (
                  <div className="mt-0.5 text-[9px]" style={{ color: '#475569' }}>
                    {bulkImportProgress.etaText}
                  </div>
                ) : null}
              </div>
            )}

            {bulkPreview && (
              <div className="rounded-lg px-2 py-1 text-[9px] font-medium border" style={{ color: '#0f172a', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
                {(t.addCandidateBulkSummary || '')
                  .replace('{total}', String(bulkPreview.totalRows ?? 0))
                  .replace('{importable}', String(bulkPreview.importableCount ?? 0))
                  .replace('{zip}', String(bulkPreview.zipFileCount ?? 0))}
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-h-0 px-4 py-3">
            <div className="text-[11px] font-semibold mb-2 flex-shrink-0" style={{ color: '#334155' }}>
              {t.addCandidateBulkPreviewPanelTitle}
            </div>
            {bulkPreview?.sheetOrder?.length > 0 ? (
              <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
                <div
                  className="flex gap-1 overflow-x-auto flex-shrink-0 px-1 border-b"
                  style={{ borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}
                  role="tablist"
                  aria-label="Sheets"
                >
                  {bulkPreview.sheetOrder.map((sheetName) => {
                    const count = (bulkPreview.bySheet[sheetName] || []).length;
                    const active = sheetName === activePreviewSheet;
                    return (
                      <button
                        key={sheetName}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActivePreviewSheet(sheetName)}
                        className="px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap flex-shrink-0 border-b-2 -mb-px transition-colors rounded-t-md"
                        style={{
                          borderBottomColor: active ? '#2563eb' : 'transparent',
                          color: active ? '#1d4ed8' : '#64748b',
                          backgroundColor: active ? '#fff' : 'transparent',
                        }}
                      >
                        <span className="truncate max-w-[160px] inline-block align-bottom" title={sheetName}>{sheetName}</span>
                        <span className="ml-1.5 font-normal tabular-nums opacity-80">({count})</span>
                      </button>
                    );
                  })}
                </div>
                <div
                  className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white"
                  role="tabpanel"
                >
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-[10px] border-collapse min-w-[820px]">
                      <thead className="sticky top-0 z-[1]">
                        <tr style={{ backgroundColor: '#f8fafc', boxShadow: '0 1px 0 #e2e8f0' }}>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColRow}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColName}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColEmail}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColPhone}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColPosition}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColMajor}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColJlpt}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColGender}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColResidence}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColCv}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColStatus}</th>
                          <th className="text-left p-2 border-b font-semibold whitespace-nowrap" style={{ borderColor: '#e2e8f0' }}>{t.addCandidateBulkColWarn}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r) => renderPreviewRow(r, activePreviewSheet))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex-1 min-h-[200px] flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center"
                style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }}
              >
                <Table className="w-8 h-8 mb-2 opacity-40" style={{ color: '#64748b' }} />
                <p className="text-xs font-medium" style={{ color: '#475569' }}>
                  {t.addCandidateBulkNoPreviewPlaceholder}
                </p>
                <p className="text-[10px] mt-1 max-w-sm" style={{ color: '#94a3b8' }}>
                  {t.addCandidateBulkNoPreviewSub}
                </p>
              </div>
            )}
          </div>

          {bulkImportResult && (
            <div className="flex-shrink-0 border-t flex flex-col max-h-[min(32vh,280px)] min-h-[120px]" style={{ borderColor: '#e2e8f0', backgroundColor: '#f0fdf4' }}>
              <div className="px-4 py-2 flex-shrink-0 flex items-center justify-between gap-2 border-b" style={{ borderColor: '#bbf7d0' }}>
                <h3 className="text-xs font-bold" style={{ color: '#166534' }}>{t.addCandidateBulkResultTitle}</h3>
              </div>
              {resultSheetTabs.length > 0 && (
                <div
                  className="flex gap-0.5 overflow-x-auto px-3 pt-2 flex-shrink-0 border-b -mb-px"
                  style={{ borderColor: '#bbf7d0', backgroundColor: '#ecfdf5' }}
                  role="tablist"
                >
                  {resultSheetTabs.map((sh) => {
                    const active = sh === activeResultSheet;
                    const cLen = (bulkImportResult.createdBySheet?.[sh] || []).length;
                    const skLen = (bulkImportResult.skippedBySheet?.[sh] || []).length;
                    const fLen = (bulkImportResult.failedBySheet?.[sh] || []).length;
                    return (
                      <button
                        key={sh}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveResultSheet(sh)}
                        className="px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap rounded-t-md border border-b-0 flex-shrink-0"
                        style={{
                          borderColor: '#86efac',
                          backgroundColor: active ? '#fff' : '#d1fae5',
                          color: active ? '#166534' : '#15803d',
                          borderBottomColor: active ? '#fff' : '#86efac',
                        }}
                      >
                        <span className="truncate max-w-[120px] inline-block align-bottom" title={sh}>{sh}</span>
                        <span className="ml-1 font-normal opacity-90">
                          +{cLen}{skLen ? ` · ⊘${skLen}` : ''}{fLen ? ` · ✗${fLen}` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 text-[10px]" style={{ backgroundColor: '#fff' }}>
                {activeResultSheet && (
                  <>
                    {(bulkImportResult.createdBySheet?.[activeResultSheet] || []).length > 0 && (
                      <div className="mb-2">
                        <p className="font-semibold mb-1" style={{ color: '#15803d' }}>{t.addCandidateBulkCreated}</p>
                        <ul className="list-disc list-inside space-y-0.5" style={{ color: '#475569' }}>
                          {bulkImportResult.createdBySheet[activeResultSheet].map((c) => (
                            <li key={c.id || `${c.code}-${c.name}`} className="space-x-1">
                              {c.id ? (
                                <Link
                                  to={`/admin/candidates/${c.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline font-semibold"
                                >
                                  {t.addCandidateBulkOpenProfile || 'Xem hồ sơ'}
                                </Link>
                              ) : null}
                              <span>
                                {t.addCandidateBulkCode}: {c.code} — {c.name || '—'}
                                {(c.warnings && c.warnings.length > 0) ? ` · ⚠ ${c.warnings.join('; ')}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(bulkImportResult.skippedBySheet?.[activeResultSheet] || []).length > 0 && (
                      <div className="mb-2">
                        <p className="font-semibold mb-1" style={{ color: '#b45309' }}>{t.addCandidateBulkSkipped}</p>
                        <p style={{ color: '#92400e' }}>
                          {bulkImportResult.skippedBySheet[activeResultSheet].map((s) => `${t.addCandidateBulkColRow} ${s.row} (${s.reason})`).join('; ')}
                        </p>
                      </div>
                    )}
                    {(bulkImportResult.failedBySheet?.[activeResultSheet] || []).length > 0 && (
                      <div>
                        <p className="font-semibold mb-1" style={{ color: '#b91c1c' }}>{t.addCandidateBulkFailed}</p>
                        <p style={{ color: '#991b1b' }}>
                          {bulkImportResult.failedBySheet[activeResultSheet].map((f) => `${t.addCandidateBulkColRow} ${f.row}: ${f.error}`).join('; ')}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportCandidatesModal;
