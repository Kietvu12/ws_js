/**
 * AWS S3 service: upload, signed URL (view/download), delete.
 * Bucket (vd: jshare3), prefix (vd: jsshare) → full key = jsshare/apply/68/file.pdf
 * Trong DB có thể lưu: apply/68/xxx.pdf hoặc cvs/uuid_name.pdf (có hoặc không có prefix)
 */
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readFileSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

const s3Config = config.aws?.s3 || {};
const isEnabled = !!(s3Config.bucket && s3Config.accessKeyId && s3Config.secretAccessKey);

let s3Client = null;

function getClient() {
  if (!isEnabled) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey
      }
    });
  }
  return s3Client;
}

/**
 * Build S3 key cho CV template PDF - lưu theo folder id ứng viên.
 * Format: cvs/{cvId}/cv-rirekisho.pdf (tab 1 - Lý lịch). Giữ tên buildCvTemplatePdfKey để tương thích.
 * @param {number|string} cvId - ID của CV/ứng viên
 * @returns {string} Full S3 key
 */
export function buildCvTemplatePdfKey(cvId) {
  return buildCvRirekishoPdfKey(cvId);
}

/** Chuẩn hóa ID ứng viên cho S3 key. Trả về string hợp lệ hoặc null nếu không dùng được. */
function normalizeCvIdForKey(cvId) {
  if (cvId == null) return null;
  const id = String(cvId).trim();
  if (!id || id === 'undefined' || id === 'null' || id === 'NaN') return null;
  return id;
}

/**
 * CV 履歴書 (tab 1 - Lý lịch)
 * Format: cvs/{cvId}/cv-rirekisho.pdf
 */
export function buildCvRirekishoPdfKey(cvId) {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvRirekishoPdfKey: cvId không hợp lệ');
  const keyPart = `cvs/${id}/cv-rirekisho.pdf`;
  return withPrefix(keyPart);
}

/**
 * CV 職務経歴書 (tab 2 - Lịch sử việc làm)
 * Format: cvs/{cvId}/cv-shokumu.pdf
 */
export function buildCvShokumuPdfKey(cvId) {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvShokumuPdfKey: cvId không hợp lệ');
  const keyPart = `cvs/${id}/cv-shokumu.pdf`;
  return withPrefix(keyPart);
}

/**
 * CV gốc (file upload) - lưu trong folder cvs/{cvId}/cv-original.{ext}
 * @param {number|string} cvId
 * @param {string} [originalFilename] - tên file gốc để lấy extension (vd: resume.pdf, cv.docx)
 * @returns {string} Full S3 key
 */
export function buildCvOriginalKey(cvId, originalFilename = '') {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvOriginalKey: cvId không hợp lệ');
  const ext = (originalFilename && originalFilename.includes('.'))
    ? '.' + originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '.pdf';
  const safeExt = ext === '.' ? '.pdf' : ext;
  const keyPart = `cvs/${id}/cv-original${safeExt}`;
  return withPrefix(keyPart);
}

/**
 * Prefix S3 (AWS_S3_KEY_PREFIX). Giống luồng CV trong cvController:
 * — cvs/, job_descriptions/, apply/, campaign/, job-pickups/: object ở root bucket (không gán prefix env),
 *   IAM thường chỉ match cvs/* hoặc path gốc — khác posts/ đi dưới prefix.
 */
function withPrefix(keyPart) {
  const prefix = (s3Config.keyPrefix || '').trim();
  if (!prefix) return keyPart;
  if (
    keyPart.startsWith('cvs/') ||
    keyPart.startsWith('job_descriptions/') ||
    keyPart.startsWith('apply/') ||
    keyPart.startsWith('campaign/') ||
    keyPart.startsWith('job-pickups/')
  ) {
    return keyPart;
  }
  return `${prefix}/${keyPart}`;
}

/**
 * Trả về chuỗi ngày giờ cho snapshot CV: YYYY-MM-DD_HH-mm-ss
 */
