import { CVStorage, ActionLog } from '../models/index.js';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import config from '../config/index.js';
import {
  s3Enabled,
  isFolderPath,
  listKeysUnderPrefix,
  getObjectStream,
  uploadBufferToS3,
  buildCvOriginalFolderKey,
  copyCvOriginalsToNewSnapshot,
  copySingleFileToCvOriginalSnapshot,
  buildCvTemplateFolderKey,
  buildCvTemplateFileKey,
  getCvSnapshotDateTime
} from './s3Service.js';

import {
  generateCvRirekishoPdfBuffer,
  generateCvShokumuPdfBuffer
} from './cvPdfService.js';

const AI_PARSE_URL = 'https://ws-jobshare.com/api_ai/v2/parser/cv';
const AUTO_PARSE_TIMEOUT_MS = parseInt(process.env.AUTO_PARSE_CV_TIMEOUT_MS || '1200000', 10); // default 20 minutes
const MAX_FILES_PER_CV = parseInt(process.env.AUTO_PARSE_CV_MAX_FILES_PER_CV || '25', 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');
const uploadDir = path.resolve(backendRoot, config.upload.dir, 'cvs');

function normalizeGender(v) {
  if (v === 1 || v === '1' || v === '男') return 1;
  if (v === 2 || v === '2' || v === '女') return 2;
  return null;
}

function calculateAgeFromBirthDate(birthDateValue) {
  if (!birthDateValue) return '';
  const today = new Date();
  const birth = birthDateValue instanceof Date ? birthDateValue : new Date(birthDateValue);
  if (isNaN(birth.getTime())) return '';

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age.toString();
}

function normalizeBirthDateToIsoDate(birthDateValue) {
  if (!birthDateValue) return '';
  let v = birthDateValue;
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s) return '';
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseApiDateToYearMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { year: '', month: '' };
  const s = String(dateStr).trim();
  const iso = s.match(/^(\d{4})[-](\d{1,2})/);
  if (iso) return { year: iso[1], month: String(parseInt(iso[2], 10)) };
  const slash = s.match(/^(\d{4})\/(\d{1,2})/);
  if (slash) return { year: slash[1], month: String(parseInt(slash[2], 10)) };
  const jp = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*(?:月)?/);
  if (jp) return { year: jp[1], month: String(parseInt(jp[2], 10)) };
  return { year: '', month: '' };
}

function isEndDateCurrent(endDate) {
  if (!endDate || typeof endDate !== 'string') return false;
  const s = String(endDate).trim();
  const lower = s.toLowerCase();
  return s === '現在' || lower === 'đến nay' || lower === 'present' || lower === 'current' || s.includes('現在');
}

