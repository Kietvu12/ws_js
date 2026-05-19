/**
 * Đọc Excel (mọi sheet, cùng schema) + map hàng → payload tạo CV.
 * File CV gốc: cột "CV đính kèm" chứa tên/path → khớp với file trong ZIP (basename, không phân biệt hoa thường).
 */
import path from 'path';
import ExcelJS from 'exceljs';
import AdmZip from 'adm-zip';
import { isLikelyHttpUrl, buildGoogleExportPdfUrl, fetchCvBufferFromReference } from './cvUrlFetchService.js';

/** Chuẩn hóa chuỗi để so khớp header */
function norm(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Basename an toàn để tra ZIP */
function zipKeyFromFilename(s) {
  const base = path.basename(String(s || '').trim().replace(/^["']|["']$/g, ''));
  return base ? base.toLowerCase() : '';
}

/**
 * @param {Buffer} zipBuffer
 * @returns {Map<string, { buffer: Buffer, originalname: string }>} key = basename lowercase
 */
export function buildCvFileMapFromZip(zipBuffer) {
  const map = new Map();
  if (!zipBuffer || !zipBuffer.length) return map;
  const zip = new AdmZip(zipBuffer);
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    const rawName = e.entryName.split('/').pop() || e.entryName;
    const originalname = rawName.trim();
    if (!originalname || originalname.startsWith('__MACOSX') || originalname === '.DS_Store') continue;
    const key = zipKeyFromFilename(originalname);
    if (!key) continue;
    try {
      const buffer = e.getData();
      if (buffer?.length) map.set(key, { buffer, originalname });
    } catch {
      // bỏ qua entry lỗi
    }
  }
  return map;
}

function cellToString(cell) {
  if (!cell || cell.value == null || cell.value === '') return '';
  const v = cell.value;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'object') {
    if (v.hyperlink && typeof v.hyperlink === 'string') return v.hyperlink.trim();
    if (v.text != null) return String(v.text).trim();
    if (v.richText && Array.isArray(v.richText)) {
      return v.richText.map((t) => t.text || '').join('').trim();
    }
    if (v.formula != null && cell.result != null) return String(cell.result).trim();
  }
  return String(v).trim();
}

/**
 * Map header (đã norm) → field nội bộ
 * Thứ tự: pattern cụ thể trước, tổng quát sau.
 */
const HEADER_RULES = [
  { field: 'detailDate', test: (n) => n === 'chi tiết' || n === 'chi tiet' },
  { field: 'name', test: (n) => /họ\s*[&＆]?\s*tên|^ho ten$|^name$/.test(n) || n === 'họ tên' },
  { field: 'progress', test: (n) => n.includes('tiến độ') || n.includes('tien do') },
  { field: 'feedback', test: (n) => n.includes('phản hồi') || n.includes('phan hoi') },
  { field: 'source', test: (n) => n === 'nguồn' || n === 'nguon' || n === 'source' },
  {
    field: 'desiredPosition',
    test: (n) =>
      n.includes('nguyện vọng') ||
      n.includes('nguyen vong') ||
      n.includes('vị trí') ||
      n.includes('vi tri') ||
      n.includes('desired position')
  },
  { field: 'major', test: (n) => n.includes('chuyên ngành') || n.includes('chuyen nganh') },
  {
    field: 'jlptRaw',
    test: (n) =>
      n.includes('tiếng nhật') ||
      n.includes('tieng nhat') ||
      n.includes('jlpt') ||
      n.includes('kinh nghiệm tiếng nhật')
  },
  { field: 'phone', test: (n) => n.includes('điện thoại') || n.includes('dien thoai') || n === 'phone' || n === 'sđt' },
  { field: 'email', test: (n) => n === 'email' || n.includes('e-mail') },
  { field: 'address', test: (n) => n.includes('địa chỉ') || n.includes('dia chi') },
  { field: 'residenceRaw', test: (n) => n.includes('đang ở') || n.includes('dang o') || n.includes('current residence') },
  { field: 'fbLink', test: (n) => n.includes('link fb') || n.includes('facebook') },
  { field: 'genderRaw', test: (n) => n.includes('giới tính') || n.includes('gioi tinh') || n === 'gender' },
  {
    field: 'cvAttach',
    test: (n) =>
      n.includes('cv đính kèm') ||
      n.includes('cv dinh kem') ||
      n.includes('đính kèm') ||
      (n.includes('cv') && n.includes('đính')) ||
      n === 'cv'
  }
];

function mapHeaderToField(headerCell) {
  const n = norm(headerCell);
  if (!n) return null;
  for (const { field, test } of HEADER_RULES) {
    if (test(n)) return field;
  }
  return null;
}

function parseJlpt(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return null;
  if (/N\s*1|^1$/.test(s) || s === 'N1') return 1;
  if (/N\s*2|^2$/.test(s) || s === 'N2') return 2;
  if (/N\s*3|^3$/.test(s) || s === 'N3') return 3;
  if (/N\s*4|^4$/.test(s) || s === 'N4') return 4;
  if (/N\s*5|^5$/.test(s) || s === 'N5') return 5;
  return null;
}

function parseGender(raw) {
  const s = norm(raw);
  if (!s) return null;
  if (s.includes('nam') || s === '男' || s === '1') return 1;
  if (s.includes('nữ') || s.includes('nu') || s === '女' || s === '2') return 2;
  return null;
}

/** 1=Nhật, 2=Việt Nam, 3=Khác — khớp EditCandidate.jsx */
function parseCurrentResidence(raw) {
  const t = String(raw || '').trim().toLowerCase();
  if (!t) return null;
  if (/nhật|nhat|japan|日本/.test(t)) return 1;
  if (/việt|viet|vn|ベトナム/.test(t)) return 2;
  return 3;
}

function splitCvPaths(cell) {
  const t = String(cell || '').trim();
  if (!t) return [];
  return t
    .split(/[\n;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildImportNotes({ sheetName, rowNumber, detailDate, progress, feedback, source, fbLink }) {
  const lines = [`[Import Excel — sheet: ${sheetName}, dòng: ${rowNumber}]`];
  if (detailDate) lines.push(`Chi tiết: ${detailDate}`);
  if (progress) lines.push(`Tiến độ: ${progress}`);
  if (feedback) lines.push(`Phản hồi: ${feedback}`);
  if (source) lines.push(`Nguồn: ${source}`);
  if (fbLink) lines.push(`Link FB: ${fbLink}`);
  return lines.join('\n');
}

/**
 * @param {Record<string, string>} canon — key = field từ HEADER_RULES
 */
export function buildCvDataFromImportRow(canon, sheetName, rowNumber) {
  const name = (canon.name || '').trim();
  const email = (canon.email || '').trim();
  const warnings = [];

  const notes = buildImportNotes({
    sheetName,
    rowNumber,
    detailDate: canon.detailDate,
    progress: canon.progress,
    feedback: canon.feedback,
    source: canon.source,
    fbLink: canon.fbLink
  });

  const cvRelPaths = splitCvPaths(canon.cvAttach);

  const cvData = {
    name: name || null,
    email: email || null,
    phone: (canon.phone || '').trim() || null,
    addressCurrent: (canon.address || '').trim() || null,
    desiredPosition: (canon.desiredPosition || '').trim() || null,
    careerSummary: (canon.major || '').trim() || null,
    jlptLevel: parseJlpt(canon.jlptRaw),
    gender: parseGender(canon.genderRaw),
    currentResidence: parseCurrentResidence(canon.residenceRaw),
    notes
  };

  Object.keys(cvData).forEach((k) => {
    if (cvData[k] === null || cvData[k] === undefined || cvData[k] === '') {
      delete cvData[k];
    }
  });

  return { cvData, cvRelPaths, warnings, hasMinimalIdentity: !!(name || email) };
}

/**
 * Mô tả một ô "CV đính kèm" cho bản xem trước (không tải mạng).
 * @param {string} p
 * @param {Map<string, { buffer: Buffer, originalname: string }>} zipMap
 */
export function describeCvAttachmentForPreview(p, zipMap) {
  const t = String(p).trim();
  if (!t) return null;
  if (isLikelyHttpUrl(t)) {
    const g = buildGoogleExportPdfUrl(t);
    const isDriveFile = /drive\.google\.com\/file\//i.test(t);
    return {
      requested: t,
      basename: isDriveFile
        ? 'Google Drive (uc?export=download)'
        : g
          ? 'Google Docs/Sheets/Slides → PDF'
          : 'HTTP(S) — tải trực tiếp',
      found: true,
      matchedZipEntry: null,
      source: 'url',
      googleExport: !!g,
      hint: g
        ? isDriveFile
          ? 'Import sẽ tải qua link Drive (file phải “Ai có đường liên kết đều xem được”; file lớn có thể gặp trang xác nhận của Google).'
          : 'Import sẽ gọi URL export PDF của Google. File phải chia sẻ “Ai có đường liên kết đều xem được”, nếu không server nhận trang đăng nhập HTML.'
        : 'Import sẽ GET trực tiếp URL (phù hợp link PDF/DOC công khai).'
    };
  }
  const key = zipKeyFromFilename(t);
  const hit = zipMap.get(key);
  return {
    requested: t,
    basename: path.basename(t),
    found: !!hit,
    matchedZipEntry: hit?.originalname || null,
    source: 'zip',
    googleExport: false,
    hint: null
  };
}

/**
 * ZIP (theo basename) + URL (Google export PDF hoặc file trực tiếp).
 * @param {Map<string, { buffer: Buffer, originalname: string }>} zipMap
 * @param {string[]} cvRelPaths
 */
export async function resolveCvAttachments(zipMap, cvRelPaths) {
  const out = [];
  const warnings = [];
  for (const p of cvRelPaths) {
    const t = String(p).trim();
    if (!t) continue;
    if (isLikelyHttpUrl(t)) {
      try {
        const got = await fetchCvBufferFromReference(t);
        out.push(got);
      } catch (e) {
        warnings.push(`URL: ${e.message || 'Không tải được'}`);
      }
      continue;
    }
    const key = zipKeyFromFilename(t);
    if (!key) continue;
    const hit = zipMap.get(key);
    if (hit) {
      const ext = path.extname(hit.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.pdf';
      const mime =
        {
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/Y.openxmlformats-officedocument.wordprocessingml.document',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png'
        }[ext] || 'application/octet-stream';
      out.push({ buffer: hit.buffer, originalname: hit.originalname, mimetype: mime });
    } else {
      warnings.push(`Không tìm thấy file trong ZIP (tên: ${path.basename(t)})`);
    }
  }
  return { files: out, warnings };
}

/**
 * Đọc toàn bộ sheet: mỗi sheet dòng 1 = header (cùng schema), từ dòng 2 = dữ liệu.
 *
 * @param {Buffer} excelBuffer
 * @returns {Promise<Array<{ sheetName: string, rowNumber: number, canon: Record<string, string> }>>}
 */
export async function parseBulkImportExcel(excelBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelBuffer);

  const rowsOut = [];

  workbook.eachSheet((worksheet) => {
    if (worksheet.state === 'veryHidden') return;
    const sheetName = worksheet.name || 'Sheet';

    let colToField = null;

    worksheet.eachRow((row, rowNumber) => {
      const maxCol = row.cellCount;
      if (rowNumber === 1) {
        colToField = new Map();
        for (let c = 1; c <= maxCol; c++) {
          const cell = row.getCell(c);
          const h = cellToString(cell);
          const field = mapHeaderToField(h);
          if (field) colToField.set(c, field);
        }
        return;
      }

      if (!colToField || colToField.size === 0) return;

      const canon = {};
      for (let c = 1; c <= maxCol; c++) {
        const field = colToField.get(c);
        if (!field) continue;
        const val = cellToString(row.getCell(c));
        if (val) canon[field] = val;
      }

      const hasAny = Object.keys(canon).some((k) => canon[k] && String(canon[k]).trim());
      if (!hasAny) return;

      rowsOut.push({ sheetName, rowNumber, canon });
    });
  });

  return rowsOut;
}

/**
 * Xem trước import: không ghi DB. Trả về danh sách gom theo sheet.
 * @param {Buffer} excelBuffer
 * @param {Buffer} [zipBuffer]
 */
export async function buildBulkImportPreview(excelBuffer, zipBuffer) {
  const zb = zipBuffer && zipBuffer.length ? zipBuffer : Buffer.alloc(0);
  const zipMap = buildCvFileMapFromZip(zb);
  const parsedRows = await parseBulkImportExcel(excelBuffer);
  const bySheet = {};
  const sheetOrder = [];
  let importableCount = 0;

  for (const { sheetName, rowNumber, canon } of parsedRows) {
    if (!bySheet[sheetName]) {
      bySheet[sheetName] = [];
      sheetOrder.push(sheetName);
    }
    const rowCtx = buildCvDataFromImportRow(canon, sheetName, rowNumber);
    if (rowCtx.hasMinimalIdentity) importableCount += 1;
    const { cvRelPaths } = rowCtx;

    const zipWarn = [];
    const cvFiles = cvRelPaths
      .map((p) => {
        const d = describeCvAttachmentForPreview(p, zipMap);
        if (d && d.source === 'zip' && !d.found) {
          zipWarn.push(`Không tìm thấy file trong ZIP (tên: ${d.basename})`);
        }
        return d;
      })
      .filter(Boolean);

    const display = {
      name: (canon.name || '').trim(),
      email: (canon.email || '').trim(),
      phone: (canon.phone || '').trim(),
      desiredPosition: (canon.desiredPosition || '').trim(),
      major: (canon.major || '').trim(),
      jlptRaw: (canon.jlptRaw || '').trim(),
      address: (canon.address || '').trim(),
      residenceRaw: (canon.residenceRaw || '').trim(),
      genderRaw: (canon.genderRaw || '').trim(),
      detailDate: (canon.detailDate || '').trim(),
      progress: (canon.progress || '').trim(),
      feedback: (canon.feedback || '').trim(),
      source: (canon.source || '').trim(),
      fbLink: (canon.fbLink || '').trim(),
      cvAttachRaw: (canon.cvAttach || '').trim()
    };

    const mapped = {
      jlptLevel: rowCtx.cvData.jlptLevel ?? null,
      gender: rowCtx.cvData.gender ?? null,
      currentResidence: rowCtx.cvData.currentResidence ?? null
    };

    bySheet[sheetName].push({
      row: rowNumber,
      willSkip: !rowCtx.hasMinimalIdentity,
      skipReason: rowCtx.hasMinimalIdentity
        ? null
        : 'Thiếu Họ & tên và Email (cần ít nhất một trong hai)',
      display,
      mapped,
      cvFiles,
      warnings: [...rowCtx.warnings, ...zipWarn]
    });
  }


  return {
    bySheet,
    sheetOrder,
    totalRows: parsedRows.length,
    importableCount,
    zipFileCount: zipMap.size
  };
}