export function getCvSnapshotDateTime() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}_${h}-${min}-${s}`;
}

/**
 * Prefix folder snapshot: cvs/{id}/{dateTime}
 */
export function buildCvSnapshotPrefix(cvId, dateTime) {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvSnapshotPrefix: cvId không hợp lệ');
  const keyPart = `cvs/${id}/${dateTime}`;
  return withPrefix(keyPart);
}

/**
 * Folder CV gốc trong snapshot: cvs/{id}/{dateTime}/CV_original (path lưu DB)
 */
export function buildCvOriginalFolderKey(cvId, dateTime) {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvOriginalFolderKey: cvId không hợp lệ');
  const keyPart = `cvs/${id}/${dateTime}/CV_original`;
  return withPrefix(keyPart);
}

/**
 * Folder CV_Template trong snapshot: cvs/{id}/{dateTime}/CV_Template (path lưu DB)
 */
export function buildCvTemplateFolderKey(cvId, dateTime) {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvTemplateFolderKey: cvId không hợp lệ');
  const keyPart = `cvs/${id}/${dateTime}/CV_Template`;
  return withPrefix(keyPart);
}

/**
 * Folder ảnh chân dung trong snapshot: cvs/{id}/{dateTime}/CV_avatar (cùng cấp CV_original, CV_Template)
 */
export function buildCvAvatarFolderKey(cvId, dateTime) {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvAvatarFolderKey: cvId không hợp lệ');
  const keyPart = `cvs/${id}/${dateTime}/CV_avatar`;
  return withPrefix(keyPart);
}

function extFromImageMime(mime = '') {
  const m = String(mime).toLowerCase();
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  return '.jpg';
}

/**
 * Upload ảnh chân dung vào snapshot (CV_avatar/profile_photo.{ext})
 * @returns {Promise<string>} full S3 key (có keyPrefix nếu cấu hình)
 */
export async function uploadCvAvatarToSnapshot(cvId, dateTime, buffer, mime = 'image/jpeg') {
  const client = getClient();
  if (!client) throw new Error('S3 is not configured');
  if (!buffer?.length) throw new Error('uploadCvAvatarToSnapshot: empty buffer');
  const ext = extFromImageMime(mime);
  const folderKey = buildCvAvatarFolderKey(cvId, dateTime);
  const key = `${folderKey}/profile_photo${ext}`;
  await uploadBufferToS3(buffer, key, mime || 'image/jpeg');
  return key;
}

/**
 * Key file PDF trong CV_Template: cvs/{id}/{dateTime}/CV_Template/{Common|IT|Technical}/{fileName}
 * @param {string} templateDir - 'Common' | 'IT' | 'Technical'
 * @param {string} fileName - 'cv-rirekisho.pdf' | 'cv-shokumu.pdf'
 */
export function buildCvTemplateFileKey(cvId, dateTime, templateDir, fileName) {
  const id = normalizeCvIdForKey(cvId);
  if (!id) throw new Error('buildCvTemplateFileKey: cvId không hợp lệ');
  const keyPart = `cvs/${id}/${dateTime}/CV_Template/${templateDir}/${fileName}`;
  return withPrefix(keyPart);
}

/**
 * Path trong DB là folder (snapshot) nếu chứa CV_Template hoặc CV_original
 */
export function isFolderPath(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return false;
  return storedPath.includes('CV_Template') || storedPath.includes('CV_original');
}

/**
 * Upload nhiều file CV gốc vào folder CV_original của snapshot.
 * Key mỗi file: {prefix}/CV_original/cv-original-{index}{ext} hoặc tên an toàn.
 * @param {number|string} cvId
 * @param {string} dateTime - từ getCvSnapshotDateTime()
 * @param {Array<{ path?: string, buffer?: Buffer, originalname?: string, mimetype?: string }>} files
 * @returns {Promise<string>} folder key (buildCvOriginalFolderKey) - đã upload ít nhất 1 file
 */
export async function uploadCvOriginalsToSnapshot(cvId, dateTime, files) {
  const folderKey = buildCvOriginalFolderKey(cvId, dateTime);
  if (!files || files.length === 0) return folderKey;
  const client = getClient();
  if (!client) throw new Error('S3 is not configured');
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
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const buf = f.buffer || (f.path ? readFileSync(f.path) : null);
    if (!buf || !buf.length) continue;
    const safeName = toSafeUploadName(f.originalname, i);
    const key = `${folderKey}/${safeName}`;
    await uploadBufferToS3(buf, key, f.mimetype || 'application/pdf');
  }
  return folderKey;
}

function isS3AccessDenied(err) {
  if (!err) return false;
  if (err.Code === 'AccessDenied' || err.name === 'AccessDenied') return true;
  const code = err.$metadata?.httpStatusCode;
  return code === 403;
}

/**
 * ListObjects: thử vài cách ghép prefix vì IAM có thể chỉ cho List theo một dạng prefix.
 * File CV snapshot thật (withPrefix) nằm ở root bucket `cvs/...` — phải ưu tiên resolveS3Key
 * trước resolveS3KeyForListObjects. Nếu thứ tự ngược, List trả 200 với 0 object (sai prefix)
 * nhưng code cũ return ngay → không bao giờ thử đúng prefix.
 */
function listPrefixCandidatesForListApi(storedPrefix) {
  const normalized = String(storedPrefix).replace(/^\/+/, '').trim();
  const forList = resolveS3KeyForListObjects(storedPrefix);
  const forGet = resolveS3Key(storedPrefix);
  const out = [];
  const order =
    normalized.startsWith('cvs/')
      ? [forGet, forList, normalized]
      : [forList, forGet, normalized];
  for (const x of order) {
    if (x && !out.includes(x)) out.push(x);
  }
  return out;
}

async function listObjectKeysPaginated(client, bucket, fullPrefixBase) {
  const listPrefix = fullPrefixBase.endsWith('/') ? fullPrefixBase : `${fullPrefixBase}/`;
  const out = [];
  let continuationToken = undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: listPrefix,
      MaxKeys: 500,
      ContinuationToken: continuationToken
    });
    const result = await client.send(cmd);
    if (result.Contents && result.Contents.length) {
      for (const o of result.Contents) {
        if (o.Key) out.push(o.Key);
      }
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return out;
}

/**
 * List S3 keys under prefix (để lấy file trong folder CV_original hoặc resolve index).
 * Prefix không cần slash cuối; hàm sẽ thêm slash khi gọi ListObjectsV2.
 * @param {string} prefix - key folder (vd. cvs/123/2025-03-08_14-30-00/CV_original)
 * @returns {Promise<string[]>} mảng key (full key, có prefix bucket nếu config)
 */
export async function listKeysUnderPrefix(prefix) {
  const client = getClient();
  if (!client || !prefix) return [];
  const bucket = s3Config.bucket;
  const candidates = listPrefixCandidatesForListApi(prefix);
  let lastDenied = null;
  for (const base of candidates) {
    try {
      const keys = await listObjectKeysPaginated(client, bucket, base);
      // Prefix sai thường trả 200 + 0 key; thử candidate kế (vd. root cvs/... vs keyPrefix/cvs/...)
      if (keys.length > 0) return keys;
    } catch (err) {
      if (isS3AccessDenied(err)) {
        lastDenied = err;
        continue;
      }
      throw err;
    }
  }
  if (lastDenied) {
    console.warn(
      '[S3] listKeysUnderPrefix: AccessDenied với mọi biến thể prefix, trả về []. prefix=',
      prefix,
      '| đã thử:',
      candidates.join(' | ')
    );
  }
  return [];
}

/**
 * List snapshot dateTime folders under cvs/{cvId}/ using S3 delimiter.
 * @param {number|string} cvId
 * @returns {Promise<string[]>} mảng dateTime (vd: 2026-03-09_10-21-05) sorted DESC
 */
export async function listCvSnapshotDateTimes(cvId) {
  const client = getClient();
  if (!client) return [];
  const id = normalizeCvIdForKey(cvId);
  if (!id) return [];

  const bucket = s3Config.bucket;
  const prefixInput = `cvs/${id}/`;
  const candidates = listPrefixCandidatesForListApi(prefixInput);
  let lastDenied = null;
  let listPrefix = '';

  for (const basePrefix of candidates) {
    listPrefix = basePrefix.endsWith('/') ? basePrefix : `${basePrefix}/`;
    try {
      const batch = new Set();
      let continuationToken = undefined;
      do {
        const cmd = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: listPrefix,
          Delimiter: '/',
          MaxKeys: 500,
          ContinuationToken: continuationToken
        });
        const result = await client.send(cmd);
        if (result.CommonPrefixes && result.CommonPrefixes.length) {
          for (const p of result.CommonPrefixes) {
            const pref = p.Prefix || '';
            if (!pref.startsWith(listPrefix)) continue;
            const rest = pref.slice(listPrefix.length);
            const dt = rest.replace(/\/+$/, '');
            if (dt) batch.add(dt);
          }
        }
        continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
      } while (continuationToken);
      if (batch.size > 0) {
        return Array.from(batch).sort().reverse();
      }
    } catch (err) {
      if (isS3AccessDenied(err)) {
        lastDenied = err;
        continue;
      }
      throw err;
    }
  }

  if (lastDenied) {
    console.warn(
      '[S3] listCvSnapshotDateTimes: AccessDenied với mọi biến thể prefix, trả về []. cvId=',
      id,
      '| đã thử:',
      candidates.join(' | ')
    );
  }
  return [];
}

/**
 * Copy tất cả object trong folder CV_original của snapshot cũ sang snapshot mới (S3 only).
 * @param {number|string} cvId
 * @param {string} newDateTime - từ getCvSnapshotDateTime()
 * @param {string} sourceFolderKey - folder key cũ (cv_original_path)
 * @returns {Promise<string>} folder key mới (buildCvOriginalFolderKey)
 */
export async function copyCvOriginalsToNewSnapshot(cvId, newDateTime, sourceFolderKey) {
  const destFolderKey = buildCvOriginalFolderKey(cvId, newDateTime);
  const keys = await listKeysUnderPrefix(sourceFolderKey);
  const client = getClient();
  if (!client || keys.length === 0) return destFolderKey;
  const bucket = s3Config.bucket;
  for (const sourceKey of keys) {
    const fileName = sourceKey.split('/').pop();
    if (!fileName) continue;
    const destKey = `${destFolderKey}/${fileName}`;
    await client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey
    }));
  }
  return destFolderKey;
}

/**
 * Copy một file (legacy single-file cv_original_path) vào CV_original của snapshot mới.
 * @param {number|string} cvId
 * @param {string} newDateTime
 * @param {string} sourceKey - full S3 key của file cũ
 * @returns {Promise<string>} folder key mới
 */
export async function copySingleFileToCvOriginalSnapshot(cvId, newDateTime, sourceKey) {
  const destFolderKey = buildCvOriginalFolderKey(cvId, newDateTime);
  const client = getClient();
  if (!client || !sourceKey) return destFolderKey;
  const ext = path.extname(sourceKey) || '.pdf';
  const destKey = `${destFolderKey}/cv-original-1${ext}`;
  const bucket = s3Config.bucket;
  const fullSource = resolveS3Key(sourceKey);
  await client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${fullSource}`,
    Key: destKey
  }));
  return destFolderKey;
}