/** 職務経歴「期間」— `2020 年 4 月～2024 年 5 月` (full-width ～). */
function formatShokumuPeriodRangeJa(startRaw, endRaw) {
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

function splitWorkPeriodRange(period) {
  if (period == null || period === '') return ['', ''];
  const normalized = String(period).replace(/\u301c|\uff5e|\u223c/g, '~').trim();
  const parts = normalized.split(/\s*~\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[parts.length - 1]];
  return [parts[0] || '', ''];
}

function expandWorkExperiencesFromBlock(list) {
  if (!list || !Array.isArray(list)) return [];
  const result = [];
  for (const we of list) {
    const cn = (we.company_name || '').trim();
    if (cn.endsWith(' 入社') || cn.endsWith(' 退社')) {
      result.push({ ...we });
      continue;
    }
    const rawPeriod = (we.period || '').trim();
    const [startStr, endStr] = splitWorkPeriodRange(rawPeriod);
    const period = formatShokumuPeriodRangeJa(startStr, endStr) || rawPeriod;
    const startYm = parseApiDateToYearMonth(startStr);
    const endYm = parseApiDateToYearMonth(isEndDateCurrent(endStr) ? '' : endStr);
    const base = {
      business_purpose: we.business_purpose || '',
      scale_role: we.scale_role || '',
      description: we.description || '',
      tools_tech: we.tools_tech || '',
      period,
      reason_for_leaving: we.reason_for_leaving || '',
    };
    result.push({ ...base, year: startYm.year, month: startYm.month, company_name: cn ? `${cn} 入社` : '入社' });
    if (isEndDateCurrent(endStr)) {
      result.push({ ...base, year: '', month: '', company_name: '現在に至る' });
    } else {
      result.push({ ...base, year: endYm.year, month: endYm.month, company_name: cn ? `${cn} 退社` : '退社' });
    }
  }
  return result;
}

function normalizeSpouseFlagToNumber(val) {
  // AI schema tends to return boolean (true/false) for has_spouse.
  if (val === true) return 1;
  if (val === false) return 0;
  // Some systems could return 1/0 or '有'/'無'
  if (val === 1 || val === '1' || val === '有') return 1;
  if (val === 0 || val === '0' || val === '無') return 0;
  return null;
}

function getMimeTypeByFilename(filename, fallback = 'application/octet-stream') {
  const ext = (path.extname(filename) || '').toLowerCase();
  if (!ext) return fallback;
  const map = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/Y.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/Y.ms-excel',
    '.xlsx': 'application/Y.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/Y.ms-powerpoint',
    '.pptx': 'application/Y.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.csv': 'text/csv'
  };
  return map[ext] || fallback;
}

