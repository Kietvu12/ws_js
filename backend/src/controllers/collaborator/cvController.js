import { CVStorage, JobApplication, Admin, Applicant, JobCategory } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { isAllowedCvOriginalUpload, CV_ORIGINAL_UPLOAD_ERROR } from '../../utils/cvOriginalUploadAllowlist.js';
import config from '../../config/index.js';
import {
  checkDuplicateCV,
  handleDuplicateCV,
  findPromotedInactiveForSameRecordOwnership,
  findCanonicalDuplicateConflictForUpdate,
  revertPromotedInactiveCVs,
  runCvDuplicatePipelineAfterCreate,
} from '../../utils/cvDuplicateChecker.js';
import { CV_STATUS_NEW, CV_STATUS_DUPLICATE, CV_STATUS_CREATE_FAILED } from '../../constants/cvStatus.js';
import { uploadBufferToS3, buildCvRirekishoPdfKey, buildCvShokumuPdfKey, buildCvOriginalKey, isS3Key, deleteFileFromS3, s3Enabled, getSignedUrlForFile, getObjectStream, makeDownloadDisposition, getCvSnapshotDateTime, buildCvOriginalFolderKey, buildCvTemplateFolderKey, buildCvTemplateFileKey, uploadCvOriginalsToSnapshot, copyCvOriginalsToNewSnapshot, copySingleFileToCvOriginalSnapshot, copyCvTemplatesToNewSnapshot, isFolderPath, listKeysUnderPrefix, listCvSnapshotDateTimes } from '../../services/s3Service.js';
import { createReadStream } from 'fs';
import {
  generateCvRirekishoPdfBuffer,
  generateCvShokumuPdfBuffer,
  generateCvTemplatePdfBuffer,
  buildCvTemplatePdfFilenameFromPreviewPayload,
  buildCvTemplatePdfFilenameFromStorageQuery,
  makeInlineDisposition
} from '../../services/cvPdfService.js';
import { generateCvTemplateHtml } from '../../utils/cvTemplateHtml.js';
import { parseCvTemplatePreviewPayload } from '../../utils/cvTemplatePreviewPayload.js';
import { resolveCvFileForView } from '../../utils/cvStorageResolver.js';
import { mimeFromCvFilePath } from '../../utils/cvFileContentMime.js';
import { listExistingCvTemplateDocumentPairs } from '../../utils/cvTemplateFileDiscovery.js';
import { parseCvTableLayoutFromRequest } from '../../utils/cvTableLayoutParse.js';
import { collaboratorNotificationService } from '../../services/collaboratorNotificationService.js';
import { injectVisitorMessageForCollaborator } from '../../services/publicCtvChatInjectService.js';
import { saveCvAvatarForSnapshot } from '../../services/cvSnapshotService.js';
import { enqueueCvVectorSync } from '../../services/cvVectorSyncService.js';
import archiver from 'archiver';
import { parseJobCategoryIdFromBody, jobCategoryIdExists } from '../../utils/cvJobCategoryId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file upload
const uploadDir = path.join(__dirname, '../../../', config.upload.dir, 'cvs');
// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `cv-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'avatarPhoto') {
    const imgTypes = /jpeg|jpg|png|gif|webp/;
    const ok = imgTypes.test(path.extname(file.originalname).toLowerCase()) && file.mimetype.startsWith('image/');
    return ok ? cb(null, true) : cb(new Error('Ảnh chân dung: chỉ chấp nhận JPG, PNG, GIF, WEBP'));
  }
  if (isAllowedCvOriginalUpload(file)) return cb(null, true);
  cb(new Error(CV_ORIGINAL_UPLOAD_ERROR));
};
const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    fieldSize: config.upload.maxFormFieldSize
  },
  fileFilter
}).fields([{ name: 'cvFile', maxCount: 10 }, { name: 'avatarPhoto', maxCount: 1 }]);

async function getSuperAdminIdForApplicantCv() {
  const superAdmin = await Admin.findOne({
    where: { role: 1 },
    order: [['id', 'ASC']],
    attributes: ['id']
  });
  return superAdmin?.id || null;
}

const FULL_CV_TEMPLATE_LIST = [
  { cvTemplate: 'common', dir: 'Common' },
  { cvTemplate: 'cv_it', dir: 'IT' },
  { cvTemplate: 'cv_technical', dir: 'Technical' }
];

const CV_COMPLETION_STATE = {
  NEW: 'new',
  PENDING_MANUAL_COMPLETION: 'pending_manual_completion',
  READY_FOR_PARSE: 'ready_for_parse',
  VECTOR_PROCESSING: 'vector_processing',
  VECTOR_DONE: 'vector_done',
  VECTOR_FAILED: 'vector_failed',
};