/**
 * Copy toàn bộ folder CV_Template của snapshot cũ sang snapshot mới (S3 only).
 * @param {number|string} cvId
 * @param {string} newDateTime - từ getCvSnapshotDateTime()
 * @param {string} sourceTemplateFolderKey - folder key cũ (curriculumVitae = CV_Template)
 * @returns {Promise<string>} folder key mới (buildCvTemplateFolderKey)
 */
export async function copyCvTemplatesToNewSnapshot(cvId, newDateTime, sourceTemplateFolderKey) {
  const destFolderKey = buildCvTemplateFolderKey(cvId, newDateTime);
  const keys = await listKeysUnderPrefix(sourceTemplateFolderKey);
  const client = getClient();
  if (!client || keys.length === 0) return destFolderKey;
  const bucket = s3Config.bucket;
  const srcPrefix = sourceTemplateFolderKey.replace(/\/+$/, '') + '/';
  for (const sourceKey of keys) {
    if (!sourceKey.startsWith(srcPrefix)) continue;
    const suffix = sourceKey.slice(srcPrefix.length);
    const destKey = `${destFolderKey}/${suffix}`;
    await client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey
    }));
  }
  return destFolderKey;
}

/**
 * Build S3 key cho JD (file_vn, file_eng, file_jp).
 * `jd_original_file` trong DB có thể trùng key với `jd_file` (bản Việt = JD gốc) — không bắt buộc object S3 riêng.
 * Luôn: `job_descriptions/{jobId}/{type}.pdf` — **không** thêm AWS_S3_KEY_PREFIX.
 * Policy IAM hay dạng `arn:aws:s3:::bucket/job_descriptions/*`; nếu gắn prefix vào key sẽ thành `prefix/job_descriptions/...` và dễ bị AccessDenied.
 */
