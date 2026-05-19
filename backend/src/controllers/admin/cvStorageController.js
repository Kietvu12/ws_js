import { CVStorage, Collaborator, Admin, ActionLog } from '../../models/index.js';
import { Op } from 'sequelize';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import config from '../../config/index.js';
import { uploadFileToS3, isS3Key, getSignedUrlForFile, getObjectStream, deleteFileFromS3, s3Enabled, makeDownloadDisposition, isFolderPath, listKeysUnderPrefix, buildCvOriginalFolderKey, buildCvTemplateFolderKey, buildCvTemplateFileKey, listCvSnapshotDateTimes, getCvSnapshotDateTime, copyCvOriginalsToNewSnapshot, copyCvTemplatesToNewSnapshot } from '../../services/s3Service.js';
import { resolveCvFileForView } from '../../utils/cvStorageResolver.js';
import { mimeFromCvFilePath } from '../../utils/cvFileContentMime.js';
import { listExistingCvTemplateDocumentPairs } from '../../utils/cvTemplateFileDiscovery.js';
import { buildCvTemplatePdfFilenameFromStorageQuery } from '../../services/cvPdfService.js';
import { createReadStream } from 'fs';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../../');

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'approvedAt': 'approved_at'
  };
  return fieldMap[fieldName] || fieldName;
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), config.upload.dir, 'cvs');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cv-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Allowed types: PDF, DOC, DOCX, JPG, JPEG, PNG'));
    }
  }
});

export const uploadCVFile = upload.single('cvFile');

/**
 * CV File Management Controller (Admin)
 */