function parseJsonLike(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function normalizeEducationsResponse(raw) {
  const parsed = parseJsonLike(raw);
  const list = Array.isArray(parsed) ? parsed : [];
  return list.map((edu) => {
    if (!edu || typeof edu !== 'object') return {};
    const startDate = edu.start_date || (edu.year ? `${edu.year}${edu.month ? `/${edu.month}` : ''}` : null);
    const endDate = edu.end_date || (edu.endYear ? `${edu.endYear}${edu.endMonth ? `/${edu.endMonth}` : ''}` : null);
    return {
      school_name: edu.school_name || null,
      major: edu.major || null,
      start_date: startDate,
      end_date: endDate,
      status: edu.status || null
    };
  });
}

function normalizeProjectResponse(raw) {
  const parsed = parseJsonLike(raw);
  const list = Array.isArray(parsed) ? parsed : [];
  return list.map((project) => {
    if (!project || typeof project !== 'object') return {};
    return {
      project_name: project.project_name || project.name || project.business_objective || project.business_purpose || '',
      role: project.role || project.project_role || project.position || '',
      description: project.description || project.responsibilities || '',
      tools_tech: Array.isArray(project.tools)
        ? project.tools.map((t) => (t == null ? '' : String(t))).filter(Boolean).join(', ')
        : (project.tools_tech || project.tools || ''),
      team_size: project.team_size || project.teamSize || project.team_size_role || project.scale_role || '',
      startYear: project.startYear || project.project_start_year || '',
      startMonth: project.startMonth || project.project_start_month || '',
      endYear: project.endYear || project.project_end_year || '',
      endMonth: project.endMonth || project.project_end_month || '',
      period: project.period || '',
    };
  });
}

function normalizeWorkExperienceItemResponse(item) {
  const base = item && typeof item === 'object' ? item : {};
  return {
    ...base,
    employmentPlace: base.employmentPlace || base.employment_place || base.work_location || base.location || '',
    employment_place: base.employment_place || base.employmentPlace || base.work_location || base.location || '',
    companyRole: base.companyRole || base.company_role || base.position_role || base.position_name || base.position || '',
    company_role: base.company_role || base.companyRole || base.position_role || base.position_name || base.position || '',
    projects: normalizeProjectResponse(base.projects)
  };
}

function normalizeWorkExperiencesResponse(raw) {
  const parsed = parseJsonLike(raw);
  const empty = { shokumu_job_history: [], rirekisho_work_history: [] };
  if (!parsed) return empty;

  if (Array.isArray(parsed)) {
    return {
      shokumu_job_history: [],
      rirekisho_work_history: parsed.map(normalizeWorkExperienceItemResponse)
    };
  }

  if (typeof parsed === 'object') {
    return {
      shokumu_job_history: Array.isArray(parsed.shokumu_job_history)
        ? parsed.shokumu_job_history.map(normalizeWorkExperienceItemResponse)
        : [],
      rirekisho_work_history: Array.isArray(parsed.rirekisho_work_history)
        ? parsed.rirekisho_work_history.map(normalizeWorkExperienceItemResponse)
        : []
    };
  }

  return empty;
}

function normalizeCvDetailResponse(cvLike) {
  const cvData = cvLike && typeof cvLike.toJSON === 'function' ? cvLike.toJSON() : { ...(cvLike || {}) };
  cvData.educations = normalizeEducationsResponse(cvData.educations);
  cvData.workExperiences = normalizeWorkExperiencesResponse(cvData.workExperiences);
  return cvData;
}

function shouldUseQuickCreate(rawData = {}, identity = {}) {
  if (identity.collaboratorId == null) return false;
  return String(rawData.quickCreate || '').trim() === '1';
}

function shouldMarkReadyForParse(rawData = {}, identity = {}) {
  if (identity.collaboratorId == null) return false;
  return String(rawData.markReadyForParse || '').trim() === '1';
}

function shouldSkipPdfGeneration(rawData = {}) {
  return String(rawData.skipPdfGeneration || '').trim() === '1';
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readExistingAvatarDataUrl(cv, backendRoot) {
  const avatarPath = cv?.avatarPhotoPath || cv?.avatarPhoto || cv?.avatarUrl || cv?.avatar_path || cv?.avatar_photo_path || '';
  if (!avatarPath || typeof avatarPath !== 'string') return '';
  try {
    if (s3Enabled() || isS3Key(avatarPath)) {
      const obj = await getObjectStream(avatarPath);
      const buffer = await streamToBuffer(obj?.Body || obj);
      if (!buffer.length) return '';
      const mime = obj?.ContentType || mimeFromCvFilePath(avatarPath) || 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }

    if (/^https?:\/\//i.test(avatarPath) || avatarPath.startsWith('data:')) {
      return '';
    }

    const fullPath = path.isAbsolute(avatarPath) ? avatarPath : path.join(backendRoot, avatarPath);
    const buffer = await fs.readFile(fullPath);
    if (!buffer.length) return '';
    const mime = mimeFromCvFilePath(avatarPath) || 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.warn('[readExistingAvatarDataUrl] Không thể đọc ảnh chân dung cũ:', e.message);
    return '';
  }
}

function buildDuplicateOwnershipInfo(duplicateCV, identity = {}) {
  if (!duplicateCV) return null;
  const duplicateOwnerCollaboratorId = duplicateCV.collaboratorId != null ? Number(duplicateCV.collaboratorId) : null;
  const currentCollaboratorId = identity.collaboratorId != null ? Number(identity.collaboratorId) : null;
  const ownership =
    duplicateOwnerCollaboratorId != null && currentCollaboratorId != null && duplicateOwnerCollaboratorId !== currentCollaboratorId
      ? 'other_collaborator'
      : duplicateOwnerCollaboratorId != null && currentCollaboratorId != null && duplicateOwnerCollaboratorId === currentCollaboratorId
        ? 'same_collaborator'
        : duplicateCV.applicantId != null
          ? 'applicant'
          : duplicateCV.adminId != null
            ? 'admin'
            : 'unknown';
  return {
    ownership,
    duplicateCvId: duplicateCV.id,
    collaboratorId: duplicateOwnerCollaboratorId,
  };
}

/**
 * Ứng viên chỉ tạo PDF cho đúng một mẫu đã chọn (FormData: cvTemplate).
 * CTV giữ hành vi cũ: sinh cả Common, IT, Technical.
 */
function resolveTemplateListForCreatePipeline(rawData, identity) {
  if (identity.applicantId != null) {
    const raw = (rawData.cvTemplate || 'common').toString().trim();
    const map = {
      common: { cvTemplate: 'common', dir: 'Common' },
      cv_it: { cvTemplate: 'cv_it', dir: 'IT' },
      cv_technical: { cvTemplate: 'cv_technical', dir: 'Technical' }
    };
    const entry = map[raw] || map.common;
    return [entry];
  }
  return FULL_CV_TEMPLATE_LIST;
}

/**
 * Danh sách file CV gốc + template (dùng cho CTV và ứng viên).
 * @param {import('sequelize').Model} cv
 * @param {import('express').Request} req
 */
async function buildCvFileListPayload(cv, req) {
  const backendRoot = path.join(__dirname, '../../../');
  const apiBase = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');

  const originals = [];
  if (cv.cvOriginalPath) {
    if (isFolderPath(cv.cvOriginalPath)) {
      if (isS3Key(cv.cvOriginalPath)) {
        const keys = await listKeysUnderPrefix(cv.cvOriginalPath);
        keys.sort();
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const name = path.basename(key);
          const viewUrl = await getSignedUrlForFile(key, 'view');
          const downloadUrl = await getSignedUrlForFile(key, 'download', makeDownloadDisposition(name));
          originals.push({ index: i, name, viewUrl, downloadUrl });
        }
      } else {
        const fullDir = path.join(backendRoot, cv.cvOriginalPath.replace(/^\//, ''));
        let entries = [];
        try {
          entries = await fs.readdir(fullDir);
        } catch (e) {
          // folder missing
        }
        entries.sort();
        for (let i = 0; i < entries.length; i++) {
          const pathPart = (cv.cvOriginalPath.replace(/\/+$/, '') + '/' + entries[i]).replace(/^\//, '');
          const viewUrl = `${apiBase}/${pathPart}`;
          originals.push({ index: i, name: entries[i], viewUrl, downloadUrl: viewUrl });
        }
      }
    } else {
      const resolved = await resolveCvFileForView(cv, 'cvOriginalPath', {}, backendRoot);
      if (resolved) {
        const name = path.basename(resolved.pathOrKey);
        if (resolved.isS3) {
          const viewUrl = await getSignedUrlForFile(resolved.pathOrKey, 'view');
          const downloadUrl = await getSignedUrlForFile(resolved.pathOrKey, 'download', makeDownloadDisposition(name));
          originals.push({ index: 0, name, viewUrl, downloadUrl });
        } else {
          const pathPart = resolved.pathOrKey.startsWith('/') ? resolved.pathOrKey : `/${resolved.pathOrKey}`;
          const viewUrl = `${apiBase}${pathPart}`;
          originals.push({ index: 0, name, viewUrl, downloadUrl: viewUrl });
        }
      }
    }
  }

  const templates = [];
  const templateLabels = { rirekisho: '履歴書', shokumu: '職務経歴書' };
  const templateNames = { Common: 'Common', IT: 'IT', Technical: 'Technical' };
  if (cv.curriculumVitae && isFolderPath(cv.curriculumVitae) && cv.curriculumVitae.includes('CV_Template')) {
    const pairs = await listExistingCvTemplateDocumentPairs(cv.curriculumVitae, backendRoot);
    for (const { template, document } of pairs) {
      const resolved = await resolveCvFileForView(cv, document === 'shokumu' ? 'cvCareerHistoryPath' : 'curriculumVitae', { template, document }, backendRoot);
      if (!resolved) continue;
      const label = `${templateNames[template]} - ${templateLabels[document]}`;
      const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template, document });
      if (resolved.isS3) {
        const viewUrl = await getSignedUrlForFile(resolved.pathOrKey, 'view');
        const downloadUrl = await getSignedUrlForFile(resolved.pathOrKey, 'download', makeDownloadDisposition(downloadFileName));
        templates.push({ template, document, label, downloadFileName, viewUrl, downloadUrl });
      } else {
        const pathPart = resolved.pathOrKey.startsWith('/') ? resolved.pathOrKey : `/${resolved.pathOrKey}`;
        const viewUrl = `${apiBase}${pathPart}`;
        templates.push({ template, document, label, downloadFileName, viewUrl, downloadUrl: viewUrl });
      }
    }
  } else {
    if (cv.curriculumVitae) {
      const resolved = await resolveCvFileForView(cv, 'curriculumVitae', {}, backendRoot);
      if (resolved) {
        const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: 'Common', document: 'rirekisho' });
        if (resolved.isS3) {
          const viewUrl = await getSignedUrlForFile(resolved.pathOrKey, 'view');
          const downloadUrl = await getSignedUrlForFile(resolved.pathOrKey, 'download', makeDownloadDisposition(downloadFileName));
          templates.push({ template: 'Common', document: 'rirekisho', label: '履歴書', downloadFileName, viewUrl, downloadUrl });
        } else {
          const pathPart = resolved.pathOrKey.startsWith('/') ? resolved.pathOrKey : `/${resolved.pathOrKey}`;
          const viewUrl = `${apiBase}${pathPart}`;
          templates.push({ template: 'Common', document: 'rirekisho', label: '履歴書', downloadFileName, viewUrl, downloadUrl: viewUrl });
        }
      }
    }
    if (cv.cvCareerHistoryPath || cv.curriculumVitae) {
      const resolved = await resolveCvFileForView(cv, 'cvCareerHistoryPath', {}, backendRoot);
      if (resolved) {
        const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: 'Common', document: 'shokumu' });
        if (resolved.isS3) {
          const viewUrl = await getSignedUrlForFile(resolved.pathOrKey, 'view');
          const downloadUrl = await getSignedUrlForFile(resolved.pathOrKey, 'download', makeDownloadDisposition(downloadFileName));
          templates.push({ template: 'Common', document: 'shokumu', label: '職務経歴書', downloadFileName, viewUrl, downloadUrl });
        } else {
          const pathPart = resolved.pathOrKey.startsWith('/') ? resolved.pathOrKey : `/${resolved.pathOrKey}`;
          const viewUrl = `${apiBase}${pathPart}`;
          templates.push({ template: 'Common', document: 'shokumu', label: '職務経歴書', downloadFileName, viewUrl, downloadUrl: viewUrl });
        }
      }
    }
  }

  return { originals, templates };
}

/**
 * Nén và trả ZIP (CV gốc hoặc CV_Template) — dùng chung CTV và ứng viên.
 */