export function buildJdFileKey(jobId, type) {
  return `job_descriptions/${jobId}/${type}.pdf`;
}

/**
 * Build S3 key cho JD template PDF (bản Việt) - backward compat.
 * @param {number|string} jobId - ID của Job
 * @returns {string} Full S3 key
 */
export function buildJdTemplatePdfKey(jobId) {
  return buildJdFileKey(jobId, 'file_vn');
}

/**
 * Build S3 key cho ảnh bài viết: posts/{postId}/{uuid}.{ext}
 * @param {number|string} postId
 * @param {string} [originalFilename] - để lấy extension (vd: image.png)
 * @returns {string} Full S3 key
 */
export function buildPostImageKey(postId, originalFilename = '') {
  const id = String(postId).trim();
  if (!id || id === 'undefined' || id === 'null') throw new Error('buildPostImageKey: postId không hợp lệ');
  const ext = (originalFilename && originalFilename.includes('.'))
    ? '.' + originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '.jpg';
  const safeExt = ext === '.' ? '.jpg' : ext;
  const keyPart = `posts/${id}/${uuidv4()}${safeExt}`;
  return withPrefix(keyPart);
}

/**
 * Ảnh cover chiến dịch (admin): campaign/{campaignId}/{uuid}.{ext}
 */
