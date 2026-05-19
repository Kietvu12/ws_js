import { CVStorage } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { CV_STATUS_NEW, CV_STATUS_DUPLICATE, CV_STATUS_OVERDUE_6_MONTHS } from '../constants/cvStatus.js';
import { normalizeCvEmail, normalizeCvPhone } from './cvIdentityNormalize.js';

/** Số tháng để coi h�� sơ là quá hạn nếu không có lịch sử xử lý */
const OVERDUE_MONTHS = 6;

/**
 * H���p lệ (gốc trùng / đ�� điều kiện quá hạn tự động): status=1, không trùng, duplicate_with_cv_id NULL.
 */
export function canonicalValidCvWhereParts() {
  return [
    { status: CV_STATUS_NEW },
    { isDuplicate: false },
    { duplicateWithCvId: null },
  ];
}

/**
 * Cung bo ba so huu (collaborator_id, applicant_id, admin_id) — NULL khop dung trong SQL.
 * @param {import('../models/index.js').CVStorage} cv
 */
export function whereSameCvOwnershipTriple(cv) {
  const parts = [];
  for (const key of ['collaboratorId', 'applicantId', 'adminId']) {
    const v = cv[key];
    if (v == null) {
      parts.push({ [key]: { [Op.is]: null } });
    } else {
      parts.push({ [key]: v });
    }
  }
  return { [Op.and]: parts };
}

/**
 * ��iều kiện WHERE: trùng nếu **cùng email (chu��n hóa) HO��C cùng SĐ�n hóa)** — khớp `normalizeCvEmail` / `normalizeCvPhone`.
 * @returns {object|null}
 */
export function buildCvDuplicateMatchWhere(emailRaw, phoneRaw) {
  const e = normalizeCvEmail(emailRaw ?? '');
  const p = normalizeCvPhone(phoneRaw ?? '');
  const parts = [];
  if (e) {
    parts.push(
      sequelize.where(
        sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('CVStorage.email'))),
        e
      )
    );
  }
  if (p) {
    const phoneNormExpr = sequelize.literal(
      "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(IFNULL(`CVStorage`.`phone`,'')),' ',''),'-',''),'.',''),'(',''),')',''),'+','')"
    );
    parts.push(sequelize.where(phoneNormExpr, p));
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return { [Op.or]: parts };
}

/**
 * Tim CV hop le (status=1, isDuplicate=0, duplicateWithCvId=null) trung email/SDT; tra ve ban cu nhat.
 */
export async function checkDuplicateCV(name, email, phone) {
  const whereDup = buildCvDuplicateMatchWhere(email, phone);
  if (!whereDup) return null;

  const duplicateCVs = await CVStorage.findAll({
    where: {
      [Op.and]: [whereDup, ...canonicalValidCvWhereParts()],
    },
    order: [[sequelize.col('CVStorage.created_at'), 'ASC']],
  });

  return duplicateCVs.length > 0 ? duplicateCVs[0] : null;
}

/**
 * Khi cập nhật CV: nếu email/SĐT sau merge trùng một bản canonical hợp lệ **khác** `excludeCvId` → conflict (không cho lưu).
 */
export async function findCanonicalDuplicateConflictForUpdate(excludeCvId, name, email, phone) {
  const dup = await checkDuplicateCV(name, email, phone);
  if (!dup) return null;
  const ex = excludeCvId != null && excludeCvId !== '' ? Number(excludeCvId) : NaN;
  if (!Number.isNaN(ex) && Number(dup.id) === ex) return null;
  return dup;
}

/**
 * Trùng trong phạm vi CV do ��ng viên tự tạo — gốc ch�� lấy h��p lệ.
 */
export async function checkDuplicateAmongApplicantOwnedCVs(email, phone, excludeCvId = null) {
  const whereDup = buildCvDuplicateMatchWhere(email, phone);
  if (!whereDup) return null;

  const andParts = [whereDup, { applicantId: { [Op.ne]: null } }, ...canonicalValidCvWhereParts()];
  if (excludeCvId != null) {
    andParts.push({ id: { [Op.ne]: excludeCvId } });
  }

  const duplicateCVs = await CVStorage.findAll({
    where: { [Op.and]: andParts },
    order: [[sequelize.col('CVStorage.created_at'), 'ASC']],
  });

  return duplicateCVs.length > 0 ? duplicateCVs[0] : null;
}

/**
 * Xử lý khi phát hiện CV trùng.
 */
export async function handleDuplicateCV(duplicateCV, newCV) {
  newCV.status = CV_STATUS_DUPLICATE;
  newCV.isDuplicate = true;
  newCV.duplicateWithCvId = duplicateCV.id;
  await newCV.save();

  await revertPromotedInactiveCVs(newCV.email, newCV.phone, newCV.id, duplicateCV.id);

  return {
    isDuplicate: true,
    duplicateWithCvId: duplicateCV.id,
    message: 'CV bi trung voi CV da ton tai, khong the dung de tao don tien cu',
  };
}

/**
 * Không khả dụng → trùng, tr�� về newDuplicateWithId (CV h��p lệ mới hoặc gốc trùng).
 */