async function streamCvZipResponse(cv, req, res, next) {
  const { id } = req.params;
  const { scope = 'template', template = 'all', dateTime: dt } = req.query;

  const backendRoot = path.join(__dirname, '../../../');
  const files = [];

  if (scope === 'original') {
    const dateTime = dt ? String(dt) : null;
    if (dateTime) {
      if (s3Enabled()) {
        const folderKey = buildCvOriginalFolderKey(cv.id, dateTime);
        const keys = await listKeysUnderPrefix(folderKey);
        keys.sort();
        for (const key of keys) files.push({ type: 's3', key, name: `CV_original/${path.basename(key)}` });
      } else {
        const fullDir = path.join(uploadDir, String(cv.id), dateTime, 'CV_original');
        let entries = [];
        try { entries = await fs.readdir(fullDir); } catch {}
        entries.sort();
        for (const f of entries) files.push({ type: 'local', fullPath: path.join(fullDir, f), name: `CV_original/${f}` });
      }
    } else {
      if (!cv.cvOriginalPath) {
        res.status(404).json({ success: false, message: 'Không có file CV gốc' });
        return;
      }
      if (isFolderPath(cv.cvOriginalPath)) {
        if (isS3Key(cv.cvOriginalPath)) {
          const keys = await listKeysUnderPrefix(cv.cvOriginalPath);
          keys.sort();
          for (const key of keys) files.push({ type: 's3', key, name: `CV_original/${path.basename(key)}` });
        } else {
          const fullDir = path.join(backendRoot, cv.cvOriginalPath.replace(/^\//, ''));
          let entries = [];
          try { entries = await fs.readdir(fullDir); } catch {}
          entries.sort();
          for (const f of entries) files.push({ type: 'local', fullPath: path.join(fullDir, f), name: `CV_original/${f}` });
        }
      } else {
        const resolved = await resolveCvFileForView(cv, 'cvOriginalPath', {}, backendRoot);
        if (resolved?.isS3) files.push({ type: 's3', key: resolved.pathOrKey, name: `CV_original/${path.basename(resolved.pathOrKey)}` });
        else if (resolved?.pathOrKey) files.push({ type: 'local', fullPath: path.join(backendRoot, resolved.pathOrKey.replace(/^\//, '')), name: `CV_original/${path.basename(resolved.pathOrKey)}` });
      }
    }
  } else {
    const dateTime = dt ? String(dt) : null;
    const wantTpl = template === 'all' ? null : String(template);
    if (dateTime) {
      const templateFolderRef = s3Enabled()
        ? buildCvTemplateFolderKey(cv.id, dateTime)
        : path.join(uploadDir, String(cv.id), dateTime, 'CV_Template');
      let pairs = await listExistingCvTemplateDocumentPairs(templateFolderRef, backendRoot);
      if (wantTpl) pairs = pairs.filter((p) => p.template === wantTpl);
      for (const { template: tpl, document } of pairs) {
        const fileName = `cv-${document}.pdf`;
        const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: tpl, document });
        if (s3Enabled()) {
          const key = buildCvTemplateFileKey(cv.id, dateTime, tpl, fileName);
          files.push({ type: 's3', key, name: `CV_Template/${tpl}/${downloadFileName}` });
        } else {
          const full = path.join(uploadDir, String(cv.id), dateTime, 'CV_Template', tpl, fileName);
          files.push({ type: 'local', fullPath: full, name: `CV_Template/${tpl}/${downloadFileName}` });
        }
      }
    } else {
      if (!cv.curriculumVitae) {
        res.status(404).json({ success: false, message: 'Không có file CV template' });
        return;
      }
      if (!cv.curriculumVitae.includes('CV_Template')) {
        res.status(404).json({ success: false, message: 'Không có file CV template' });
        return;
      }
      let pairs = await listExistingCvTemplateDocumentPairs(cv.curriculumVitae, backendRoot);
      if (wantTpl) pairs = pairs.filter((p) => p.template === wantTpl);
      for (const { template: tpl, document } of pairs) {
        const resolved = await resolveCvFileForView(cv, document === 'shokumu' ? 'cvCareerHistoryPath' : 'curriculumVitae', { template: tpl, document }, backendRoot);
        if (!resolved) continue;
        const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: tpl, document });
        const baseName = `CV_Template/${tpl}/${downloadFileName}`;
        if (resolved.isS3) files.push({ type: 's3', key: resolved.pathOrKey, name: baseName });
        else files.push({ type: 'local', fullPath: path.join(backendRoot, resolved.pathOrKey.replace(/^\//, '')), name: baseName });
      }
    }
  }

  if (!files.length) {
    res.status(404).json({ success: false, message: 'Không có file để nén' });
    return;
  }

  const safeTpl = template === 'all' ? 'all' : String(template);
  const zipName = scope === 'original'
    ? `cv_${id}_CV_original.zip`
    : `cv_${id}_CV_Template_${safeTpl}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', makeDownloadDisposition(zipName));
  res.setHeader('Cache-Control', 'private, max-age=60');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => next(err));
  archive.pipe(res);

  for (const f of files) {
    if (f.type === 's3') {
      const obj = await getObjectStream(f.key);
      if (obj?.Body) archive.append(obj.Body, { name: f.name });
    } else {
      archive.file(f.fullPath, { name: f.name });
    }
  }

  await archive.finalize();
}

/**
 * Pipeline chung: tạo bản ghi CV, snapshot, PDF 履歴書/職務経歴 (CTV: 3 mẫu; ứng viên: 1 mẫu đã chọn).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ collaboratorId: number|null, applicantId: number|null, adminId: number|null }} identity
 */
async function processCreateCvPipeline(req, res, identity) {
  const rawData = req.body;
  const quickCreate = shouldUseQuickCreate(rawData, identity);
  const markReadyForParseOnCreate = shouldMarkReadyForParse(rawData, identity);

  const code = `CV${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const cvData = {
    name: rawData.nameKanji || rawData.name || null,
    furigana: rawData.nameKana || rawData.furigana || null,
    email: rawData.email || null,
    phone: rawData.phone || null,
    postalCode: rawData.postalCode || null,
    addressCurrent: rawData.address || rawData.addressCurrent || null,
    birthDate: rawData.birthDate || null,
    ages: rawData.age || rawData.ages || null,
    gender: rawData.gender ? (rawData.gender === '男' || rawData.gender === '1' || rawData.gender === 1 ? 1 : rawData.gender === '女' || rawData.gender === '2' || rawData.gender === 2 ? 2 : null) : null,
    educations: rawData.educations
      ? (typeof rawData.educations === 'string'
        ? (rawData.educations.trim() ? JSON.parse(rawData.educations) : null)
        : Array.isArray(rawData.educations) ? rawData.educations : null)
      : null,
    workExperiences: rawData.workExperiences
      ? (typeof rawData.workExperiences === 'string'
        ? (rawData.workExperiences.trim() ? JSON.parse(rawData.workExperiences) : null)
        : Array.isArray(rawData.workExperiences) ? rawData.workExperiences : null)
      : null,
    certificates: rawData.certificates
      ? (typeof rawData.certificates === 'string'
        ? (rawData.certificates.trim() ? JSON.parse(rawData.certificates) : null)
        : Array.isArray(rawData.certificates) ? rawData.certificates : null)
      : null,
    technicalSkills: rawData.technicalSkills || null,
    careerSummary: rawData.careerSummary || null,
    strengths: rawData.strengths || null,
    motivation: rawData.motivation || null,
    currentIncome: rawData.currentSalary ? parseInt(String(rawData.currentSalary).replace(/[^\d]/g, ''), 10) || null : null,
    desiredIncome: rawData.desiredSalary ? parseInt(String(rawData.desiredSalary).replace(/[^\d]/g, ''), 10) || null : null,
    desiredWorkLocation: rawData.desiredLocation || rawData.desiredWorkLocation || null,
    desiredPosition: rawData.desiredPosition || null,
    nyushaTime: rawData.desiredStartDate || rawData.nyushaTime || null,
    addressOrigin: rawData.addressOrigin || null,
    passport: rawData.passport ? parseInt(rawData.passport, 10) : null,
    currentResidence: rawData.currentResidence ? parseInt(rawData.currentResidence, 10) : null,
    jpResidenceStatus: rawData.jpResidenceStatus ? parseInt(rawData.jpResidenceStatus, 10) : null,
    visaExpirationDate: rawData.visaExpirationDate || null,
    otherCountry: rawData.otherCountry || null,
    spouse: rawData.spouse ? parseInt(rawData.spouse, 10) : null,
    interviewTime: rawData.interviewTime || null,
    learnedTools: rawData.learnedTools
      ? (typeof rawData.learnedTools === 'string' ? JSON.parse(rawData.learnedTools) : rawData.learnedTools)
      : null,
    experienceTools: rawData.experienceTools
      ? (typeof rawData.experienceTools === 'string' ? JSON.parse(rawData.experienceTools) : rawData.experienceTools)
      : null,
    jlptLevel: rawData.jlptLevel ? parseInt(rawData.jlptLevel, 10) : null,
    experienceYears: rawData.experienceYears ? parseInt(rawData.experienceYears, 10) : null,
    specialization: rawData.specialization ? parseInt(rawData.specialization, 10) : null,
    qualification: rawData.qualification ? parseInt(rawData.qualification, 10) : null,
    otherDocuments: rawData.otherDocuments || null,
    notes: rawData.notes || null,
    cvTableLayout: parseCvTableLayoutFromRequest(rawData.cvTableLayout),
  };

  Object.keys(cvData).forEach((key) => {
    if (cvData[key] === null || cvData[key] === undefined) {
      delete cvData[key];
    }
  });

  const jcParsed = parseJobCategoryIdFromBody(rawData);
  if (jcParsed !== undefined) {
    if (jcParsed !== null && !(await jobCategoryIdExists(jcParsed))) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy danh mục công việc'
      });
    }
    cvData.jobCategoryId = jcParsed;
  }

  // CTV tạo mới: chặn nếu đã có canonical hợp lệ trùng email/SĐT (cùng CTV, CTV khác, admin, ứng viên).
  let duplicateInfo = null;
  const allowDuplicate = String(rawData.allowDuplicate || '').trim() === '1';
  if (identity.collaboratorId != null && (cvData.email || cvData.phone)) {
    const globalDup = await checkDuplicateCV(cvData.name, cvData.email, cvData.phone);
    if (globalDup) {
      const dupInfo = buildDuplicateOwnershipInfo(globalDup, identity);
      duplicateInfo = {
        isDuplicate: true,
        ownership: dupInfo?.ownership || 'unknown',
        duplicateWithCvId: globalDup.id,
        blocked: !allowDuplicate,
        reason: 'global_canonical_exists'
      };
    }
  }

  if (duplicateInfo?.blocked) {
    const duplicateCv = await CVStorage.create({
      collaboratorId: identity.collaboratorId,
      applicantId: identity.applicantId,
      adminId: identity.adminId,
      code,
      ...cvData,
      curriculumVitae: null,
      cvCareerHistoryPath: null,
      status: CV_STATUS_CREATE_FAILED,
      isDuplicate: true,
      duplicateWithCvId: duplicateInfo?.duplicateWithCvId || null,
      isParse: false,
      completionState: CV_COMPLETION_STATE.NEW,
      vectorSyncStatus: 'pending_manual_completion',
      vectorSyncRequestedAt: null,
      vectorSyncCompletedAt: null,
      vectorSyncLastError: null,
      vectorSyncRetryCount: 0
    });

    await duplicateCv.reload();

    return res.status(200).json({
      success: true,
      message: 'Hồ sơ khởi tạo thất bại vì thông tin đã trùng với hồ sơ hợp lệ khác.',
      data: {
        cv: duplicateCv.toJSON(),
        duplicateInfo,
      },
    });
  }

  const cv = await CVStorage.create({
    collaboratorId: identity.collaboratorId,
    applicantId: identity.applicantId,
    adminId: identity.adminId,
    code,
    ...cvData,
    curriculumVitae: null,
    cvCareerHistoryPath: null,
    status: duplicateInfo ? CV_STATUS_DUPLICATE : CV_STATUS_NEW,
    isDuplicate: Boolean(duplicateInfo),
    duplicateWithCvId: duplicateInfo?.duplicateWithCvId || null,
    isParse: false,
    completionState: CV_COMPLETION_STATE.NEW,
    vectorSyncStatus: 'pending_manual_completion',
    vectorSyncRequestedAt: null,
    vectorSyncCompletedAt: null,
    vectorSyncLastError: null,
    vectorSyncRetryCount: 0
  });

  let duplicateResult = null;
  let duplicateOwnershipInfo = null;
  if (duplicateInfo) {
    duplicateResult = duplicateInfo;
  } else if (cvData.name || cvData.email || cvData.phone) {
    if (identity.applicantId != null) {
      const { duplicateResult: dr } = await runCvDuplicatePipelineAfterCreate(cv);
      duplicateResult = dr;
    } else if (identity.collaboratorId != null) {
      // Rule 4: CTV tạo lại CV giống promoted-inactive của mình → xóa mềm cũ, CV mới hợp lệ
      const ownUnavailable = await findPromotedInactiveForSameRecordOwnership(
        cvData.email,
        cvData.phone,
        cv,
        cv.id
      );
      for (const old of ownUnavailable) {
        await old.destroy();
      }
      const duplicateCV = await checkDuplicateCV(cvData.name, cvData.email, cvData.phone);
      if (duplicateCV && duplicateCV.id !== cv.id) {
        duplicateOwnershipInfo = buildDuplicateOwnershipInfo(duplicateCV, identity);
        duplicateResult = await handleDuplicateCV(duplicateCV, cv);
      }
      if (!duplicateResult) {
        await revertPromotedInactiveCVs(cvData.email, cvData.phone, cv.id, cv.id);
      }
    } else {
      const { duplicateResult: dr } = await runCvDuplicatePipelineAfterCreate(cv);
      duplicateResult = dr;
    }
  }

  await cv.reload();

  if (duplicateInfo) {
    cv.status = CV_STATUS_CREATE_FAILED;
    cv.isDuplicate = true;
    cv.duplicateWithCvId = duplicateInfo.duplicateWithCvId;
    await cv.save();
    await cv.reload();
  }

  const backendRoot = path.join(__dirname, '../../../');
  const dateTime = getCvSnapshotDateTime();

  if (req.files?.cvFile?.length) {
    try {
      if (s3Enabled()) {
        cv.cvOriginalPath = await uploadCvOriginalsToSnapshot(cv.id, dateTime, req.files.cvFile);
      } else {
        const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
        const origDir = path.join(snapshotDir, 'CV_original');
        await fs.mkdir(origDir, { recursive: true });
        const usedNames = new Set();
        const toSafeUploadName = (originalname, index) => {
          const rawBase = path.basename(String(originalname || '').trim());
          const sanitized = rawBase
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
          const fallback = `cv-original-${index + 1}.pdf`;
          const name = sanitized || fallback;
          const ext = path.extname(name);
          const stem = ext ? name.slice(0, -ext.length) : name;
          let candidate = name;
          let counter = 2;
          while (usedNames.has(candidate.toLowerCase())) {
            candidate = `${stem}-${counter}${ext}`;
            counter += 1;
          }
          usedNames.add(candidate.toLowerCase());
          return candidate;
        };
        for (let i = 0; i < req.files.cvFile.length; i++) {
          const f = req.files.cvFile[i];
          const dest = path.join(origDir, toSafeUploadName(f.originalname, i));
          await fs.copyFile(f.path, dest);
        }
        cv.cvOriginalPath = path.relative(backendRoot, origDir);
      }
      await cv.save();
    } catch (e) {
      console.warn('[createCV] Lưu CV gốc thất bại:', e.message);
    }
    for (const f of req.files.cvFile) await fs.unlink(f.path).catch(() => {});
  } else {
    if (s3Enabled()) {
      cv.cvOriginalPath = buildCvOriginalFolderKey(cv.id, dateTime);
    } else {
      const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
      const origDir = path.join(snapshotDir, 'CV_original');
      await fs.mkdir(origDir, { recursive: true });
      cv.cvOriginalPath = path.relative(backendRoot, origDir);
    }
    await cv.save();
  }

  if (!quickCreate) {
    try {
      let avatarDataUrl = '';
      if (req.files?.avatarPhoto?.[0]) {
        try {
          const buf = await fs.readFile(req.files.avatarPhoto[0].path);
          const mime = req.files.avatarPhoto[0].mimetype || 'image/jpeg';
          avatarDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
        } catch (e) {
          console.warn('[createCV] Đọc ảnh chân dung thất bại:', e.message);
        }
        await fs.unlink(req.files.avatarPhoto[0].path).catch(() => {});
      }
      if (!avatarDataUrl && rawData.avatarBase64 && typeof rawData.avatarBase64 === 'string' && rawData.avatarBase64.startsWith('data:image/')) {
        avatarDataUrl = rawData.avatarBase64;
      }

      await saveCvAvatarForSnapshot(cv, dateTime, avatarDataUrl, backendRoot, uploadDir);

      const templateList = resolveTemplateListForCreatePipeline(rawData, identity);
      const skipPdfGeneration = shouldSkipPdfGeneration(rawData);

      if (!skipPdfGeneration) {
        if (s3Enabled()) {
          for (const { cvTemplate: tpl, dir: templateDir } of templateList) {
            try {
              const rirekishoBuffer = await generateCvRirekishoPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
              if (rirekishoBuffer) {
                const key = buildCvTemplateFileKey(cv.id, dateTime, templateDir, 'cv-rirekisho.pdf');
                await uploadBufferToS3(rirekishoBuffer, key, 'application/pdf');
              }
              const shokumuBuffer = await generateCvShokumuPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
              if (shokumuBuffer) {
                const key = buildCvTemplateFileKey(cv.id, dateTime, templateDir, 'cv-shokumu.pdf');
                await uploadBufferToS3(shokumuBuffer, key, 'application/pdf');
              }
            } catch (e) {
              console.warn(`[createCV] PDF ${templateDir} thất bại:`, e.message);
            }
          }
          cv.curriculumVitae = buildCvTemplateFolderKey(cv.id, dateTime);
        } else {
          const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
          const tplDir = path.join(snapshotDir, 'CV_Template');
          for (const { cvTemplate: tpl, dir: templateDir } of templateList) {
            const subDir = path.join(tplDir, templateDir);
            await fs.mkdir(subDir, { recursive: true });
            try {
              const rirekishoBuffer = await generateCvRirekishoPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
              if (rirekishoBuffer) await fs.writeFile(path.join(subDir, 'cv-rirekisho.pdf'), rirekishoBuffer);
              const shokumuBuffer = await generateCvShokumuPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
              if (shokumuBuffer) await fs.writeFile(path.join(subDir, 'cv-shokumu.pdf'), shokumuBuffer);
            } catch (e) {
              console.warn(`[createCV] PDF ${templateDir} thất bại:`, e.message);
            }
          }
          cv.curriculumVitae = path.relative(backendRoot, tplDir);
        }
      }
      if (cv.curriculumVitae) {
        await cv.save();
        await cv.reload();
      }
    } catch (pdfErr) {
      console.warn('[createCV] Không thể tạo PDF template (Rirekisho/Shokumu):', pdfErr.message);
    }
  } else if (req.files?.avatarPhoto?.[0]) {
    await fs.unlink(req.files.avatarPhoto[0].path).catch(() => {});
  }

  if (!duplicateInfo) {
    cv.isParse = true;
    cv.completionState = CV_COMPLETION_STATE.READY_FOR_PARSE;
    cv.vectorSyncStatus = 'vector_pending';
    cv.vectorSyncRequestedAt = new Date();
    cv.vectorSyncCompletedAt = null;
    cv.vectorSyncLastError = null;
    await cv.save();
    await enqueueCvVectorSync(cv.id);
    await cv.reload();
  }

  const responseData = {
    success: true,
    message: 'Tạo CV thành công',
    data: { cv: normalizeCvDetailResponse(cv) }
  };

  if (duplicateResult) {
    responseData.data.duplicateInfo = {
      isDuplicate: duplicateResult.isDuplicate,
      duplicateWithCvId: duplicateResult.duplicateWithCvId,
      message: duplicateResult.message,
      ownership: duplicateOwnershipInfo?.ownership || 'unknown',
      blocked: false
    };
    if (duplicateResult.isDuplicate) {
      responseData.message = 'Hồ sơ bạn tạo đã trùng với hồ sơ khác trong hệ thống. Hãy kiểm tra hoặc liên lạc với admin để được trợ giúp';
    }
  } else {
    responseData.data.duplicateInfo = {
      isDuplicate: false,
      ownership: 'valid',
      blocked: false
    };
  }

  res.status(201).json(responseData);
}

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * CV Management Controller (CTV)
 * CTV chỉ có thể quản lý CV của chính họ
 */
export const cvController = {
  /**
   * Get list of CVs (only own CVs)
   * GET /api/ctv/cvs
   */
  getCVs: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        sortBy = 'id',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        collaboratorId: req.collaborator.id // Chỉ lấy CV của CTV này
      };

      // Search: trường CV + SĐT + furigana + ứng viên (đồng bộ với admin)
      if (search && String(search).trim()) {
        const q = String(search).trim();
        const like = `%${q}%`;
        const esc = sequelize.escape(like);
        where[Op.or] = [
          { name: { [Op.like]: like } },
          { email: { [Op.like]: like } },
          { phone: { [Op.like]: like } },
          { code: { [Op.like]: like } },
          { furigana: { [Op.like]: like } },
          sequelize.literal(
            `EXISTS (SELECT 1 FROM applicants AS ap WHERE ap.id = \`CVStorage\`.applicant_id AND ap.deleted_at IS NULL AND (ap.name LIKE ${esc} OR ap.email LIKE ${esc} OR ap.phone LIKE ${esc}))`
          )
        ];
      }

      // Filter by status (supports comma-separated: "1,4")
      if (status !== undefined && status !== '') {
        const parts = String(status).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n !== CV_STATUS_CREATE_FAILED);
        if (parts.length === 1) {
          where.status = parts[0];
        } else if (parts.length > 1) {
          where.status = { [Op.in]: parts };
        }
      } else {
        // CTV không hiển thị hồ sơ khởi tạo thất bại trên danh sách mặc định
        where.status = { [Op.not]: CV_STATUS_CREATE_FAILED };
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'createdAt', 'updatedAt', 'name', 'code'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await CVStorage.findAndCountAll({
        where,
        include: [
          {
            model: Applicant,
            as: 'applicant',
            required: false,
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: JobCategory,
            as: 'jobCategory',
            required: false,
            attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug', 'parentId']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Get applications count and latest status for each CV using Sequelize model
      const cvCodes = rows.map(cv => cv.code).filter(code => code); // Filter out null/undefined codes
      let countMap = {};
      let latestStatusMap = {};
      
      if (cvCodes.length > 0) {
        // Count job applications grouped by cvCode using Sequelize
        const applications = await JobApplication.findAll({
          attributes: [
            'cvCode',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            cvCode: {
              [Op.in]: cvCodes
            }
          },
          group: ['cvCode'],
          raw: true,
          paranoid: true // Only count non-deleted records
        });
        
        // Build count map
        applications.forEach((item) => {
          if (item.cvCode) {
            countMap[item.cvCode] = parseInt(item.count) || 0;
          }
        });

        // Get latest application status for each CV
        // Use a subquery approach to get the most recent application for each CV
        for (const cvCode of cvCodes) {
          const latestApp = await JobApplication.findOne({
            where: {
              cvCode: cvCode,
              status: {
                [Op.not]: null
              }
            },
            order: [['updated_at', 'DESC']],
            attributes: ['status'],
            raw: true,
            paranoid: true
          });
          
          if (latestApp) {
            latestStatusMap[cvCode] = latestApp.status;
          }
        }
      }

      // Attach applications count and latest status to each CV
      const cvsWithCount = rows.map(cv => {
        const cvData = cv.toJSON();
        cvData.applicationsCount = countMap[cv.code] || 0;
        cvData.latestApplicationStatus = latestStatusMap[cv.code] || null;
        return cvData;
      });

      res.json({
        success: true,
        data: {
          cvs: cvsWithCount,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy URL xem/tải file CV (chỉ CV của chính CTV)
   * GET /api/ctv/cvs/:id/view-url?fileType=curriculumVitae&purpose=view|download
   */
  getCVFileUrl: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae', purpose = 'view', template, document, index } = req.query;

      const cv = await CVStorage.findOne({
        where: { id, collaboratorId: req.collaborator.id }
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập'
        });
      }

      const backendRoot = path.join(__dirname, '../../../');
      const resolved = await resolveCvFileForView(cv, fileType, { template, document, index }, backendRoot);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }
      const filePath = resolved.pathOrKey;

      if (resolved.isS3) {
        const disposition = purpose === 'download' ? makeDownloadDisposition(path.basename(filePath).replace(/^[a-f0-9-]+_/i, '') || 'download') : null;
        const url = await getSignedUrlForFile(filePath, purpose, disposition);
        if (url) return res.json({ success: true, data: { url } });
        return res.status(503).json({
          success: false,
          message: 'File lưu trên S3. Vui lòng cấu hình AWS S3 (bucket, keyPrefix, credentials) trong .env.'
        });
      }

      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return res.json({ success: true, data: { url: filePath } });
      }
      const apiBase = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
      const pathPart = (filePath.startsWith('/') ? filePath : `/${filePath}`).replace(/\/+/g, '/');
      res.json({ success: true, data: { url: `${apiBase}${pathPart}` } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/applicant/cvs/:id/view-url — cùng logic getCVFileUrl, CV thuộc ứng viên đăng nhập
   */
  getCVFileUrlAsApplicant: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae', purpose = 'view', template, document, index } = req.query;

      const cv = await CVStorage.findOne({
        where: { id, applicantId: req.applicant.id }
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập'
        });
      }

      const backendRoot = path.join(__dirname, '../../../');
      const resolved = await resolveCvFileForView(cv, fileType, { template, document, index }, backendRoot);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }
      const filePath = resolved.pathOrKey;

      if (resolved.isS3) {
        const disposition = purpose === 'download' ? makeDownloadDisposition(path.basename(filePath).replace(/^[a-f0-9-]+_/i, '') || 'download') : null;
        const url = await getSignedUrlForFile(filePath, purpose, disposition);
        if (url) return res.json({ success: true, data: { url } });
        return res.status(503).json({
          success: false,
          message: 'File lưu trên S3. Vui lòng cấu hình AWS S3 (bucket, keyPrefix, credentials) trong .env.'
        });
      }

      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return res.json({ success: true, data: { url: filePath } });
      }
      const apiBase = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
      const pathPart = (filePath.startsWith('/') ? filePath : `/${filePath}`).replace(/\/+/g, '/');
      res.json({ success: true, data: { url: `${apiBase}${pathPart}` } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Stream file content (proxy) để frontend preview DOCX/DOC/XLSX. Chỉ CV của chính CTV.
   * GET /api/ctv/cvs/:id/file-content?fileType=curriculumVitae
   */
  getCVFileContent: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae', template, document, index } = req.query;

      const cv = await CVStorage.findOne({
        where: { id, collaboratorId: req.collaborator.id }
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập'
        });
      }

      const backendRoot = path.resolve(__dirname, '../../../');
      const resolved = await resolveCvFileForView(cv, fileType, { template, document, index }, backendRoot);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }
      const filePath = resolved.pathOrKey;

      const mime = mimeFromCvFilePath(filePath);

      if (resolved.isS3) {
        const obj = await getObjectStream(filePath);
        if (!obj || !obj.Body) {
          return res.status(503).json({
            success: false,
            message: 'Không đọc được file từ S3.'
          });
        }
        res.setHeader('Content-Type', obj.ContentType || mime);
        res.setHeader('Cache-Control', 'private, max-age=300');
        obj.Body.pipe(res);
        return;
      }

      const fullPath = path.join(backendRoot, filePath.replace(/^\//, ''));
      try {
        await fs.access(fullPath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại trên server'
        });
      }
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'private, max-age=300');
      const stream = createReadStream(fullPath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/applicant/cvs/:id/file-content — CV thuộc ứng viên đăng nhập
   */
  getCVFileContentAsApplicant: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae', template, document, index } = req.query;

      const cv = await CVStorage.findOne({
        where: { id, applicantId: req.applicant.id }
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập'
        });
      }

      const backendRoot = path.resolve(__dirname, '../../../');
      const resolved = await resolveCvFileForView(cv, fileType, { template, document, index }, backendRoot);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }
      const filePath = resolved.pathOrKey;

      const mime = mimeFromCvFilePath(filePath);

      if (resolved.isS3) {
        const obj = await getObjectStream(filePath);
        if (!obj || !obj.Body) {
          return res.status(503).json({
            success: false,
            message: 'Không đọc được file từ S3.'
          });
        }
        res.setHeader('Content-Type', obj.ContentType || mime);
        res.setHeader('Cache-Control', 'private, max-age=300');
        obj.Body.pipe(res);
        return;
      }

      const fullPath = path.join(backendRoot, filePath.replace(/^\//, ''));
      try {
        await fs.access(fullPath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại trên server'
        });
      }
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'private, max-age=300');
      const stream = createReadStream(fullPath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  },

  /**
   * List all CV files (originals + templates) with view/download URLs for detail UI
   * GET /api/ctv/cvs/:id/cv-file-list
   */
  getCVFileList: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cv = await CVStorage.findOne({
        where: { id, collaboratorId: req.collaborator.id }
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập'
        });
      }
      const { originals, templates } = await buildCvFileListPayload(cv, req);
      return res.json({ success: true, data: { originals, templates } });
    } catch (error) {
      next(error);
    }
  },

  getCVFileListAsApplicant: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cv = await CVStorage.findOne({
        where: { id, applicantId: req.applicant.id }
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập'
        });
      }
      const { originals, templates } = await buildCvFileListPayload(cv, req);
      return res.json({ success: true, data: { originals, templates } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List snapshots for a CV (dateTime folders).
   * GET /api/ctv/cvs/:id/snapshots?limit=20
   */
  getCVSnapshots: async (req, res, next) => {
    try {
      const { id } = req.params;
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));

      const cv = await CVStorage.findOne({
        where: { id, collaboratorId: req.collaborator.id }
      });
      if (!cv) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập' });
      }

      let dateTimes = [];
      if (s3Enabled()) {
        dateTimes = await listCvSnapshotDateTimes(cv.id);
      } else {
        const cvRoot = path.join(uploadDir, String(cv.id));
        try {
          const entries = await fs.readdir(cvRoot, { withFileTypes: true });
          dateTimes = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();
        } catch {
          dateTimes = [];
        }
      }
      dateTimes = dateTimes.slice(0, limit);

      const backendRoot = path.join(__dirname, '../../../');
      const snapshots = [];
      for (const dateTime of dateTimes) {
        const originals = [];
        const templates = { Common: {}, IT: {}, Technical: {} };
        let originalFolderPath = null;
        let templateFolderPath = null;

        if (s3Enabled()) {
          const origFolder = buildCvOriginalFolderKey(cv.id, dateTime);
          originalFolderPath = origFolder;
          templateFolderPath = buildCvTemplateFolderKey(cv.id, dateTime);
          const keys = await listKeysUnderPrefix(origFolder);
          keys.sort();
          for (const key of keys) {
            const name = path.basename(key);
            const viewUrl = await getSignedUrlForFile(key, 'view');
            const downloadUrl = await getSignedUrlForFile(key, 'download', makeDownloadDisposition(name));
            originals.push({ name, viewUrl, downloadUrl });
          }

          for (const tpl of ['Common', 'IT', 'Technical']) {
            for (const doc of ['rirekisho', 'shokumu']) {
              const fileName = `cv-${doc}.pdf`;
              const key = buildCvTemplateFileKey(cv.id, dateTime, tpl, fileName);
              const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: tpl, document: doc });
              const viewUrl = await getSignedUrlForFile(key, 'view');
              const downloadUrl = await getSignedUrlForFile(key, 'download', makeDownloadDisposition(downloadFileName));
              templates[tpl][doc] = { viewUrl, downloadUrl, fileName: downloadFileName };
            }
          }
        } else {
          const snapshotRoot = path.join(uploadDir, String(cv.id), dateTime);
          const origDir = path.join(snapshotRoot, 'CV_original');
          originalFolderPath = path.relative(backendRoot, origDir).replace(/\\/g, '/');
          templateFolderPath = path.relative(backendRoot, path.join(snapshotRoot, 'CV_Template')).replace(/\\/g, '/');
          try {
            const files = await fs.readdir(origDir);
            files.sort();
            for (const f of files) {
              const rel = path.relative(path.join(__dirname, '../../../'), path.join(origDir, f)).replace(/\\/g, '/');
              const url = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '') + '/' + rel.replace(/^\/+/, '');
              originals.push({ name: f, viewUrl: url, downloadUrl: url });
            }
          } catch {}

          for (const tpl of ['Common', 'IT', 'Technical']) {
            for (const doc of ['rirekisho', 'shokumu']) {
              const fileName = `cv-${doc}.pdf`;
              const full = path.join(snapshotRoot, 'CV_Template', tpl, fileName);
              const rel = path.relative(path.join(__dirname, '../../../'), full).replace(/\\/g, '/');
              const url = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '') + '/' + rel.replace(/^\/+/, '');
              const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: tpl, document: doc });
              templates[tpl][doc] = { viewUrl: url, downloadUrl: url, fileName: downloadFileName };
            }
          }
        }

        snapshots.push({
          dateTime,
          originalFolderPath,
          templateFolderPath,
          originals,
          templates,
          zip: {
            original: `/api/ctv/cvs/${cv.id}/download-zip?scope=original&template=all&dateTime=${encodeURIComponent(dateTime)}`,
            templateAll: `/api/ctv/cvs/${cv.id}/download-zip?scope=template&template=all&dateTime=${encodeURIComponent(dateTime)}`,
            templateCommon: `/api/ctv/cvs/${cv.id}/download-zip?scope=template&template=Common&dateTime=${encodeURIComponent(dateTime)}`,
            templateIT: `/api/ctv/cvs/${cv.id}/download-zip?scope=template&template=IT&dateTime=${encodeURIComponent(dateTime)}`,
            templateTechnical: `/api/ctv/cvs/${cv.id}/download-zip?scope=template&template=Technical&dateTime=${encodeURIComponent(dateTime)}`,
          }
        });
      }

      return res.json({ success: true, data: { snapshots } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Rollback CV về một snapshot cũ: copy toàn bộ snapshot đó sang snapshot mới (dateTime mới) và cập nhật DB.
   * POST /api/ctv/cvs/:id/rollback
   * Body: { srcDateTime: "YYYY-MM-DD_HH-mm-ss" }
   */
  rollbackCV: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { srcDateTime } = req.body || {};
      if (!srcDateTime || typeof srcDateTime !== 'string') {
        return res.status(400).json({ success: false, message: 'Thiếu srcDateTime (YYYY-MM-DD_HH-mm-ss)' });
      }

      const cv = await CVStorage.findOne({
        where: { id, collaboratorId: req.collaborator.id }
      });
      if (!cv) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập' });
      }

      const backendRoot = path.join(__dirname, '../../../');
      let dateTimes = [];
      if (s3Enabled()) {
        dateTimes = await listCvSnapshotDateTimes(cv.id);
      } else {
        const cvRoot = path.join(uploadDir, String(cv.id));
        try {
          const entries = await fs.readdir(cvRoot, { withFileTypes: true });
          dateTimes = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();
        } catch {
          dateTimes = [];
        }
      }
      if (!dateTimes.includes(srcDateTime)) {
        return res.status(400).json({ success: false, message: 'Snapshot không tồn tại hoặc không thuộc CV này' });
      }

      const newDateTime = getCvSnapshotDateTime();

      if (s3Enabled()) {
        const srcOriginalKey = buildCvOriginalFolderKey(cv.id, srcDateTime);
        const srcTemplateKey = buildCvTemplateFolderKey(cv.id, srcDateTime);
        cv.cvOriginalPath = await copyCvOriginalsToNewSnapshot(cv.id, newDateTime, srcOriginalKey);
        cv.curriculumVitae = await copyCvTemplatesToNewSnapshot(cv.id, newDateTime, srcTemplateKey);
      } else {
        const baseDir = path.join(backendRoot, config.upload.dir, 'cvs', String(cv.id));
        const srcDir = path.join(baseDir, srcDateTime);
        const destDir = path.join(baseDir, newDateTime);
        await fs.cp(srcDir, destDir, { recursive: true });
        cv.cvOriginalPath = path.relative(backendRoot, path.join(destDir, 'CV_original'));
        cv.curriculumVitae = path.relative(backendRoot, path.join(destDir, 'CV_Template'));
      }

      await cv.save();
      return res.json({ success: true, data: { newDateTime, message: 'Đã rollback CV về snapshot đã chọn' } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download zip for CV_original or CV_Template (single template or all).
   * GET /api/ctv/cvs/:id/download-zip?scope=original|template&template=Common|IT|Technical|all
   */
  downloadCVZip: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cv = await CVStorage.findOne({
        where: { id, collaboratorId: req.collaborator.id }
      });
      if (!cv) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập' });
      }
      await streamCvZipResponse(cv, req, res, next);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/applicant/cvs/:id/download-zip — cùng query như CTV
   */
  downloadCVZipAsApplicant: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cv = await CVStorage.findOne({
        where: { id, applicantId: req.applicant.id }
      });
      if (!cv) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập' });
      }
      await streamCvZipResponse(cv, req, res, next);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get CV by ID (only own CV)
   * GET /api/ctv/cvs/:id
   */
  getCVById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const cv = await CVStorage.findOne({
        where: {
          id,
          collaboratorId: req.collaborator.id
        },
        include: [
          {
            model: JobCategory,
            as: 'jobCategory',
            required: false,
            attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug', 'parentId']
          }
        ]
      });

      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập'
        });
      }

      // Get applications count
      const applicationsCount = await JobApplication.count({
        where: { cvCode: cv.code }
      });

      const cvData = normalizeCvDetailResponse(cv);
      cvData.applicationsCount = applicationsCount;

      res.json({
        success: true,
        data: { cv: cvData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * CTV xác nhận hồ sơ đã sẵn sàng parse/vector sau quick-create.
   * POST /api/ctv/cvs/:id/mark-ready-for-parse
   */
  markReadyForParse: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cv = await CVStorage.findOne({
        where: {
          id,
          collaboratorId: req.collaborator.id
        }
      });

      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập'
        });
      }

      cv.isParse = true;
      cv.completionState = CV_COMPLETION_STATE.READY_FOR_PARSE;
      cv.vectorSyncStatus = 'vector_pending';
      cv.vectorSyncRequestedAt = new Date();
      cv.vectorSyncCompletedAt = null;
      cv.vectorSyncLastError = null;
      await cv.save();

      await enqueueCvVectorSync(cv.id);
      await cv.reload();

      return res.json({
        success: true,
        message: 'Hồ sơ đã được đánh dấu sẵn sàng parse',
        data: { cv: normalizeCvDetailResponse(cv) }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * CTV gửi duyệt bổ sung — tạo thông báo cho admin (admin_note hoặc admin_id trên hồ sơ).
   * POST /api/ctv/cvs/:id/submit-supplement-review
   */
  submitSupplementReview: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cv = await CVStorage.findOne({
        where: { id, collaboratorId: req.collaborator.id }
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền truy cập'
        });
      }
      let marks = cv.adminSupplementMarks;
      if (typeof marks === 'string') {
        try {
          marks = JSON.parse(marks);
        } catch {
          marks = [];
        }
      }
      if (!Array.isArray(marks) || marks.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Chưa có đánh dấu bổ sung từ admin — không thể gửi duyệt.'
        });
      }
      const adminId =
        cv.adminNote != null && cv.adminNote !== ''
          ? Number(cv.adminNote)
          : cv.adminId != null
            ? Number(cv.adminId)
            : null;
      if (!adminId || Number.isNaN(adminId)) {
        return res.status(400).json({
          success: false,
          message:
            'Không xác định được admin nhận duyệt. Hồ sơ cần gán admin phụ trách hoặc admin cần gửi yêu cầu bổ sung trước.'
        });
      }
      await collaboratorNotificationService.notifyAdminCtvSupplementReviewSubmitted({
        adminId,
        cvId: cv.id,
        candidateName: cv.name || cv.code
      });
      try {
        await injectVisitorMessageForCollaborator({
          collaboratorId: req.collaborator.id,
          body: 'CTV đã bổ sung xong, Admin vui lòng check'
        });
      } catch (e) {
        console.error('[submitSupplementReview] public CTV chat:', e?.message || e);
      }
      res.json({
        success: true,
        message: 'Đã gửi thông báo duyệt bổ sung tới admin.'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new CV
   * POST /api/ctv/cvs
   */
  createCV: async (req, res, next) => {
    try {
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        try {
          await processCreateCvPipeline(req, res, {
            collaboratorId: req.collaborator.id,
            applicantId: null,
            adminId: null
          });
        } catch (error) {
          // Delete uploaded files if CV creation fails
          if (req.files?.cvFile) {
            for (const f of req.files.cvFile) await fs.unlink(f.path).catch(() => {});
          }
          if (req.files?.avatarPhoto?.[0]) await fs.unlink(req.files.avatarPhoto[0].path).catch(() => {});
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Tạo CV (ứng viên đăng nhập) — cùng pipeline snapshot + PDF như CTV.
   * POST /api/applicant/cvs
   */
  createCVAsApplicant: async (req, res, next) => {
    try {
      const superAdminId = await getSuperAdminIdForApplicantCv();
      if (!superAdminId) {
        return res.status(500).json({
          success: false,
          message: 'Không tìm thấy tài khoản super_admin để gán hồ sơ'
        });
      }
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        try {
          await processCreateCvPipeline(req, res, {
            collaboratorId: null,
            applicantId: req.applicant.id,
            adminId: superAdminId
          });
        } catch (error) {
          if (req.files?.cvFile) {
            for (const f of req.files.cvFile) await fs.unlink(f.path).catch(() => {});
          }
          if (req.files?.avatarPhoto?.[0]) await fs.unlink(req.files.avatarPhoto[0].path).catch(() => {});
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update CV (only own CV)
   * PUT /api/ctv/cvs/:id
   */
  updateCV: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if CV exists and belongs to this collaborator
      const cv = await CVStorage.findByPk(id);
      if (!cv || cv.collaboratorId !== req.collaborator.id) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền chỉnh sửa'
        });
      }

      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        try {
          const rawData = req.body;

          // Map frontend fields (nameKanji, nameKana, address, ...) sang model (name, furigana, addressCurrent, ...) giống createCV
          const mappedData = {
            name: rawData.nameKanji !== undefined ? (rawData.nameKanji || null) : undefined,
            furigana: rawData.nameKana !== undefined ? (rawData.nameKana || null) : undefined,
            email: rawData.email !== undefined ? (rawData.email || null) : undefined,
            phone: rawData.phone !== undefined ? (rawData.phone || null) : undefined,
            postalCode: rawData.postalCode !== undefined ? (rawData.postalCode || null) : undefined,
            addressCurrent: rawData.address !== undefined ? (rawData.address || null) : (rawData.addressCurrent !== undefined ? (rawData.addressCurrent || null) : undefined),
            birthDate: rawData.birthDate !== undefined ? (rawData.birthDate || null) : undefined,
            ages: rawData.age !== undefined ? (rawData.age || rawData.ages || null) : (rawData.ages !== undefined ? (rawData.ages || null) : undefined),
            gender: rawData.gender !== undefined ? (rawData.gender === '男' || rawData.gender === '1' ? 1 : rawData.gender === '女' || rawData.gender === '2' ? 2 : null) : undefined,
            educations: rawData.educations !== undefined
              ? (typeof rawData.educations === 'string' ? (rawData.educations.trim() ? JSON.parse(rawData.educations) : null) : Array.isArray(rawData.educations) ? rawData.educations : null)
              : undefined,
            workExperiences: rawData.workExperiences !== undefined
              ? (typeof rawData.workExperiences === 'string' ? (rawData.workExperiences.trim() ? JSON.parse(rawData.workExperiences) : null) : Array.isArray(rawData.workExperiences) ? rawData.workExperiences : null)
              : undefined,
            certificates: rawData.certificates !== undefined
              ? (typeof rawData.certificates === 'string' ? (rawData.certificates.trim() ? JSON.parse(rawData.certificates) : null) : Array.isArray(rawData.certificates) ? rawData.certificates : null)
              : undefined,
            technicalSkills: rawData.technicalSkills !== undefined ? (rawData.technicalSkills || null) : undefined,
            careerSummary: rawData.careerSummary !== undefined ? (rawData.careerSummary || null) : undefined,
            strengths: rawData.strengths !== undefined ? (rawData.strengths || null) : undefined,
            motivation: rawData.motivation !== undefined ? (rawData.motivation || null) : undefined,
            currentIncome: rawData.currentSalary !== undefined ? (parseInt(String(rawData.currentSalary).replace(/[^\d]/g, ''), 10) || null) : undefined,
            desiredIncome: rawData.desiredSalary !== undefined ? (parseInt(String(rawData.desiredSalary).replace(/[^\d]/g, ''), 10) || null) : undefined,
            desiredWorkLocation: rawData.desiredLocation !== undefined ? (rawData.desiredLocation || rawData.desiredWorkLocation || null) : (rawData.desiredWorkLocation !== undefined ? (rawData.desiredWorkLocation || null) : undefined),
            desiredPosition: rawData.desiredPosition !== undefined ? (rawData.desiredPosition || null) : undefined,
            nyushaTime: rawData.desiredStartDate !== undefined ? (rawData.desiredStartDate || rawData.nyushaTime || null) : (rawData.nyushaTime !== undefined ? (rawData.nyushaTime || null) : undefined),
            addressOrigin: rawData.addressOrigin !== undefined ? (rawData.addressOrigin || null) : undefined,
            passport: rawData.passport !== undefined ? (rawData.passport !== '' && rawData.passport != null ? parseInt(rawData.passport, 10) : null) : undefined,
            currentResidence: rawData.currentResidence !== undefined ? (rawData.currentResidence !== '' && rawData.currentResidence != null ? parseInt(rawData.currentResidence, 10) : null) : undefined,
            jpResidenceStatus: rawData.jpResidenceStatus !== undefined ? (rawData.jpResidenceStatus !== '' && rawData.jpResidenceStatus != null ? parseInt(rawData.jpResidenceStatus, 10) : null) : undefined,
            visaExpirationDate: rawData.visaExpirationDate !== undefined ? (rawData.visaExpirationDate || null) : undefined,
            otherCountry: rawData.otherCountry !== undefined ? (rawData.otherCountry || null) : undefined,
            spouse: rawData.spouse !== undefined ? (rawData.spouse !== '' && rawData.spouse != null ? parseInt(rawData.spouse, 10) : null) : undefined,
            interviewTime: rawData.interviewTime !== undefined ? (rawData.interviewTime || null) : undefined,
            learnedTools: rawData.learnedTools !== undefined ? (typeof rawData.learnedTools === 'string' ? (rawData.learnedTools.trim() ? JSON.parse(rawData.learnedTools) : null) : rawData.learnedTools) : undefined,
            experienceTools: rawData.experienceTools !== undefined ? (typeof rawData.experienceTools === 'string' ? (rawData.experienceTools.trim() ? JSON.parse(rawData.experienceTools) : null) : rawData.experienceTools) : undefined,
            jlptLevel: rawData.jlptLevel !== undefined ? (rawData.jlptLevel !== '' && rawData.jlptLevel != null ? parseInt(rawData.jlptLevel, 10) : null) : undefined,
            experienceYears: rawData.experienceYears !== undefined ? (rawData.experienceYears !== '' && rawData.experienceYears != null ? parseInt(rawData.experienceYears, 10) : null) : undefined,
            specialization: rawData.specialization !== undefined ? (rawData.specialization !== '' && rawData.specialization != null ? parseInt(rawData.specialization, 10) : null) : undefined,
            qualification: rawData.qualification !== undefined ? (rawData.qualification !== '' && rawData.qualification != null ? parseInt(rawData.qualification, 10) : null) : undefined,
            otherDocuments: rawData.otherDocuments !== undefined ? (rawData.otherDocuments || null) : undefined,
            notes: rawData.notes !== undefined ? (rawData.notes || null) : undefined,
            cvTableLayout: rawData.cvTableLayout !== undefined
              ? parseCvTableLayoutFromRequest(rawData.cvTableLayout)
              : undefined,
            jobCategoryId:
              rawData.jobCategoryId !== undefined || rawData.job_category_id !== undefined
                ? parseJobCategoryIdFromBody(rawData)
                : undefined,
          };
          if (mappedData.jobCategoryId !== undefined) {
            if (mappedData.jobCategoryId != null && !(await jobCategoryIdExists(mappedData.jobCategoryId))) {
              return res.status(400).json({
                success: false,
                message: 'Không tìm thấy danh mục công việc'
              });
            }
          }

          let nextName = cv.name;
          let nextEmail = cv.email;
          let nextPhone = cv.phone;
          if (mappedData.name !== undefined) nextName = mappedData.name;
          if (mappedData.email !== undefined) nextEmail = mappedData.email;
          if (mappedData.phone !== undefined) nextPhone = mappedData.phone;
          let duplicateInfo = null;
          if (nextEmail || nextPhone) {
            const conflict = await findCanonicalDuplicateConflictForUpdate(cv.id, nextName, nextEmail, nextPhone);
            if (conflict) {
              const allowDuplicate = String(rawData.allowDuplicate || '').trim() === '1';
              duplicateInfo = {
                isDuplicate: true,
                duplicateWithCvId: conflict.id,
                blocked: !allowDuplicate,
                reason: 'update_identity_conflict'
              };
              if (!allowDuplicate) {
                return res.status(409).json({
                  success: false,
                  message: 'Email hoặc số điện thoại trùng với hồ sơ hợp lệ khác. Vẫn tiếp tục tạo ?',
                  data: {
                    duplicateInfo
                  }
                });
              }
            }
          }

          // Chỉ gán các field được gửi lên (không overwrite bằng undefined)
          Object.keys(mappedData).forEach(key => {
            if (mappedData[key] !== undefined && key !== 'id' && key !== 'code' && key !== 'collaboratorId') {
              cv[key] = mappedData[key];
            }
          });

          cv.isParse = true;
          cv.completionState = CV_COMPLETION_STATE.READY_FOR_PARSE;
          cv.vectorSyncStatus = 'vector_pending';
          cv.vectorSyncRequestedAt = new Date();
          cv.vectorSyncCompletedAt = null;
          cv.vectorSyncLastError = null;

          if (duplicateInfo) {
            cv.status = CV_STATUS_DUPLICATE;
            cv.isDuplicate = true;
            cv.duplicateWithCvId = duplicateInfo.duplicateWithCvId;
          }

          await cv.save();
          await cv.reload();

          const backendRoot = path.join(__dirname, '../../../');
          const existingAvatarDataUrl = await readExistingAvatarDataUrl(cv, backendRoot);
          const dateTime = getCvSnapshotDateTime();

          if (req.files?.cvFile?.length) {
            try {
              if (s3Enabled()) {
                cv.cvOriginalPath = await uploadCvOriginalsToSnapshot(cv.id, dateTime, req.files.cvFile);
              } else {
                const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
                const origDir = path.join(snapshotDir, 'CV_original');
                await fs.mkdir(origDir, { recursive: true });
                for (let i = 0; i < req.files.cvFile.length; i++) {
                  const f = req.files.cvFile[i];
                  const ext = (f.originalname && path.extname(f.originalname)) ? path.extname(f.originalname) : '.pdf';
                  const dest = path.join(origDir, `cv-original-${i + 1}${ext}`);
                  await fs.copyFile(f.path, dest);
                }
                cv.cvOriginalPath = path.relative(backendRoot, origDir);
              }
              await cv.save();
            } catch (e) {
              console.warn('[Collaborator updateCV] Lưu CV gốc thất bại:', e.message);
            }
            for (const f of req.files.cvFile) await fs.unlink(f.path).catch(() => {});
          } else if (cv.cvOriginalPath) {
            try {
              if (s3Enabled()) {
                if (isFolderPath(cv.cvOriginalPath)) {
                  cv.cvOriginalPath = await copyCvOriginalsToNewSnapshot(cv.id, dateTime, cv.cvOriginalPath);
                } else {
                  cv.cvOriginalPath = await copySingleFileToCvOriginalSnapshot(cv.id, dateTime, cv.cvOriginalPath);
                }
              } else {
                const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
                const origDir = path.join(snapshotDir, 'CV_original');
                await fs.mkdir(origDir, { recursive: true });
                const oldPath = path.join(backendRoot, cv.cvOriginalPath);
                const stat = await fs.stat(oldPath).catch(() => null);
                if (stat?.isFile()) {
                  const ext = path.extname(cv.cvOriginalPath) || '.pdf';
                  await fs.copyFile(oldPath, path.join(origDir, `cv-original-1${ext}`));
                } else if (stat?.isDirectory()) {
                  const entries = await fs.readdir(oldPath);
                  for (let i = 0; i < entries.length; i++) {
                    await fs.copyFile(path.join(oldPath, entries[i]), path.join(origDir, `cv-original-${i + 1}${path.extname(entries[i]) || '.pdf'}`));
                  }
                }
                cv.cvOriginalPath = path.relative(backendRoot, origDir);
              }
              await cv.save();
            } catch (e) {
              console.warn('[Collaborator updateCV] Copy CV gốc sang snapshot mới thất bại:', e.message);
            }
          } else {
            if (s3Enabled()) {
              cv.cvOriginalPath = buildCvOriginalFolderKey(cv.id, dateTime);
            } else {
              const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
              const origDir = path.join(snapshotDir, 'CV_original');
              await fs.mkdir(origDir, { recursive: true });
              cv.cvOriginalPath = path.relative(backendRoot, origDir);
            }
            await cv.save();
          }

          try {
            let avatarDataUrl = '';
            if (req.files?.avatarPhoto?.[0]) {
              try {
                const buf = await fs.readFile(req.files.avatarPhoto[0].path);
                const mime = req.files.avatarPhoto[0].mimetype || 'image/jpeg';
                avatarDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
              } catch (e) {
                console.warn('[Collaborator updateCV] Đọc ảnh chân dung thất bại:', e.message);
              }
              await fs.unlink(req.files.avatarPhoto[0].path).catch(() => {});
            }
            if (!avatarDataUrl && rawData.avatarBase64 && typeof rawData.avatarBase64 === 'string' && rawData.avatarBase64.startsWith('data:image/')) {
              avatarDataUrl = rawData.avatarBase64;
            }
            if (!avatarDataUrl) {
              avatarDataUrl = existingAvatarDataUrl || await readExistingAvatarDataUrl(cv, backendRoot);
            }

            await saveCvAvatarForSnapshot(cv, dateTime, avatarDataUrl, backendRoot, uploadDir);

            const templateList = [
              { cvTemplate: 'common', dir: 'Common' },
              { cvTemplate: 'cv_it', dir: 'IT' },
              { cvTemplate: 'cv_technical', dir: 'Technical' }
            ];
            const skipPdfGeneration = shouldSkipPdfGeneration(rawData);

            if (!skipPdfGeneration) {
              if (s3Enabled()) {
                for (const { cvTemplate: tpl, dir: templateDir } of templateList) {
                  try {
                    const rirekishoBuffer = await generateCvRirekishoPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
                    if (rirekishoBuffer) {
                      const key = buildCvTemplateFileKey(cv.id, dateTime, templateDir, 'cv-rirekisho.pdf');
                      await uploadBufferToS3(rirekishoBuffer, key, 'application/pdf');
                    }
                    const shokumuBuffer = await generateCvShokumuPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
                    if (shokumuBuffer) {
                      const key = buildCvTemplateFileKey(cv.id, dateTime, templateDir, 'cv-shokumu.pdf');
                      await uploadBufferToS3(shokumuBuffer, key, 'application/pdf');
                    }
                  } catch (e) {
                    console.warn(`[Collaborator updateCV] PDF ${templateDir} thất bại:`, e.message);
                  }
                }
                cv.curriculumVitae = buildCvTemplateFolderKey(cv.id, dateTime);
              } else {
                const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
                const tplDir = path.join(snapshotDir, 'CV_Template');
                for (const { cvTemplate: tpl, dir: templateDir } of templateList) {
                  const subDir = path.join(tplDir, templateDir);
                  await fs.mkdir(subDir, { recursive: true });
                  try {
                    const rirekishoBuffer = await generateCvRirekishoPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
                    if (rirekishoBuffer) await fs.writeFile(path.join(subDir, 'cv-rirekisho.pdf'), rirekishoBuffer);
                    const shokumuBuffer = await generateCvShokumuPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
                    if (shokumuBuffer) await fs.writeFile(path.join(subDir, 'cv-shokumu.pdf'), shokumuBuffer);
                  } catch (e) {
                    console.warn(`[Collaborator updateCV] PDF ${templateDir} thất bại:`, e.message);
                  }
                }
                cv.curriculumVitae = path.relative(backendRoot, tplDir);
              }
            }
            if (cv.curriculumVitae) {
              await cv.save();
              await cv.reload();
            }
          } catch (pdfErr) {
            console.warn('[Collaborator updateCV] Không thể tạo PDF template (Rirekisho/Shokumu):', pdfErr.message);
          }

          try {
            await enqueueCvVectorSync(cv.id);
            await cv.reload();
          } catch (vectorError) {
            console.warn('[Collaborator updateCV] Enqueue vector sync failed:', vectorError?.message || vectorError);
          }

          res.json({
            success: true,
            message: 'Cập nhật CV thành công',
            data: { cv: normalizeCvDetailResponse(cv) }
          });
        } catch (error) {
          // Delete uploaded files if update fails
          if (req.files?.cvFile) {
            for (const f of req.files.cvFile) await fs.unlink(f.path).catch(() => {});
          }
          if (req.files?.avatarPhoto?.[0]) await fs.unlink(req.files.avatarPhoto[0].path).catch(() => {});
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete CV (only own CV, soft delete)
   * DELETE /api/ctv/cvs/:id
   */
  deleteCV: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if CV exists and belongs to this collaborator
      const cv = await CVStorage.findByPk(id);
      if (!cv || cv.collaboratorId !== req.collaborator.id) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV hoặc bạn không có quyền xóa'
        });
      }

      // Check if CV has applications
      const applicationsCount = await JobApplication.count({
        where: { cvCode: cv.code }
      });

      if (applicationsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa CV vì đã có ${applicationsCount} đơn ứng tuyển liên quan`
        });
      }

      // Soft delete
      await cv.destroy();

      res.json({
        success: true,
        message: 'Xóa CV thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get CV statistics and list
   * GET /api/ctv/cvs/statistics
   * Trả về danh sách CV và thống kê đơn ứng tuyển
   */
  getCVStatistics: async (req, res, next) => {
    try {
      const collaboratorId = req.collaborator.id;

      // Lấy danh sách CV của CTV này
      const cvs = await CVStorage.findAll({
        where: {
          collaboratorId: collaboratorId
        },
        attributes: ['id', 'code', 'name', 'email', 'phone', 'status', 'createdAt', 'updatedAt'],
        order: [['created_at', 'DESC']]
      });

      // Đếm tổng số đơn ứng tuyển đã tạo
      const totalApplications = await JobApplication.count({
        where: {
          collaboratorId: collaboratorId
        }
      });

      // Đếm số đơn đã đến vòng phỏng vấn (status = 4)
      const interviewedApplications = await JobApplication.count({
        where: {
          collaboratorId: collaboratorId,
          status: 4
        }
      });

      // Đếm số đơn đã được tuyển (status = 8)
      const hiredApplications = await JobApplication.count({
        where: {
          collaboratorId: collaboratorId,
          status: 8
        }
      });

      res.json({
        success: true,
        data: {
          cvs: cvs.map(cv => cv.toJSON()),
          statistics: {
            totalCVs: cvs.length,
            totalApplications: totalApplications,
            interviewedApplications: interviewedApplications,
            hiredApplications: hiredApplications
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get recently updated CVs (sorted by updatedAt DESC)
   * GET /api/ctv/cvs/recent
   */
  getRecentCVs: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        isDuplicate,
        sortBy = 'updatedAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        collaboratorId: req.collaborator.id // Chỉ lấy CV của CTV này
      };

      // Search: trường CV + SĐT + furigana + ứng viên (đồng bộ với admin)
      if (search && String(search).trim()) {
        const q = String(search).trim();
        const like = `%${q}%`;
        const esc = sequelize.escape(like);
        where[Op.or] = [
          { name: { [Op.like]: like } },
          { email: { [Op.like]: like } },
          { phone: { [Op.like]: like } },
          { code: { [Op.like]: like } },
          { furigana: { [Op.like]: like } },
          sequelize.literal(
            `EXISTS (SELECT 1 FROM applicants AS ap WHERE ap.id = \`CVStorage\`.applicant_id AND ap.deleted_at IS NULL AND (ap.name LIKE ${esc} OR ap.email LIKE ${esc} OR ap.phone LIKE ${esc}))`
          )
        ];
      }

      // Filter by duplicate status
      if (isDuplicate !== undefined) {
        where.isDuplicate = isDuplicate === '1' || isDuplicate === 'true';
      }

      // CTV không hiển thị hồ sơ khởi tạo thất bại trên danh sách mặc định
      if (where.status === undefined) {
        where.status = { [Op.not]: CV_STATUS_CREATE_FAILED };
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'createdAt', 'updatedAt', 'name', 'code'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'updatedAt';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause - always prioritize updatedAt DESC
      const orderClause = [['updated_at', 'DESC']];
      if (sortField !== 'updatedAt') {
        orderClause.push([dbSortField, orderDirection]);
      }
      orderClause.push(['id', 'DESC']);

      const { count, rows } = await CVStorage.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Get applications count for each CV
      const cvCodes = rows.map(cv => cv.code).filter(code => code);
      let countMap = {};
      
      if (cvCodes.length > 0) {
        const applications = await JobApplication.findAll({
          attributes: [
            'cvCode',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            cvCode: {
              [Op.in]: cvCodes
            }
          },
          group: ['cvCode'],
          raw: true,
          paranoid: true
        });
        
        applications.forEach((item) => {
          if (item.cvCode) {
            countMap[item.cvCode] = parseInt(item.count) || 0;
          }
        });
      }

      // Attach applications count to each CV
      const cvsWithCount = rows.map(cv => {
        const cvData = cv.toJSON();
        cvData.applicationsCount = countMap[cv.code] || 0;
        return cvData;
      });

      res.json({
        success: true,
        data: {
          cvs: cvsWithCount,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Kiểm tra CV trùng (name, email, phone)
   * POST /api/ctv/cvs/check-duplicate
   * Body: { name?, nameKanji?, email?, phone? }
   */
  checkDuplicate: async (req, res, next) => {
    try {
      const { name, nameKanji, email, phone } = req.body || {};
      const cvName = (name || nameKanji || '').trim();
      const cvEmail = (email || '').trim();
      const cvPhone = (phone || '').trim();
      const duplicate = await checkDuplicateCV(cvName, cvEmail, cvPhone);
      res.json({
        success: true,
        data: { isDuplicate: !!duplicate }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Preview CV template HTML (khi tạo/sửa UV – CTV cũng cần xem form xuất ra)
   * POST /api/ctv/cvs/preview
   */
  previewCVTemplate: async (req, res, next) => {
    try {
      const { cvData, avatarDataUrl, cvTemplate, tab } = parseCvTemplatePreviewPayload(req.body);
      const html = generateCvTemplateHtml(cvData, { avatarDataUrl, cvTemplate, tab });
      res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (error) {
      next(error);
    }
  },

  previewCVTemplatePdf: async (req, res, next) => {
    try {
      const { cvData, avatarDataUrl, cvTemplate, tab } = parseCvTemplatePreviewPayload(req.body);
      const buffer = await generateCvTemplatePdfBuffer(cvData, { avatarDataUrl, cvTemplate, tab });
      if (!buffer || !buffer.length) {
        return res.status(503).json({
          success: false,
          message: 'Không tạo được PDF (cần Chromium/Chrome trên server).'
        });
      }
      const filename = buildCvTemplatePdfFilenameFromPreviewPayload({ cvData, cvTemplate, tab });
      res.status(200)
        .set('Content-Type', 'application/pdf')
        .set('Content-Disposition', makeInlineDisposition(filename))
        .send(buffer);
    } catch (error) {
      next(error);
    }
  }
};