export function buildCampaignCoverKey(campaignId, originalFilename = '') {
  const id = String(campaignId).trim();
  if (!id || id === 'undefined' || id === 'null') throw new Error('buildCampaignCoverKey: campaignId không hợp lệ');
  const ext = (originalFilename && originalFilename.includes('.'))
    ? '.' + originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '.jpg';
  const safeExt = ext === '.' ? '.jpg' : ext;
  const keyPart = `campaign/${id}/${uuidv4()}${safeExt}`;
  return withPrefix(keyPart);
}

/**
 * Ảnh cover job pick-up (admin): job-pickups/{pickupId}/{uuid}.{ext}
 */
export function buildJobPickupCoverKey(pickupId, originalFilename = '') {
  const id = String(pickupId).trim();
  if (!id || id === 'undefined' || id === 'null') throw new Error('buildJobPickupCoverKey: pickupId không hợp lệ');
  const ext = (originalFilename && originalFilename.includes('.'))
    ? '.' + originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '.jpg';
  const safeExt = ext === '.' ? '.jpg' : ext;
  const keyPart = `job-pickups/${id}/${uuidv4()}${safeExt}`;
  return withPrefix(keyPart);
}

/**
 * Build S3 key cho ảnh tạm (khi tạo bài viết mới chưa có id): posts/temp/{uuid}.{ext}
 */
export function buildPostTempImageKey(originalFilename = '') {
  const ext = (originalFilename && originalFilename.includes('.'))
    ? '.' + originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '.jpg';
  const safeExt = ext === '.' ? '.jpg' : ext;
  const keyPart = `posts/temp/${uuidv4()}${safeExt}`;
  return withPrefix(keyPart);
}

/**
 * Build S3 key cho thumbnail bài viết (cùng folder bài viết): posts/{postId}/thumb_{uuid}.{ext}
 */
export function buildPostThumbnailKey(postId, originalFilename = '') {
  const id = String(postId).trim();
  if (!id || id === 'undefined' || id === 'null') throw new Error('buildPostThumbnailKey: postId không hợp lệ');
  const ext = (originalFilename && originalFilename.includes('.'))
    ? '.' + originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '.jpg';
  const safeExt = ext === '.' ? '.jpg' : ext;
  const keyPart = `posts/${id}/thumb_${uuidv4()}${safeExt}`;
  return withPrefix(keyPart);
}

/**
 * Build S3 key cho file đính kèm tin nhắn.
 * Format: attachment/{jobApplicationId}/{uuid}_{safeName}.{ext}
 */
export function buildMessageAttachmentKey(jobApplicationId, originalFilename = '') {
  const id = String(jobApplicationId || '').trim();
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('buildMessageAttachmentKey: jobApplicationId không hợp lệ');
  }
  const base = path.basename(originalFilename || 'attachment');
  const ext = path.extname(base).toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
  const nameWithoutExt = path.basename(base, ext || undefined);
  const safeName = (nameWithoutExt || 'attachment')
    .replace(/[^a-zA-Z0-9\-_.\s]/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80) || 'attachment';
  const keyPart = `attachment/${id}/${uuidv4()}_${safeName}${ext || ''}`;
  return withPrefix(keyPart);
}

/**
 * Build S3 key cho thumbnail tạm (chưa có post id): posts/temp/thumb_{uuid}.{ext}
 */
export function buildPostTempThumbnailKey(originalFilename = '') {
  const ext = (originalFilename && originalFilename.includes('.'))
    ? '.' + originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '.jpg';
  const safeExt = ext === '.' ? '.jpg' : ext;
  const keyPart = `posts/temp/thumb_${uuidv4()}${safeExt}`;
  return withPrefix(keyPart);
}

/**
 * Copy thumbnail từ temp (posts/temp/thumb_xxx) sang folder bài viết posts/{postId}/thumb_xxx.
 * @param {string} sourceTempKey - key S3 của file temp (vd. posts/temp/thumb_uuid.jpg)
 * @param {number|string} postId
 * @returns {Promise<string>} key đích (posts/{id}/thumb_xxx.ext) để lưu DB
 */