export const cvStorageController = {
  /**
   * Get list of CV files
   * GET /api/admin/cv-storages
   */
  getCVStorages: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        collaboratorId,
        adminId,
        status,
        sortBy = 'id',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name, email, or code
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by collaborator
      if (collaboratorId) {
        where.collaboratorId = parseInt(collaboratorId);
      }

      // Filter by admin
      if (adminId) {
        where.adminId = parseInt(adminId);
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'createdAt', 'updatedAt', 'name', 'code'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause - always add id as secondary sort for consistency
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']); // Secondary sort by id ascending
      }

      const { count, rows } = await CVStorage.findAndCountAll({
        where,
        attributes: ['id', 'code', 'name', 'email', 'phone', 'curriculumVitae', 'otherDocuments', 'status', 'createdAt', 'updatedAt'],
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false,
            attributes: ['id', 'name', 'email', 'code']
          },
          {
            model: Admin,
            as: 'admin',
            required: false,
            attributes: ['id', 'name', 'email']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          cvStorages: rows,
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
   * Upload CV file
   * POST /api/admin/cv-storages/:id/upload
   */
  uploadCVFile: async (req, res, next) => {
    try {
      const { id } = req.params;
      const fileType = req.body.fileType || 'curriculumVitae'; // curriculumVitae or otherDocuments

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file để upload'
        });
      }

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        // Delete uploaded file if CV not found
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV'
        });
      }

      const oldData = cv.toJSON();

      // Delete old file if exists (local or S3)
      if (fileType === 'curriculumVitae' && cv.curriculumVitae) {
        if (isS3Key(cv.curriculumVitae)) {
          await deleteFileFromS3(cv.curriculumVitae).catch(() => {});
        } else {
          const oldFilePath = path.join(process.cwd(), config.upload.dir, 'cvs', path.basename(cv.curriculumVitae));
          await fs.unlink(oldFilePath).catch(() => {});
        }
      } else if (fileType === 'otherDocuments' && cv.otherDocuments) {
        if (isS3Key(cv.otherDocuments)) {
          await deleteFileFromS3(cv.otherDocuments).catch(() => {});
        } else {
          const oldFilePath = path.join(process.cwd(), config.upload.dir, 'cvs', path.basename(cv.otherDocuments));
          await fs.unlink(oldFilePath).catch(() => {});
        }
      }

      let filePath;
      if (s3Enabled()) {
        filePath = await uploadFileToS3(req.file.path, 'cvs', null, req.file.originalname);
        await fs.unlink(req.file.path).catch(() => {});
      }
      if (!filePath) {
        filePath = `/uploads/cvs/${req.file.filename}`;
      }

      if (fileType === 'curriculumVitae') {
        cv.curriculumVitae = filePath;
      } else {
        cv.otherDocuments = filePath;
      }

      await cv.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'CVStorage',
        action: 'upload_file',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: cv.toJSON(),
        description: `Upload file CV: ${req.file.originalname} cho CV ${cv.code}`
      });

      res.json({
        success: true,
        message: 'Upload file thành công',
        data: {
          cv: {
            id: cv.id,
            code: cv.code,
            curriculumVitae: cv.curriculumVitae,
            otherDocuments: cv.otherDocuments
          },
          file: {
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            path: cv.curriculumVitae || cv.otherDocuments
          }
        }
      });
    } catch (error) {
      // Delete uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      next(error);
    }
  },

  /**
   * Download CV file (redirect to signed URL nếu S3, hoặc serve local)
   * GET /api/admin/cv-storages/:id/download
   */
  downloadCVFile: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae', template, document, index } = req.query;

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV'
        });
      }

      const resolved = await resolveCvFileForView(cv, fileType, { template, document, index }, backendRoot);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }
      const filePath = resolved.pathOrKey;
      const wantsCvTemplateFilename = (
        resolved?.pathOrKey?.includes('CV_Template')
        && (fileType === 'curriculumVitae' || fileType === 'cvCareerHistoryPath')
      );
      const resolvedDocument = document || (fileType === 'cvCareerHistoryPath' ? 'shokumu' : 'rirekisho');
      const resolvedTemplate = template || 'Common';
      const desiredFilename = wantsCvTemplateFilename
        ? buildCvTemplatePdfFilenameFromStorageQuery({
          cv,
          template: resolvedTemplate,
          document: resolvedDocument
        })
        : null;

      if (resolved.isS3) {
        const filename = desiredFilename || (path.basename(filePath).replace(/^[a-f0-9-]+_/i, '') || 'download');
        const signedUrl = await getSignedUrlForFile(filePath, 'download', makeDownloadDisposition(filename));
        if (signedUrl) return res.redirect(302, signedUrl);
        return res.status(503).json({
          success: false,
          message: 'File lưu trên S3. Vui lòng cấu hình AWS S3 trong .env.'
        });
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

      const stats = await fs.stat(fullPath);
      const filename = desiredFilename || path.basename(filePath);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', makeDownloadDisposition(filename));
      res.setHeader('Content-Length', stats.size);
      const fileStream = await fs.readFile(fullPath);
      res.send(fileStream);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Stream file content (proxy) để frontend preview DOCX/DOC/XLSX không bị CORS khi fetch S3.
   * GET /api/admin/cv-storages/:id/file-content?fileType=curriculumVitae
   */
  getCVFileContent: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae', template, document, index } = req.query;

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV'
        });
      }

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
   * List all CV files (originals + templates) with view/download URLs
   * GET /api/admin/cv-storages/:id/cv-file-list
   */
  getCVFileList: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV'
        });
      }
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
            } catch (e) {}
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

      return res.json({ success: true, data: { originals, templates } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List snapshots (dateTime folders) for a CV.
   * GET /api/admin/cv-storages/:id/snapshots?limit=20
   */
  getCVSnapshots: async (req, res, next) => {
    try {
      const { id } = req.params;
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy CV' });
      }

      let dateTimes = [];
      if (s3Enabled()) {
        dateTimes = await listCvSnapshotDateTimes(cv.id);
      } else {
        const cvRoot = path.join(backendRoot, config.upload.dir, 'cvs', String(cv.id));
        try {
          const entries = await fs.readdir(cvRoot, { withFileTypes: true });
          dateTimes = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();
        } catch {
          dateTimes = [];
        }
      }
      dateTimes = dateTimes.slice(0, limit);

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

          const tplPairs = await listExistingCvTemplateDocumentPairs(templateFolderPath, backendRoot);
          for (const { template: tpl, document: doc } of tplPairs) {
            const fileName = `cv-${doc}.pdf`;
            const key = buildCvTemplateFileKey(cv.id, dateTime, tpl, fileName);
            const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: tpl, document: doc });
            const viewUrl = await getSignedUrlForFile(key, 'view');
            const downloadUrl = await getSignedUrlForFile(key, 'download', makeDownloadDisposition(downloadFileName));
            templates[tpl][doc] = { viewUrl, downloadUrl, fileName: downloadFileName };
          }
        } else {
          const snapshotRoot = path.join(backendRoot, config.upload.dir, 'cvs', String(cv.id), dateTime);
          const origDir = path.join(snapshotRoot, 'CV_original');
          originalFolderPath = path.relative(backendRoot, origDir).replace(/\\/g, '/');
          templateFolderPath = path.relative(backendRoot, path.join(snapshotRoot, 'CV_Template')).replace(/\\/g, '/');
          try {
            const files = await fs.readdir(origDir);
            files.sort();
            for (const f of files) {
              const rel = path.relative(backendRoot, path.join(origDir, f)).replace(/\\/g, '/');
              const url = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '') + '/' + rel.replace(/^\/+/, '');
              originals.push({ name: f, viewUrl: url, downloadUrl: url });
            }
          } catch {}

          const templateFolderAbs = path.join(snapshotRoot, 'CV_Template');
          const tplPairs = await listExistingCvTemplateDocumentPairs(templateFolderAbs, backendRoot);
          for (const { template: tpl, document: doc } of tplPairs) {
            const fileName = `cv-${doc}.pdf`;
            const full = path.join(snapshotRoot, 'CV_Template', tpl, fileName);
            const rel = path.relative(backendRoot, full).replace(/\\/g, '/');
            const url = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '') + '/' + rel.replace(/^\/+/, '');
            const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: tpl, document: doc });
            templates[tpl][doc] = { viewUrl: url, downloadUrl: url, fileName: downloadFileName };
          }
        }

        snapshots.push({
          dateTime,
          originalFolderPath,
          templateFolderPath,
          originals,
          templates,
          zip: {
            original: `/api/admin/cv-storages/${cv.id}/download-zip?scope=original&template=all&dateTime=${encodeURIComponent(dateTime)}`,
            templateAll: `/api/admin/cv-storages/${cv.id}/download-zip?scope=template&template=all&dateTime=${encodeURIComponent(dateTime)}`,
            templateCommon: `/api/admin/cv-storages/${cv.id}/download-zip?scope=template&template=Common&dateTime=${encodeURIComponent(dateTime)}`,
            templateIT: `/api/admin/cv-storages/${cv.id}/download-zip?scope=template&template=IT&dateTime=${encodeURIComponent(dateTime)}`,
            templateTechnical: `/api/admin/cv-storages/${cv.id}/download-zip?scope=template&template=Technical&dateTime=${encodeURIComponent(dateTime)}`,
          }
        });
      }

      return res.json({ success: true, data: { snapshots } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Rollback CV về một snapshot cũ: copy toàn bộ snapshot đó sang snapshot mới và cập nhật DB.
   * POST /api/admin/cv-storages/:id/rollback
   * Body: { srcDateTime: "YYYY-MM-DD_HH-mm-ss" }
   */
  rollbackCV: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { srcDateTime } = req.body || {};
      if (!srcDateTime || typeof srcDateTime !== 'string') {
        return res.status(400).json({ success: false, message: 'Thiếu srcDateTime (YYYY-MM-DD_HH-mm-ss)' });
      }

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy CV' });
      }

      let dateTimes = [];
      if (s3Enabled()) {
        dateTimes = await listCvSnapshotDateTimes(cv.id);
      } else {
        const cvRoot = path.join(backendRoot, config.upload.dir, 'cvs', String(cv.id));
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
   * Download zip for CV_original or CV_Template (single template or all)
   * GET /api/admin/cv-storages/:id/download-zip?scope=original|template&template=Common|IT|Technical|all
   */
  downloadCVZip: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { scope = 'template', template = 'all', dateTime: dt } = req.query;

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy CV' });
      }

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
            const fullDir = path.join(backendRoot, config.upload.dir, 'cvs', String(cv.id), dateTime, 'CV_original');
            let entries = [];
            try { entries = await fs.readdir(fullDir); } catch {}
            entries.sort();
            for (const f of entries) files.push({ type: 'local', fullPath: path.join(fullDir, f), name: `CV_original/${f}` });
          }
        } else {
          if (!cv.cvOriginalPath) return res.status(404).json({ success: false, message: 'Không có file CV gốc' });
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
            : path.join(backendRoot, config.upload.dir, 'cvs', String(cv.id), dateTime, 'CV_Template');
          let pairs = await listExistingCvTemplateDocumentPairs(templateFolderRef, backendRoot);
          if (wantTpl) pairs = pairs.filter((p) => p.template === wantTpl);
          for (const { template: tpl, document } of pairs) {
            const fileName = `cv-${document}.pdf`;
            const downloadFileName = buildCvTemplatePdfFilenameFromStorageQuery({ cv, template: tpl, document });
            if (s3Enabled()) {
              const key = buildCvTemplateFileKey(cv.id, dateTime, tpl, fileName);
              files.push({ type: 's3', key, name: `CV_Template/${tpl}/${downloadFileName}` });
            } else {
              const full = path.join(backendRoot, config.upload.dir, 'cvs', String(cv.id), dateTime, 'CV_Template', tpl, fileName);
              files.push({ type: 'local', fullPath: full, name: `CV_Template/${tpl}/${downloadFileName}` });
            }
          }
        } else {
          if (!cv.curriculumVitae) return res.status(404).json({ success: false, message: 'Không có file CV template' });
          if (!cv.curriculumVitae.includes('CV_Template')) {
            return res.status(404).json({ success: false, message: 'Không có file CV template' });
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
        return res.status(404).json({ success: false, message: 'Không có file để nén' });
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get signed URL for view hoặc download (S3), hoặc URL tĩnh (local)
   * GET /api/admin/cv-storages/:id/view-url?fileType=curriculumVitae&purpose=view|download
   */
  getCVViewUrl: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae', purpose = 'view', template, document, index } = req.query;

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV'
        });
      }

      const resolved = await resolveCvFileForView(cv, fileType, { template, document, index }, backendRoot);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }
      const filePath = resolved.pathOrKey;
      const wantsCvTemplateFilename = (
        resolved?.pathOrKey?.includes('CV_Template')
        && (fileType === 'curriculumVitae' || fileType === 'cvCareerHistoryPath')
        && purpose === 'download'
      );
      const resolvedDocument = document || (fileType === 'cvCareerHistoryPath' ? 'shokumu' : 'rirekisho');
      const resolvedTemplate = template || 'Common';
      const desiredFilename = wantsCvTemplateFilename
        ? buildCvTemplatePdfFilenameFromStorageQuery({
          cv,
          template: resolvedTemplate,
          document: resolvedDocument
        })
        : null;

      if (resolved.isS3) {
        const disposition = purpose === 'download'
          ? makeDownloadDisposition(desiredFilename || (path.basename(filePath).replace(/^[a-f0-9-]+_/i, '') || 'download'))
          : null;
        const url = await getSignedUrlForFile(filePath, purpose, disposition);
        if (url) {
          return res.json({ success: true, data: { url } });
        }
        return res.status(503).json({
          success: false,
          message: 'File lưu trên S3. Vui lòng cấu hình AWS S3 (bucket, keyPrefix, credentials) trong .env.'
        });
      }

      // Local file: purpose=download sẽ trả về URL gọi endpoint download để server set đúng Content-Disposition.
      if (desiredFilename && !resolved.isS3) {
        const apiBase = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
        const qp = new URLSearchParams({
          fileType: String(fileType),
          template: String(resolvedTemplate),
          document: String(resolvedDocument)
        });
        if (index != null) qp.set('index', String(index));
        const downloadUrl = `${apiBase}/api/admin/cv-storages/${id}/download?${qp.toString()}`;
        return res.json({ success: true, data: { url: downloadUrl } });
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
   * Delete CV file
   * DELETE /api/admin/cv-storages/:id/file
   */
  deleteCVFile: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'curriculumVitae' } = req.query;

      const cv = await CVStorage.findByPk(id);
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CV'
        });
      }

      const oldData = cv.toJSON();
      const filePath = fileType === 'curriculumVitae' ? cv.curriculumVitae
        : fileType === 'otherDocuments' ? cv.otherDocuments
        : fileType === 'cvOriginalPath' ? cv.cvOriginalPath
        : fileType === 'cvCareerHistoryPath' ? cv.cvCareerHistoryPath
        : cv.curriculumVitae;

      if (!filePath) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      if (isS3Key(filePath)) {
        await deleteFileFromS3(filePath).catch(() => {});
      } else {
        const fullPath = path.join(process.cwd(), filePath);
        try {
          await fs.unlink(fullPath);
        } catch (error) {
          // File might not exist, continue anyway
        }
      }

      if (fileType === 'curriculumVitae') {
        cv.curriculumVitae = null;
      } else if (fileType === 'otherDocuments') {
        cv.otherDocuments = null;
      } else if (fileType === 'cvOriginalPath') {
        cv.cvOriginalPath = null;
      } else if (fileType === 'cvCareerHistoryPath') {
        cv.cvCareerHistoryPath = null;
      } else {
        cv.otherDocuments = null;
      }

      await cv.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'CVStorage',
        action: 'delete_file',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: cv.toJSON(),
        description: `Xóa file CV: ${filePath} cho CV ${cv.code}`
      });

      res.json({
        success: true,
        message: 'Xóa file thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};