async function streamToBuffer(stream, { isCancelled } = {}) {
  if (!stream) return null;
  const chunks = [];
  for await (const chunk of stream) {
    if (isCancelled?.()) throw new Error('auto-parse-cancelled');
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function resolveStoredPathToKeysCandidate(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return [];
  const trimmed = storedPath.trim();
  if (!trimmed) return [];

  // If ends with '/', treat as prefix/folder
  if (trimmed.endsWith('/')) return null;

  // Heuristic: if last path segment has an extension, treat as a file key.
  const last = trimmed.split('/').pop() || '';
  const ext = path.extname(last).toLowerCase();
  if (ext) return [trimmed];

  // Otherwise treat as prefix/folder key
  return null;
}

async function resolveCvStoredFilesToS3Keys(cv) {
  const keys = [];
  const seen = new Set();
  const candidates = [cv.otherDocuments, cv.curriculumVitae, cv.cvOriginalPath];

  const addUnique = (k) => {
    if (!k) return;
    if (seen.has(k)) return;
    seen.add(k);
    keys.push(k);
  };

  for (const c of candidates) {
    if (!c) continue;
    const direct = resolveStoredPathToKeysCandidate(c);
    if (direct && direct.length > 0) {
      addUnique(c);
      continue;
    }
    // prefix/folder
    const list = await listKeysUnderPrefix(c);
    for (const k of list) addUnique(k);
  }

  return keys;
}

async function callAiParseCandidate(filesFormData, { abortSignal } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTO_PARSE_TIMEOUT_MS);

  // If stopAutoParse() was called, abort current AI request immediately.
  if (abortSignal) {
    if (abortSignal.aborted) controller.abort();
    else abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response;
  try {
    response = await fetch(AI_PARSE_URL, {
      method: 'POST',
      body: filesFormData,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err = new Error(`AI parse failed: HTTP ${response.status}. ${text?.slice(0, 500) || ''}`.trim());
    err.status = response.status;
    throw err;
  }

  let resumeData;
  try {
    resumeData = await response.json();
  } catch (e) {
    const err = new Error(`AI parse returned invalid JSON`);
    err.cause = e;
    throw err;
  }

  if (!resumeData || (typeof resumeData === 'object' && Object.keys(resumeData).length === 0)) {
    throw new Error('AI parse returned empty payload');
  }

  return resumeData;
}

function parsedDataToCvUpdate(parsedData, existingCv) {
  const rr = parsedData?.rirekisho || {};
  const sk =
    parsedData?.shokumu_keirekisho ||
    parsedData?.shokumuKeirekisho ||
    parsedData?.shokumu ||
    {};

  const next = {};

  const birthDateValue = normalizeBirthDateToIsoDate(rr.birth_date) || '';
  const calculatedAge = birthDateValue
    ? calculateAgeFromBirthDate(birthDateValue)
    : (rr.age != null ? String(rr.age) : existingCv.ages);

  if (rr.full_name) next.name = rr.full_name;
  if (rr.name_furigana) next.furigana = rr.name_furigana;
  if (birthDateValue) next.birthDate = birthDateValue;
  if (calculatedAge !== '' && calculatedAge != null) next.ages = calculatedAge;

  const normalizedGender = normalizeGender(rr.gender ?? existingCv.gender);
  if (normalizedGender !== null) next.gender = normalizedGender;

  if (rr.postal_code) next.postalCode = rr.postal_code;
  if (rr.address) next.addressCurrent = rr.address;
  if (rr.phone) next.phone = rr.phone;
  if (rr.email) next.email = rr.email;
  if (rr.emergency_contact_address) next.addressOrigin = rr.emergency_contact_address;

  const spouseNum = normalizeSpouseFlagToNumber(rr.has_spouse);
  if (spouseNum !== null) next.spouse = spouseNum;

  // educations
  const mappedEducations = Array.isArray(rr.education_history) && rr.education_history.length > 0
    ? rr.education_history.map(edu => {
        const startYm = parseApiDateToYearMonth(edu.start_date || '');
        const endYm = parseApiDateToYearMonth(edu.end_date || '');
        return {
          school_name: (edu.school_name || '').trim(),
          major: (edu.major || '').trim(),
          year: startYm.year,
          month: startYm.month,
          endYear: endYm.year,
          endMonth: endYm.month,
          content: [edu.school_name, edu.major].filter(Boolean).join(' / ') || ''
        };
      })
    : null;
  if (mappedEducations) next.educations = mappedEducations;

  // certificates: priority rirekisho licenses_qualifications, fallback shokumu qualifications
  const mappedCertificates = Array.isArray(rr.licenses_qualifications) && rr.licenses_qualifications.length > 0
    ? rr.licenses_qualifications.map(lic => ({
        year: lic.year != null ? String(lic.year) : '',
        month: lic.month != null ? String(lic.month) : '',
        name: lic.name || ''
      }))
    : null;

  const certsFromShokumu = Array.isArray(sk.qualifications) && sk.qualifications.length > 0
    ? sk.qualifications.map(q => {
        const { year, month } = parseApiDateToYearMonth(q.acquired_date || '');
        return { year, month, name: q.name || '' };
      })
    : null;

  if (mappedCertificates) next.certificates = mappedCertificates;
  else if (certsFromShokumu) next.certificates = certsFromShokumu;

  // workExperiences: priority shokumu job_history, fallback rirekisho work_history
  const workFromRirekisho = Array.isArray(rr.work_history) && rr.work_history.length > 0
    ? rr.work_history.flatMap(w => {
        const companyName = w.company_name || '';
        const period =
          w.start_date || w.end_date
            ? formatShokumuPeriodRangeJa(w.start_date || '', w.end_date || '')
            : '';
        const startYm = parseApiDateToYearMonth(w.start_date || '');
        const endYm = parseApiDateToYearMonth(isEndDateCurrent(w.end_date || '') ? '' : w.end_date || '');
        const base = {
          business_purpose: '',
          scale_role: w.department_role || '',
          description: '',
          tools_tech: '',
          period,
          reason_for_leaving: '',
        };
        const rows = [];
        if (w.start_date) {
          rows.push({
            year: startYm.year,
            month: startYm.month,
            company_name: companyName ? `${companyName} 入社` : '入社',
            ...base
          });
        }
        if (w.end_date) {
          if (isEndDateCurrent(w.end_date)) {
            rows.push({ year: '', month: '', company_name: '現在に至る', ...base });
          } else {
            rows.push({
              year: endYm.year,
              month: endYm.month,
              company_name: companyName ? `${companyName} 退社` : '退社',
              ...base
            });
          }
        }
        if (rows.length === 0) {
          rows.push({ year: '', month: '', company_name: companyName, ...base });
        }
        return rows;
      })
    : null;

  const workFromShokumuRaw = Array.isArray(sk.job_history) && sk.job_history.length > 0
    ? sk.job_history.map((job) => {
        const ps = job.period_start ?? job.start_date ?? '';
        const pe = job.period_end ?? job.end_date ?? '';
        let period = '';
        if (ps || pe) period = formatShokumuPeriodRangeJa(ps, pe);
        else if (job.period) {
          const [a, b] = splitWorkPeriodRange(job.period);
          period = formatShokumuPeriodRangeJa(a, b) || String(job.period).trim();
        }
        return {
          period,
          company_name: job.company_name || '',
          business_purpose: job.business_objective || '',
          scale_role: job.team_size_role || '',
          description: job.responsibilities || '',
          tools_tech: Array.isArray(job.tools) ? job.tools.join(', ') : (job.tools || ''),
          reason_for_leaving: job.reason_for_leaving || '',
        };
      })
    : null;

  const workFromShokumu = workFromShokumuRaw?.length ? expandWorkExperiencesFromBlock(workFromShokumuRaw) : null;

  if (workFromShokumu) next.workExperiences = workFromShokumu;
  else if (workFromRirekisho) next.workExperiences = workFromRirekisho;

  // Skills, summary, strengths, motivation
  if (Array.isArray(sk.skills_and_knowledge) && sk.skills_and_knowledge.length > 0) {
    next.technicalSkills = sk.skills_and_knowledge.join(', ');
  }
  // 職務要約 — chỉ từ shokumu (summary/aliases), tách khỏi 自己PR (rirekisho.self_pr / shokumu self_pr lưu vào strengths)
  const yokyu = ['summary', 'career_summary', 'job_summary']
    .map((k) => (sk && sk[k] != null && String(sk[k]).trim() !== '' ? String(sk[k]).trim() : null))
    .find(Boolean);
  if (yokyu) next.careerSummary = yokyu;

  if (rr.self_pr) next.strengths = rr.self_pr;
  else if (sk.self_pr) next.strengths = sk.self_pr;

  if (rr.motivation) next.motivation = rr.motivation;

  // preferences
  if (rr.current_salary != null) {
    const v = parseInt(String(rr.current_salary).replace(/[^\d]/g, ''), 10);
    if (!Number.isNaN(v)) next.currentIncome = v;
  }
  if (rr.expected_salary != null) {
    const v = parseInt(String(rr.expected_salary).replace(/[^\d]/g, ''), 10);
    if (!Number.isNaN(v)) next.desiredIncome = v;
  }
  if (rr.desired_role) next.desiredPosition = rr.desired_role;
  if (rr.desired_location) next.desiredWorkLocation = rr.desired_location;
  if (rr.available_start_date) next.nyushaTime = rr.available_start_date;

  return next;
}

async function regenerateCvTemplates(cv) {
  const dateTime = getCvSnapshotDateTime();
  const avatarDataUrl = ''; // worker không lấy avatar; cvPdfService phải xử lý undefined/empty

  if (s3Enabled()) {
    const destOriginalFolderKey = buildCvOriginalFolderKey(cv.id, dateTime);
    let copiedAny = false;

    // 1) Try copy from cv_original_path (existing snapshot originals)
    if (cv.cvOriginalPath) {
      try {
        if (isFolderPath(cv.cvOriginalPath)) {
          const srcKeys = await listKeysUnderPrefix(cv.cvOriginalPath);
          if (srcKeys.length > 0) {
            cv.cvOriginalPath = await copyCvOriginalsToNewSnapshot(cv.id, dateTime, cv.cvOriginalPath);
            copiedAny = true;
          }
        } else {
          cv.cvOriginalPath = await copySingleFileToCvOriginalSnapshot(cv.id, dateTime, cv.cvOriginalPath);
          copiedAny = true;
        }
        await cv.save();
      } catch (e) {
        console.warn('[AutoParse] Copy cvOriginalPath failed:', e.message);
      }
    }

    // 2) Fallback: if nothing was copied, upload parse-input files into CV_original of new snapshot
    if (!copiedAny) {
      try {
        const srcKeys = await resolveCvStoredFilesToS3Keys(cv);
        const keys = Array.isArray(srcKeys) ? srcKeys.slice(0, MAX_FILES_PER_CV) : [];

        if (keys.length > 0) {
          for (let i = 0; i < keys.length; i++) {
            const srcKey = keys[i];
            const obj = await getObjectStream(srcKey);
            if (!obj?.Body) continue;
            const buf = await streamToBuffer(obj.Body, { isCancelled: () => state?.cancelRequested });
            if (!buf || !buf.length) continue;

            const srcFileName = srcKey.split('/').pop() || `file_${i + 1}`;
            const ext = path.extname(srcFileName) || '.pdf';
            const destKey = `${destOriginalFolderKey}/cv-original-${i + 1}${ext}`;
            const mime = obj.ContentType || getMimeTypeByFilename(srcFileName);
            await uploadBufferToS3(buf, destKey, mime);
          }
          copiedAny = true;
        }
      } catch (e) {
        console.warn('[AutoParse] Fallback upload to CV_original failed:', e.message);
      }

      cv.cvOriginalPath = destOriginalFolderKey;
      await cv.save();
    }
  } else {
    // Local fallback: create snapshot folder and copy from old cv.cvOriginalPath
    const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
    const origDir = path.join(snapshotDir, 'CV_original');
    await fs.mkdir(origDir, { recursive: true });

    let copiedAny = false;
    if (cv.cvOriginalPath) {
      try {
        const oldPath = path.join(backendRoot, cv.cvOriginalPath);
        const stat = await fs.stat(oldPath).catch(() => null);
        if (stat?.isFile()) {
          const ext = path.extname(cv.cvOriginalPath) || '.pdf';
          await fs.copyFile(oldPath, path.join(origDir, `cv-original-1${ext}`));
          copiedAny = true;
        } else if (stat?.isDirectory()) {
          const entries = await fs.readdir(oldPath);
          for (let i = 0; i < entries.length; i++) {
            const ext = path.extname(entries[i]) || '.pdf';
            await fs.copyFile(path.join(oldPath, entries[i]), path.join(origDir, `cv-original-${i + 1}${ext}`));
          }
          copiedAny = entries.length > 0;
        }
      } catch (e) {
        console.warn('[AutoParse] Local copy cvOriginalPath failed:', e.message);
      }
    }

    // If cvOriginalPath missing/empty: fallback copy from otherDocuments/curriculumVitae if they exist locally
    if (!copiedAny) {
      try {
        const candidates = [cv.otherDocuments, cv.curriculumVitae];
        let idx = 1;
        for (const p of candidates) {
          if (!p) continue;
          const abs = path.join(backendRoot, p);
          const stat = await fs.stat(abs).catch(() => null);
          if (!stat) continue;
          if (stat.isFile()) {
            const ext = path.extname(p) || '.pdf';
            await fs.copyFile(abs, path.join(origDir, `cv-original-${idx}${ext}`));
            idx++;
          } else if (stat.isDirectory()) {
            const entries = await fs.readdir(abs);
            for (let i = 0; i < entries.length; i++) {
              const ext = path.extname(entries[i]) || '.pdf';
              await fs.copyFile(path.join(abs, entries[i]), path.join(origDir, `cv-original-${idx}${ext}`));
              idx++;
            }
          }
        }
      } catch (e) {
        console.warn('[AutoParse] Local fallback copy to CV_original failed:', e.message);
      }
    }

    cv.cvOriginalPath = path.relative(backendRoot, origDir);
    await cv.save();
  }

  // Set template folder path for new snapshot
  if (s3Enabled()) {
    cv.curriculumVitae = buildCvTemplateFolderKey(cv.id, dateTime);
  } else {
    const tplDir = path.join(uploadDir, String(cv.id), dateTime, 'CV_Template');
    cv.curriculumVitae = path.relative(backendRoot, tplDir);
  }
  await cv.save();

  const templateList = [
    { cvTemplate: 'common', dir: 'Common' },
    { cvTemplate: 'cv_it', dir: 'IT' },
    { cvTemplate: 'cv_technical', dir: 'Technical' }
  ];

  for (const { cvTemplate, dir } of templateList) {
    // Rirekisho
    try {
      const rirekishoBuffer = await generateCvRirekishoPdfBuffer(cv, { avatarDataUrl, cvTemplate });
      if (rirekishoBuffer) {
        if (s3Enabled()) {
          const key = buildCvTemplateFileKey(cv.id, dateTime, dir, 'cv-rirekisho.pdf');
          await uploadBufferToS3(rirekishoBuffer, key, 'application/pdf');
        } else {
          const subDir = path.join(uploadDir, String(cv.id), dateTime, 'CV_Template', dir);
          await fs.mkdir(subDir, { recursive: true });
          await fs.writeFile(path.join(subDir, 'cv-rirekisho.pdf'), rirekishoBuffer);
        }
      }
    } catch (e) {
      console.warn(`[AutoParse] Rirekisho PDF ${dir} failed:`, e.message);
    }

    // Shokumu
    try {
      const shokumuBuffer = await generateCvShokumuPdfBuffer(cv, { avatarDataUrl, cvTemplate });
      if (shokumuBuffer) {
        if (s3Enabled()) {
          const key = buildCvTemplateFileKey(cv.id, dateTime, dir, 'cv-shokumu.pdf');
          await uploadBufferToS3(shokumuBuffer, key, 'application/pdf');
        } else {
          const subDir = path.join(uploadDir, String(cv.id), dateTime, 'CV_Template', dir);
          await fs.mkdir(subDir, { recursive: true });
          await fs.writeFile(path.join(subDir, 'cv-shokumu.pdf'), shokumuBuffer);
        }
      }
    } catch (e) {
      console.warn(`[AutoParse] Shokumu PDF ${dir} failed:`, e.message);
    }
  }

  await cv.save();
}

async function updateCvFromParsedData(cv, parsedData) {
  const updateFields = parsedDataToCvUpdate(parsedData, cv);
  // Assign updated fields
  Object.entries(updateFields).forEach(([k, v]) => {
    if (v !== undefined) cv[k] = v;
  });
  await cv.save();

  // Snapshot & regenerate CV templates like updateCV flow
  await regenerateCvTemplates(cv);
}

async function tryParseCvAndUpdate(cv) {
  const s3FilesAll = await resolveCvStoredFilesToS3Keys(cv);
  const s3Files = Array.isArray(s3FilesAll) ? s3FilesAll.slice(0, MAX_FILES_PER_CV) : [];
  if (!s3Files || s3Files.length === 0) {
    throw new Error('CV has no resolvable files in otherDocuments/curriculumVitae/cvOriginalPath');
  }

  // Used to abort current AI request when admin presses stop.
  const aiAbortController = new AbortController();
  state.aiAbortController = aiAbortController;

  const formData = new FormData();
  try {
    for (const s3Key of s3Files) {
      if (state.cancelRequested) throw new Error('auto-parse-cancelled');
      const obj = await getObjectStream(s3Key);
    if (!obj?.Body) continue;
      const buf = await streamToBuffer(obj.Body, { isCancelled: () => state.cancelRequested });
    if (!buf || !buf.length) continue;

      const fileName = s3Key.split('/').pop() || 'file';
      const mime = obj.ContentType || getMimeTypeByFilename(fileName);
      const blob = new Blob([buf], { type: mime });
      formData.append('files', blob, fileName);
    }

    // If all objects were skipped, fail
    // (AI sẽ không thể parse)
    const parsedData = await callAiParseCandidate(formData, { abortSignal: aiAbortController.signal });

    await updateCvFromParsedData(cv, parsedData);
  } finally {
    if (state.aiAbortController === aiAbortController) {
      state.aiAbortController = null;
    }
  }
}

// In-memory job state (single-process worker)
let state = null;

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function runWorkerLoop() {
  const startedAt = Date.now();
  try {
    state.processed = 0;
    state.success = 0;
    state.failed = 0;

    // Find last successful CV marker
    const last = await CVStorage.findOne({
      where: { lastTimeParsed: true },
      attributes: ['id'],
      order: [['id', 'DESC']]
    });
    let lastId = last?.id || 0;

    // Sequential processing after lastId
    let cursorId = lastId;
    const BATCH_SIZE = 5; // small batches to reduce memory and to allow cancellation
    let cancelledMidCv = false;

    while (true) {
      if (state.cancelRequested) break;

      const batch = await CVStorage.findAll({
        where: { id: { [Op.gt]: cursorId } },
        order: [['id', 'ASC']],
        limit: BATCH_SIZE
      });

      if (!batch || batch.length === 0) break;

      for (const cv of batch) {
        if (state.cancelRequested) break;

        state.processed += 1;
        try {
          await tryParseCvAndUpdate(cv);

          // Mark parse success
          await CVStorage.update({ lastTimeParsed: false }, { where: { lastTimeParsed: true } });

          cv.isParse = true;
          cv.lastTimeParsed = true;
          await cv.save();

          state.success += 1;
          lastId = cv.id;
        } catch (e) {
          // Mark parse failure
          try {
            cv.isParse = false;
            cv.lastTimeParsed = false;
            await cv.save();
          } catch (_) {}

          state.failed += 1;
          console.warn('[AutoParse] CV failed:', cv.id, e.message);

          // Optional log (avoid huge before/after)
          try {
            await ActionLog.create({
              adminId: state.adminId || null,
              object: 'CVStorage',
              action: 'auto-parse-failed',
              ip: 'auto-parse-worker',
              before: null,
              after: null,
              description: `AI parse failed: ${cv.code} (${cv.id})`
            });
          } catch (_) {}
        }

        if (state.cancelRequested) {
          cancelledMidCv = true;
          break;
        }

        cursorId = cv.id;
      }

      if (cancelledMidCv) break;
    }
  } finally {
    const result = {
      processed: state.processed,
      success: state.success,
      failed: state.failed,
      runtimeMs: Date.now() - startedAt
    };
    state.running = false;
    state.stopDeferred.resolve(result);
  }
}

function startAutoParse({ adminId = null } = {}) {
  if (state?.running) {
    return { ok: false, message: 'Auto parse already running' };
  }

  const deferred = createDeferred();
  state = {
    running: true,
    cancelRequested: false,
    stopDeferred: deferred,
    adminId,
    processed: 0,
    success: 0,
    failed: 0
  };

  runWorkerLoop();
  return { ok: true, stopPromise: deferred.promise };
}

function stopAutoParse() {
  if (!state?.running) {
    return { ok: false, message: 'Auto parse not running', result: { processed: 0, success: 0, failed: 0 } };
  }
  state.cancelRequested = true;
  // Abort current AI request immediately (if any)
  try {
    state.aiAbortController?.abort?.();
  } catch (_) {}
  return { ok: true, stopPromise: state.stopDeferred.promise };
}

export const cvAutoParseService = {
  startAutoParse,
  stopAutoParse
};