export async function copyPostTempThumbnailToPost(sourceTempKey, postId) {
  const client = getClient();
  if (!client || !sourceTempKey) return null;
  const id = String(postId).trim();
  if (!id) return null;
  const ext = path.extname(sourceTempKey) || '.jpg';
  const destKey = withPrefix(`posts/${id}/thumb_${uuidv4()}${ext}`);
  const bucket = s3Config.bucket;
  const fullSource = resolveS3Key(sourceTempKey);
  await client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${fullSource}`,
    Key: destKey
  }));
  return destKey;
}

/**
 * Build S3 key. Format: cvs/uuid_Original-Name.pdf (hoặc jobs/...)
 * @param {string} folder - 'cvs' | 'jobs'
 * @param {string} localFilePath - path to file (for extension)
 * @param {string} [originalName] - original filename (optional)
 */
function buildS3Key(folder, localFilePath, originalName) {
  const base = path.basename(localFilePath || originalName || 'file');
  const ext = path.extname(base) || path.extname(originalName || '') || '';
  const nameWithoutExt = path.basename(originalName || base, ext);
  const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9\-_.\s]/g, '-').replace(/-+/g, '-').trim().slice(0, 120) || 'file';
  const keyPart = `${folder}/${uuidv4()}_${safeName}${ext}`;
  return withPrefix(keyPart);
}

/**
 * Upload file from local path to S3. Returns S3 key to store in DB (format like cvs/uuid_Original-Name.pdf).
 * @param {string} localFilePath - absolute or relative path to file
 * @param {string} folder - 'cvs' | 'jobs'
 * @param {string} [contentType] - e.g. 'application/pdf'
 * @param {string} [originalName] - tên file gốc để đưa vào key (vd: DONG-DUY-TUNG.pdf)
 * @returns {Promise<string|null>} S3 key or null if S3 disabled
 */
export async function uploadFileToS3(localFilePath, folder, contentType = null, originalName = null) {
  const client = getClient();
  if (!client) return null;

  const key = buildS3Key(folder, localFilePath, originalName);
  const body = readFileSync(localFilePath);
  await client.send(new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType || undefined
  }));
  return key;
}

/**
 * Upload from buffer (e.g. multer memory or req.file.path read). Use when file is in memory.
 * @param {Buffer} buffer
 * @param {string} s3Key - full key e.g. "cvs/uuid_name.pdf"
 * @param {string} [contentType]
 * @returns {Promise<string>} same key
 */
export async function uploadBufferToS3(buffer, s3Key, contentType = null) {
  const client = getClient();
  if (!client) throw new Error('S3 is not configured');

  try {
    await client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType || undefined
    }));
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes('Access Denied') || err?.name === 'AccessDenied') {
      console.error(
        `[S3] PutObject AccessDenied | bucket=${s3Config.bucket} | key=${s3Key} — ` +
          'IAM cần s3:PutObject trên key này (JD dùng job_descriptions/{id}/..., không dùng AWS_S3_KEY_PREFIX).'
      );
    }
    throw err;
  }
  return s3Key;
}

/**
 * Path trong DB được coi là S3 nếu là apply/..., cvs/..., jobs/..., job_descriptions/...
 * Hỗ trợ: job_descriptions/xxx, jsshare/job_descriptions/xxx (bucket jshare3)
 */
export function isS3Key(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return false;
  const normalized = storedPath.replace(/^\/+/, '').trim();
  if (normalized.startsWith('uploads/') || normalized.startsWith('http')) return false;
  return /^apply\//.test(normalized) || /cvs\//.test(normalized) || /jobs\//.test(normalized) ||
    /job_descriptions\//.test(normalized) ||
    /^posts\//.test(normalized) ||
    /^campaign\//.test(normalized) ||
    /^job-pickups\//.test(normalized) ||
    /^Collabborator\//.test(normalized) ||
    /^business_licenses\//.test(normalized) ||
    /^jsshare\//.test(normalized) ||
    (s3Config.keyPrefix && normalized.startsWith(s3Config.keyPrefix + '/'));
}

/**
 * Trả về full S3 key để gọi GetObject/DeleteObject.
 * DB lưu có thể: "apply/68/xxx.pdf" hoặc "jsshare/apply/68/xxx.pdf".
 * Nếu config keyPrefix và path chưa có prefix → thêm prefix (trừ cvs/, apply/, job_descriptions/ ở root bucket).
 */
function resolveS3Key(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return storedPath;
  const normalized = storedPath.replace(/^\/+/, '').trim();
  const prefix = (s3Config.keyPrefix || '').trim();
  const decodePath = (value) => {
    try {
      return decodeURIComponent(String(value).replace(/\+/g, ' '));
    } catch {
      return String(value).replace(/\+/g, ' ');
    }
  };

  // JD: root job_descriptions/... (legacy) hoặc prefix/job_descriptions/... (object thật nằm dưới prefix trong bucket).
  if (normalized.startsWith('job_descriptions/')) {
    return normalized;
  }
  if (prefix && normalized.startsWith(prefix + '/job_descriptions/')) {
    return normalized;
  }

  // CV: cvs/... ở root bucket (không keyPrefix)
  if (normalized.startsWith('cvs/')) {
    return normalized;
  }
  if (prefix && normalized.startsWith(prefix + '/cvs/')) {
    return normalized.slice(prefix.length + 1);
  }

  // Business license: business_licenses/... ở root bucket (không keyPrefix)
  if (normalized.startsWith('business_licenses/')) {
    return normalized;
  }
  if (prefix && normalized.startsWith(prefix + '/business_licenses/')) {
    return normalized.slice(prefix.length + 1);
  }

  // Collaborator license files: Collabborator/... có thể được lưu dạng URL-encoded hoặc dấu + thay cho space
  if (normalized.startsWith('Collabborator/')) {
    return decodePath(normalized);
  }
  if (prefix && normalized.startsWith(prefix + '/Collabborator/')) {
    return decodePath(normalized.slice(prefix.length + 1));
  }

  // Job application files: apply/{id}/... ở root bucket (không keyPrefix)
  if (normalized.startsWith('apply/')) {
    return normalized;
  }
  if (prefix && normalized.startsWith(prefix + '/apply/')) {
    return normalized.slice(prefix.length + 1);
  }

  // Cover campaign / job-pickups: cùng kiểu cvs — key lưu DB là campaign/..., job-pickups/...
  if (normalized.startsWith('campaign/')) {
    return normalized;
  }
  if (normalized.startsWith('job-pickups/')) {
    return normalized;
  }
  if (normalized.startsWith('Collabborator/')) {
    return normalized;
  }
  if (prefix && normalized.startsWith(prefix + '/campaign/')) {
    return normalized.slice(prefix.length + 1);
  }
  if (prefix && normalized.startsWith(prefix + '/job-pickups/')) {
    return normalized.slice(prefix.length + 1);
  }
  if (prefix && normalized.startsWith(prefix + '/Collabborator/')) {
    return normalized.slice(prefix.length + 1);
  }

  if (!prefix) return normalized;
  if (normalized.startsWith(prefix + '/')) return normalized;
  return `${prefix}/${normalized}`;
}

/**
 * Prefix cho ListObjectsV2 / list folder: luôn gắn AWS_S3_KEY_PREFIX khi có (trừ khi path đã có prefix).
 * Policy IAM hay giới hạn ListBucket theo prefix (vd. job_share_prod/*); list trực tiếp cvs/* có thể 403 AccessDenied
 * dù GetObject với resolveS3Key (object ở root cvs/) vẫn đúng.
 */
function resolveS3KeyForListObjects(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return storedPath;
  const normalized = storedPath.replace(/^\/+/, '').trim();
  const prefix = (s3Config.keyPrefix || '').trim();
  if (!prefix) return normalized;
  if (normalized.startsWith(prefix + '/')) return normalized;
  return `${prefix}/${normalized}`;
}

/**
 * Tạo Content-Disposition an toàn cho S3 (header chỉ chấp nhận ISO-8859-1).
 * Nếu filename có ký tự Unicode (tiếng Nhật, Việt, v.v.) → dùng RFC 5987: filename*=UTF-8''encoded.
 * @param {string} filename - tên file gốc (có thể Unicode)
 * @returns {string} giá trị header Content-Disposition (chỉ chứa ký tự ASCII)
 */
export function makeDownloadDisposition(filename) {
  if (!filename || typeof filename !== 'string') return 'attachment';
  const clean = filename.replace(/["\\]/g, '_').trim() || 'download';
  const isAscii = /^[\x00-\x7F]*$/.test(clean);
  if (isAscii) return `attachment; filename="${clean}"`;
  const ext = path.extname(clean);
  const fallback = `download${ext}`;
  const encoded = encodeURIComponent(clean);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Get presigned URL for view (longer expiry) or download.
 * @param {string} s3Key - key lưu trong DB (vd: apply/68/xxx.pdf hoặc jsshare/apply/68/xxx.pdf)
 * @param {'view'|'download'} purpose
 * @param {string} [responseContentDisposition] - for download: dùng makeDownloadDisposition(filename) nếu tên file có Unicode
 * @returns {Promise<string|null>} URL or null
 */
export async function getSignedUrlForFile(s3Key, purpose = 'view', responseContentDisposition = null) {
  const client = getClient();
  if (!client || !s3Key) {
    if (!client) console.error('[S3] Không tạo được client. Kiểm tra AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY trong .env');
    return null;
  }

  const fullKey = resolveS3Key(s3Key);
  const expiresIn = purpose === 'download' ? s3Config.signedUrlExpiresDownload : s3Config.signedUrlExpiresView;
  try {
    const cmd = new GetObjectCommand({
      Bucket: s3Config.bucket,
      Key: fullKey,
      ...(responseContentDisposition && { ResponseContentDisposition: responseContentDisposition })
    });
    const url = await getSignedUrl(client, cmd, { expiresIn });
    // Path segment: khoảng trắng trong object key → %20 (RFC 3986). Trong path, "+" là ký tự cộng, không phải space;
    // presigned SigV4 gắn với URI đã mã hóa — không thể đổi %20 → + mà không làm hỏng chữ ký.
    return url;
  } catch (err) {
    console.error('[S3] getSignedUrl lỗi:', err.message, '| key:', fullKey, '| bucket:', s3Config.bucket);
    return null;
  }
}

/**
 * Get object body stream from S3 (để proxy stream cho frontend, tránh CORS).
 * @param {string} s3Key - key lưu trong DB
 * @returns {Promise<{ Body: import('stream').Readable, ContentType?: string } | null>}
 */
export async function getObjectStream(s3Key) {
  const client = getClient();
  if (!client || !s3Key) return null;
  const fullKey = resolveS3Key(s3Key);
  try {
    const cmd = new GetObjectCommand({
      Bucket: s3Config.bucket,
      Key: fullKey
    });
    const result = await client.send(cmd);
    return {
      Body: result.Body,
      ContentType: result.ContentType || undefined
    };
  } catch (err) {
    console.error('[S3] getObjectStream lỗi:', err.message, '| key:', fullKey);
    return null;
  }
}

/**
 * Delete object from S3.
 * @param {string} s3Key - key lưu trong DB (sẽ tự thêm prefix nếu cấu hình)
 * @returns {Promise<void>}
 */
export async function deleteFileFromS3(s3Key) {
  const client = getClient();
  if (!client || !s3Key) return;

  const fullKey = resolveS3Key(s3Key);
  await client.send(new DeleteObjectCommand({
    Bucket: s3Config.bucket,
    Key: fullKey
  }));
}

/**
 * Kiểm tra object có tồn tại trên bucket (HeadObject).
 * Chỉ dùng cho key được coi là S3 (isS3Key). resolveS3Key giống GetObject.
 * @param {string} storedPath - key/path lưu trong DB
 * @returns {Promise<boolean>} true nếu tồn tại, false nếu 404
 * @throws {Error} lỗi khác (AccessDenied, network, …)
 */
export async function s3ObjectExists(storedPath) {
  const client = getClient();
  if (!client || !storedPath || typeof storedPath !== 'string') {
    throw new Error('s3ObjectExists: S3 chưa cấu hình hoặc path rỗng');
  }
  if (!isS3Key(storedPath)) {
    throw new Error('s3ObjectExists: path không phải S3 key (local/uploads?)');
  }
  const fullKey = resolveS3Key(storedPath);
  try {
    await client.send(new HeadObjectCommand({
      Bucket: s3Config.bucket,
      Key: fullKey
    }));
    return true;
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err?.name === 'NotFound' || err?.Code === 'NotFound' || err?.name === 'NoSuchKey') {
      return false;
    }
    throw err;
  }
}

export const s3Enabled = () => isEnabled;

export default {
  uploadFileToS3,
  uploadBufferToS3,
  buildS3Key,
  buildCvTemplatePdfKey,
  buildCvRirekishoPdfKey,
  buildCvShokumuPdfKey,
  buildCvOriginalKey,
  getCvSnapshotDateTime,
  buildCvSnapshotPrefix,
  buildCvOriginalFolderKey,
  buildCvTemplateFolderKey,
  buildCvAvatarFolderKey,
  buildCvTemplateFileKey,
  uploadCvAvatarToSnapshot,
  isFolderPath,
  uploadCvOriginalsToSnapshot,
  listCvSnapshotDateTimes,
  copyCvOriginalsToNewSnapshot,
  copySingleFileToCvOriginalSnapshot,
  copyCvTemplatesToNewSnapshot,
  listKeysUnderPrefix,
  buildJdTemplatePdfKey,
  buildJdFileKey,
  buildMessageAttachmentKey,
  isS3Key,
  makeDownloadDisposition,
  getSignedUrlForFile,
  getObjectStream,
  deleteFileFromS3,
  s3ObjectExists,
  s3Enabled
};
