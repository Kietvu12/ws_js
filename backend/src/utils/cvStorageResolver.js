/**
 * Resolve CV file path/key for view/download when storage uses snapshot folders.
 * Supports folder paths (CV_Template, CV_original) with template/document/index params and legacy single-file paths.
 */
import { isFolderPath, isS3Key, listKeysUnderPrefix } from '../services/s3Service.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Resolve the effective file path (local) or S3 key for a CV file.
 * @param {Object} cv - CV model instance with curriculumVitae, cvOriginalPath, cvCareerHistoryPath, otherDocuments
 * @param {string} fileType - 'curriculumVitae' | 'cvOriginalPath' | 'cvCareerHistoryPath' | 'otherDocuments'
 * @param {Object} query - { template?, document?, index? }
 * @param {string} [backendRoot] - backend root for local path resolution (required for local CV_original listing)
 * @returns {Promise<{ pathOrKey: string, isS3: boolean } | null>}
 */
export async function resolveCvFileForView(cv, fileType, query = {}, backendRoot = '') {
  if (fileType === 'avatarPhoto' || fileType === 'avatar_photo') {
    const p = cv.avatarPhotoPath;
    if (!p) return null;
    return { pathOrKey: p, isS3: isS3Key(p) };
  }

  let storedPath;
  let forceDocument = null;
  if (fileType === 'cvCareerHistoryPath') {
    storedPath = cv.curriculumVitae || cv.cvCareerHistoryPath;
    forceDocument = 'shokumu';
  } else if (fileType === 'curriculumVitae') {
    storedPath = cv.curriculumVitae;
  } else if (fileType === 'cvOriginalPath') {
    storedPath = cv.cvOriginalPath;
  } else if (fileType === 'otherDocuments') {
    storedPath = cv.otherDocuments;
  } else {
    storedPath = cv.curriculumVitae;
  }

  if (!storedPath) return null;

  if (!isFolderPath(storedPath)) {
    return { pathOrKey: storedPath, isS3: isS3Key(storedPath) };
  }

  if (storedPath.includes('CV_Template')) {
    const template = query.template || 'Common';
    const document = forceDocument || query.document || 'rirekisho';
    const pathOrKey = `${storedPath.replace(/\/+$/, '')}/${template}/cv-${document}.pdf`;
    return { pathOrKey, isS3: isS3Key(storedPath) };
  }

  if (storedPath.includes('CV_original')) {
    const index = Math.max(0, parseInt(query.index, 10) || 0);
    if (isS3Key(storedPath)) {
      const keys = await listKeysUnderPrefix(storedPath);
      keys.sort();
      const pathOrKey = keys[index];
      if (!pathOrKey) return null;
      return { pathOrKey, isS3: true };
    }
    if (!backendRoot) return null;
    const fullDir = path.join(backendRoot, storedPath.replace(/^\//, ''));
    let entries;
    try {
      entries = await fs.readdir(fullDir);
    } catch {
      return null;
    }
    entries.sort();
    const f = entries[index];
    if (!f) return null;
    const pathOrKey = storedPath.replace(/\/+$/, '') + '/' + f;
    return { pathOrKey, isS3: false };
  }

  return { pathOrKey: storedPath, isS3: isS3Key(storedPath) };
}