export async function revertPromotedInactiveCVs(email, phone, excludeCvId = null, newDuplicateWithId = null) {
  const whereDup = buildCvDuplicateMatchWhere(email, phone);
  if (!whereDup) return 0;

  const andParts = [
    whereDup,
    { status: CV_STATUS_NEW },
    { isDuplicate: false },
    { duplicateWithCvId: { [Op.ne]: null } },
  ];
  if (excludeCvId != null) {
    andParts.push({ id: { [Op.ne]: excludeCvId } });
  }

  const promotedCVs = await CVStorage.findAll({
    where: { [Op.and]: andParts },
  });

  let reverted = 0;
  for (const cv of promotedCVs) {
    cv.status = CV_STATUS_DUPLICATE;
    cv.isDuplicate = true;
    if (newDuplicateWithId != null) {
      cv.duplicateWithCvId = newDuplicateWithId;
    }
    await cv.save();
    reverted++;
  }
  return reverted;
}

/**
 * Canonical thanh qua han: ban trung (3, isDuplicate) -> khong kha dung (1, !isDup, giu duplicateWithCvId).
 */
export async function promoteDuplicatesWhenCanonicalMarkedOverdue(canonicalCvId) {
  const duplicates = await CVStorage.findAll({
    where: {
      duplicateWithCvId: canonicalCvId,
      status: CV_STATUS_DUPLICATE,
      isDuplicate: true,
    },
    order: [['created_at', 'DESC']],
  });

  let promoted = 0;
  for (const dup of duplicates) {
    dup.status = CV_STATUS_NEW;
    dup.isDuplicate = false;
    await dup.save();
    promoted++;
  }
  return promoted;
}

/**
 * Canonical tu qua han (4) ve hop le (1): khong kha dung tro ve id nay -> trung lai.
 */
export async function revertUnavailableToDuplicatesForCanonical(canonicalCvId) {
  const rows = await CVStorage.findAll({
    where: {
      duplicateWithCvId: canonicalCvId,
      status: CV_STATUS_NEW,
      isDuplicate: false,
    },
  });

  let reverted = 0;
  for (const r of rows) {
    if (r.duplicateWithCvId == null) continue;
    r.status = CV_STATUS_DUPLICATE;
    r.isDuplicate = true;
    r.duplicateWithCvId = canonicalCvId;
    await r.save();
    reverted++;
  }
  return reverted;
}

/**
 * Scheduler / POST mark-overdue: chi canonical hop le (1, !dup, dupWith null) du tuoi -> 4; promote ban trung 3.
 */
export async function markOverdueCVsAndPromoteDuplicates() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - OVERDUE_MONTHS);

  const cvs = await CVStorage.findAll({
    where: {
      [Op.and]: [
        sequelize.where(sequelize.col('CVStorage.created_at'), Op.lt, sixMonthsAgo),
        ...canonicalValidCvWhereParts(),
      ],
    },
  });

  let markedOverdue = 0;
  let promoted = 0;

  for (const cv of cvs) {
    cv.status = CV_STATUS_OVERDUE_6_MONTHS;
    await cv.save();
    markedOverdue++;
    promoted += await promoteDuplicatesWhenCanonicalMarkedOverdue(cv.id);
  }

  return { markedOverdue, promoted };
}

/**
 * Không khả dụng cùng identity + cùng bộ ba (collaborator_id, applicant_id, admin_id) với `cv`.
 */
export async function findPromotedInactiveForSameRecordOwnership(email, phone, cv, excludeCvId = null) {
  const whereDup = buildCvDuplicateMatchWhere(email, phone);
  if (!whereDup) return [];

  const andParts = [
    whereDup,
    whereSameCvOwnershipTriple(cv),
    { status: CV_STATUS_NEW },
    { isDuplicate: false },
    { duplicateWithCvId: { [Op.ne]: null } },
  ];
  if (excludeCvId != null) {
    andParts.push({ id: { [Op.ne]: excludeCvId } });
  }

  return CVStorage.findAll({ where: { [Op.and]: andParts } });
}

/**
 * Sau create: xóa mềm không khả dụng cùng bộ ba; check trùng canonical; nếu không trùng thì kéo mọi không khả dụng còn lại về trùng tr�� bản mới.
 */
export async function runCvDuplicatePipelineAfterCreate(cv) {
  const email = cv.email;
  const phone = cv.phone;
  const name = cv.name;
  if (!email && !phone) return { duplicateResult: null };

  const ownUnavailable = await findPromotedInactiveForSameRecordOwnership(email, phone, cv, cv.id);
  for (const row of ownUnavailable) {
    await row.destroy();
  }

  const duplicateCV = await checkDuplicateCV(name, email, phone);
  let duplicateResult = null;
  if (duplicateCV && duplicateCV.id !== cv.id) {
    duplicateResult = await handleDuplicateCV(duplicateCV, cv);
  }
  if (!duplicateResult) {
    await revertPromotedInactiveCVs(email, phone, cv.id, cv.id);
  }
  return { duplicateResult };
}

/**
 * @deprecated Dùng findPromotedInactiveForSameRecordOwnership với bản `cv` sau create.
 */
export async function findPromotedInactiveCVsOfCollaborator(email, phone, collaboratorId, excludeCvId = null) {
  const stub = { collaboratorId, applicantId: null, adminId: null };
  return findPromotedInactiveForSameRecordOwnership(email, phone, stub, excludeCvId);
}

/**
 * Canonical valid CV for same collaborator: cùng identity, h��p lệ thuần.
 */
export async function findCanonicalValidCvForCollaborator(email, phone, collaboratorId) {
  if (collaboratorId == null) return null;
  const whereDup = buildCvDuplicateMatchWhere(email, phone);
  if (!whereDup) return null;

  return CVStorage.findOne({
    where: {
      [Op.and]: [whereDup, { collaboratorId }, ...canonicalValidCvWhereParts()],
    },
    order: [[sequelize.col('CVStorage.created_at'), 'ASC']],
  });
}
