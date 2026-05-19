import { Op } from 'sequelize';
import {
  Job,
  JobCategory,
  Company,
  WorkingLocation,
  WorkingLocationDetail,
  SalaryRange,
  SalaryRangeDetail,
  Requirement,
  JobValue,
  Type,
  Value,
  JobCampaign,
  Campaign,
  JobRecruitingCompany,
  JobRecruitingCompanyService,
  JobRecruitingCompanyBusinessSector
} from '../models/index.js';
import sequelize from '../config/database.js';
import { parseDateOnlyQuery } from '../utils/parseDateOnlyQuery.js';
import { decodeJobCursor, encodeJobCursor, primaryValueFromRow } from '../utils/jobCursorPagination.js';
import { getJobListCached, setJobListCached } from './jobListCache.js';

export const MAX_JOB_LIST_LIMIT = 50;

const mapOrderField = (fieldName) => {
  const fieldMap = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deadline: 'deadline',
    viewsCount: 'views_count',
    jobCode: 'job_code'
  };
  return fieldMap[fieldName] || fieldName;
};

const LIST_JOB_ATTRIBUTES = [
  'id',
  'jobCode',
  'jobCategoryId',
  'title',
  'titleEn',
  'titleJp',
  'slug',
  'description',
  'descriptionEn',
  'descriptionJp',
  'instruction',
  'instructionEn',
  'instructionJp',
  'recruitmentReason',
  'recruitmentReasonEn',
  'recruitmentReasonJp',
  'highlights',
  'deadline',
  'status',
  'isPinned',
  'isHot',
  'viewsCount',
  'companyId',
  'jobCommissionType',
  'jdFile',
  'jdFileEn',
  'jdFileJp',
   'jdOriginalFile',
  'requiredCvForm',
  'createdAt',
  'updatedAt',
  'recruitmentType',
  'interviewLocation'
];

function clampLimit(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.min(n, MAX_JOB_LIST_LIMIT);
}

function truncateJobTexts(jobPlain, maxLen) {
  const envRaw = parseInt(process.env.JOB_LIST_DESC_MAX_CHARS || '6000', 10);
  const fromEnv = Number.isFinite(envRaw) && envRaw > 0 ? envRaw : 6000;
  const fromArg = maxLen != null && Number.isFinite(Number(maxLen)) && Number(maxLen) > 0 ? Number(maxLen) : null;
  const m = fromArg ?? fromEnv;
  const cap = (s) => {
    if (s == null || typeof s !== 'string') return s;
    return s.length > m ? `${s.slice(0, m)}…` : s;
  };
  for (const k of [
    'description',
    'descriptionEn',
    'descriptionJp',
    'instruction',
    'instructionEn',
    'instructionJp',
    'recruitmentReason',
    'recruitmentReasonEn',
    'recruitmentReasonJp',
    'highlights'
  ]) {
    if (jobPlain[k]) jobPlain[k] = cap(jobPlain[k]);
  }
  return jobPlain;
}

function buildCursorWhereClause(cursorDecoded, sortField, orderDirection, pinFirst) {
  const { id: cid, primaryValue: pv, isPinned: curPin } = cursorDecoded;
  const opPrimary = orderDirection === 'DESC' ? Op.lt : Op.gt;
  const opId = orderDirection === 'DESC' ? Op.lt : Op.gt;
  const eq = Op.eq;
  const innerSort = {
    [Op.or]: [
      { [sortField]: { [opPrimary]: pv } },
      { [Op.and]: [{ [sortField]: { [eq]: pv } }, { id: { [opId]: cid } }] }
    ]
  };
  if (!pinFirst || (curPin !== 0 && curPin !== 1)) {
    return innerSort;
  }
  if (curPin === 1) {
    return {
      [Op.or]: [
        { isPinned: false },
        { [Op.and]: [{ isPinned: true }, innerSort] }
      ]
    };
  }
  return {
    [Op.and]: [{ isPinned: false }, innerSort]
  };
}

function applyCursorToWhere(baseWhere, cursorDecoded, sortField, orderDirection, pinFirst) {
  if (!cursorDecoded) return baseWhere;
  const clause = buildCursorWhereClause(cursorDecoded, sortField, orderDirection, pinFirst);
  if (!baseWhere || Object.keys(baseWhere).length === 0) return clause;
  return { [Op.and]: [baseWhere, clause] };
}

const likePat = (q) =>
  `%${String(q)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')}%`;

/**
 * @param {object} query - req.query
 * @param {{ mode: 'admin'|'ctv', defaultStatus?: number|undefined, defaultSortOrder?: 'ASC'|'DESC' }} opts
 */
export async function buildJobListFilterState(query, opts) {
  const {
    search,
    status,
    jobCategoryId,
    jobCategoryIds,
    campaignId: campaignIdRaw,
    hasCampaign: hasCampaignRaw,
    /** Lọc job thuộc job pick-up (bảng job_pickups_id) — dùng cùng param với AgentJobsPageSession2 (pickupId) */
    pickupId: pickupIdRaw,
    companyId,
    isPinned,
    isHot,
    deadlineFrom,
    deadlineTo,
    from: queryDeadlineFromAlt,
    to: queryDeadlineToAlt,
    minSalary,
    maxSalary,
    workingLocation,
    location,
    locations,
    sectorNames,
    recruitmentType,
    recruitmentLocation,
    sortBy: sortByRawQ,
    sortOrder: sortOrderRawQ
  } = query;

  let sortByRaw = sortByRawQ ?? 'id';
  if (sortByRaw === 'created_at') sortByRaw = 'createdAt';
  if (sortByRaw === 'updated_at') sortByRaw = 'updatedAt';
  if (sortByRaw === 'views_count') sortByRaw = 'viewsCount';
  if (sortByRaw === 'job_code') sortByRaw = 'jobCode';

  const sortOrderRaw = sortOrderRawQ ?? opts.defaultSortOrder ?? 'ASC';

  const deadlineFromParsed =
    parseDateOnlyQuery(deadlineFrom) ?? parseDateOnlyQuery(queryDeadlineFromAlt);
  const deadlineToParsed =
    parseDateOnlyQuery(deadlineTo) ?? parseDateOnlyQuery(queryDeadlineToAlt);

  const where = {};

  if (opts.mode === 'ctv') {
    if (status !== undefined && status !== '') {
      where.status = parseInt(status, 10);
    } else {
      where.status = opts.defaultStatus ?? 1;
    }
  } else if (status !== undefined && status !== '') {
    where.status = parseInt(status, 10);
  }

  if (search) {
    const searchPattern = `%${search}%`;
    let recruitingCompanyJobIds = [];
    try {
      const [rcResults] = await sequelize.query(
        `
        SELECT DISTINCT job_id FROM job_recruiting_companies
        WHERE deleted_at IS NULL
          AND (company_name LIKE ? OR company_name_en LIKE ? OR company_name_jp LIKE ?)
 `,
        { replacements: [searchPattern, searchPattern, searchPattern] }
      );
      recruitingCompanyJobIds = rcResults.map((r) => r.job_id);
    } catch {
      recruitingCompanyJobIds = [];
    }
    where[Op.or] = [
      { title: { [Op.like]: searchPattern } },
      { jobCode: { [Op.like]: searchPattern } },
      { slug: { [Op.like]: searchPattern } },
      ...(recruitingCompanyJobIds.length > 0 ? [{ id: { [Op.in]: recruitingCompanyJobIds } }] : [])
    ];
  }

  const categoryIdList = jobCategoryIds
    ? String(jobCategoryIds)
        .split(',')
        .map((s) => parseInt(String(s).trim(), 10))
        .filter((n) => !Number.isNaN(n))
    : [];
  if (categoryIdList.length > 0) {
    where.jobCategoryId = { [Op.in]: categoryIdList };
  } else if (jobCategoryId) {
    where.jobCategoryId = parseInt(jobCategoryId, 10);
  }

  if (companyId) {
    where.companyId = parseInt(companyId, 10);
  }

  if (campaignIdRaw != null && campaignIdRaw !== '') {
    const cid = parseInt(campaignIdRaw, 10);
    if (!Number.isNaN(cid)) {
      const existsInCampaign = sequelize.literal(
        `(EXISTS (SELECT 1 FROM job_campaigns jc WHERE jc.job_id = Job.id AND jc.campaign_id = ${cid} AND jc.deleted_at IS NULL))`
      );
      where[Op.and] = [...(where[Op.and] || []), existsInCampaign];
    }
  }

  if (hasCampaignRaw !== undefined && hasCampaignRaw !== null && String(hasCampaignRaw).trim() !== '') {
    const hc = String(hasCampaignRaw).toLowerCase();
    const wantAnyCampaign = hc === '1' || hc === 'true' || hc === 'yes';
    if (wantAnyCampaign) {
      const existsAnyCampaign = sequelize.literal(
        `(EXISTS (SELECT 1 FROM job_campaigns jc WHERE jc.job_id = Job.id AND jc.deleted_at IS NULL))`
      );
      where[Op.and] = [...(where[Op.and] || []), existsAnyCampaign];
    }
  }

  if (pickupIdRaw != null && String(pickupIdRaw).trim() !== '') {
    const jpid = parseInt(String(pickupIdRaw), 10);
    if (!Number.isNaN(jpid) && jpid > 0) {
      const existsInPickup = sequelize.literal(
        `(EXISTS (SELECT 1 FROM job_pickups_id jpi WHERE jpi.id_job = Job.id AND jpi.id_job_pickups = ${jpid} AND jpi.deleted_at IS NULL))`
      );
      where[Op.and] = [...(where[Op.and] || []), existsInPickup];
    }
  }

  if (isPinned !== undefined && isPinned !== '') {
    where.isPinned = isPinned === 'true' || isPinned === '1' || isPinned === 1;
  }

  if (isHot !== undefined && isHot !== '') {
    where.isHot = isHot === 'true' || isHot === '1' || isHot === 1;
  }

  if (deadlineFromParsed || deadlineToParsed) {
    where.deadline = {};
    if (deadlineFromParsed) {
      where.deadline[Op.gte] = deadlineFromParsed;
    }
    if (deadlineToParsed) {
      where.deadline[Op.lte] = deadlineToParsed;
    }
  }

  if (opts.mode === 'ctv' && recruitmentType !== undefined && recruitmentType !== '') {
    where.recruitmentType = parseInt(recruitmentType, 10);
  }

  if (recruitmentLocation !== undefined && recruitmentLocation !== null && String(recruitmentLocation).trim() !== '') {
    const rl = parseInt(String(recruitmentLocation), 10);
    if (Number.isFinite(rl) && rl >= 1 && rl <= 4) {
      where.interviewLocation = rl;
    }
  }

  const locationStrings = (() => {
    if (locations != null && String(locations).trim() !== '') {
      return String(locations)
        .split('|||')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const single = workingLocation || location;
    return single ? [String(single)] : [];
  })();

  const hasSalaryFilter =
    (minSalary != null && minSalary !== '') || (maxSalary != null && maxSalary !== '');
  const salaryWhere = [];
  if (hasSalaryFilter) {
    const minVal = minSalary != null && minSalary !== '' ? parseFloat(minSalary) : null;
    const maxVal = maxSalary != null && maxSalary !== '' ? parseFloat(maxSalary) : null;
    const col = '`salary_ranges`.`salary_range`';
    if (maxVal != null && !Number.isNaN(maxVal)) {
      salaryWhere.push(
        sequelize.literal(`CAST(SUBSTRING_INDEX(${col}, '-', 1) AS UNSIGNED) <= ${maxVal}`)
      );
    }
    if (minVal != null && !Number.isNaN(minVal)) {
      salaryWhere.push(
        sequelize.literal(`CAST(SUBSTRING_INDEX(${col}, '-', -1) AS UNSIGNED) >= ${minVal}`)
      );
    }
  }

  const sectorNameList = sectorNames
    ? String(sectorNames)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (locationStrings.length > 0) {
    const existsClauses = locationStrings.map((q) => {
      const esc = sequelize.escape(likePat(q));
      return sequelize.literal(`(
        EXISTS (
          SELECT 1 FROM working_locations wl
          WHERE wl.job_id = Job.id AND wl.deleted_at IS NULL
          AND (wl.location LIKE ${esc} ESCAPE '\\\\' OR wl.location_en LIKE ${esc} ESCAPE '\\\\' OR wl.location_jp LIKE ${esc} ESCAPE '\\\\')
        )
        OR EXISTS (
          SELECT 1 FROM working_location_details wld
          WHERE wld.job_id = Job.id AND wld.deleted_at IS NULL
          AND (wld.content LIKE ${esc} ESCAPE '\\\\' OR wld.content_en LIKE ${esc} ESCAPE '\\\\' OR wld.content_jp LIKE ${esc} ESCAPE '\\\\')
        )
      )`);
    });
    where[Op.and] = [...(where[Op.and] || []), { [Op.or]: existsClauses }];
  }

  const allowedSortFields = [
    'id',
    'title',
    'jobCode',
    'createdAt',
    'updatedAt',
    'deadline',
    'viewsCount'
  ];
  const sortField = allowedSortFields.includes(sortByRaw) ? sortByRaw : 'id';
  const orderDirection = String(sortOrderRaw).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const dbSortField = mapOrderField(sortField);
  const orderClause = [['isPinned', 'DESC'], [dbSortField, orderDirection]];
  if (sortField !== 'id') {
    orderClause.push(['id', orderDirection]);
  }

  return {
    where,
    salaryWhere,
    sectorNameList,
    locationStrings,
    sortField,
    orderDirection,
    dbSortField,
    orderClause,
    pinFirst: true
  };
}

function recruitingCompanyInclude(sectorNameList) {
  return {
    model: JobRecruitingCompany,
    as: 'recruitingCompany',
    required: sectorNameList.length > 0,
    attributes: [
      'id',
      'jobId',
      'companyName',
      'companyNameEn',
      'companyNameJp'
    ],
    include: [
      {
        model: JobRecruitingCompanyService,
        as: 'services',
        required: false,
        attributes: ['id', 'serviceName', 'order'],
        order: [['order', 'ASC']]
      },
      {
        model: JobRecruitingCompanyBusinessSector,
        as: 'businessSectors',
        required: sectorNameList.length > 0,
        attributes: ['id', 'sectorName', 'order'],
        order: [['order', 'ASC']],
        ...(sectorNameList.length > 0
          ? { where: { sectorName: { [Op.in]: sectorNameList } } }
          : {})
      }
    ]
  };
}

function workingLocationInclude() {
  return {
    model: WorkingLocation,
    as: 'workingLocations',
    required: false,
    attributes: ['id', 'location', 'locationEn', 'locationJp', 'country', 'countryEn', 'countryJp']
  };
}

function buildIncludes({ mode, salaryWhere, sectorNameList }) {
  const reqInclude =
    mode === 'ctv'
      ? {
          model: Requirement,
          as: 'requirements',
          required: false,
          attributes: ['id', 'content', 'contentEn', 'contentJp', 'type', 'status'],
          where: {
            type: { [Op.in]: ['technique', 'education', 'application'] }
          }
        }
      : {
          model: Requirement,
          as: 'requirements',
          required: false,
          attributes: ['id', 'content', 'contentEn', 'contentJp', 'type', 'status']
        };

  return [
    {
      model: JobCategory,
      as: 'category',
      required: false,
      attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug']
    },
    {
      model: Company,
      as: 'company',
      required: false,
      attributes: ['id', 'name', 'nameEn', 'nameJp', 'companyCode', 'logo']
    },
    recruitingCompanyInclude(sectorNameList),
    {
      model: JobValue,
      as: 'jobValues',
      required: false,
      attributes: ['id', 'jobId', 'typeId', 'valueId', 'value', 'isRequired', 'viewOnCollaborator'],
      include: [
        {
          model: Type,
          as: 'type',
          required: false,
          attributes: ['id', 'typename', 'cvField']
        },
        {
          model: Value,
          as: 'valueRef',
          required: false,
          attributes: ['id', 'valuename', 'valuenameEn', 'valuenameJp']
        }
      ]
    },
    reqInclude,
    {
      model: JobCampaign,
      as: 'jobCampaigns',
      required: false,
      attributes: ['id', 'campaignId', 'jobId'],
      paranoid: true,
      include: [
        {
          model: Campaign,
          as: 'campaign',
          required: false,
          attributes: ['id', 'name', 'percent']
        }
      ]
    },
    workingLocationInclude(),
    {
      model: WorkingLocationDetail,
      as: 'workingLocationDetails',
      required: false,
      attributes: ['id', 'content', 'contentEn', 'contentJp']
    },
    {
      model: SalaryRange,
      as: 'salaryRanges',
      required: salaryWhere.length > 0,
      attributes: ['id', 'salaryRange', 'salaryRangeEn', 'salaryRangeJp', 'type'],
      ...(salaryWhere.length > 0 ? { where: { [Op.and]: salaryWhere } } : {})
    },
    {
      model: SalaryRangeDetail,
      as: 'salaryRangeDetails',
      required: false,
      attributes: ['id', 'content', 'contentEn', 'contentJp']
    }
  ];
}

async function attachApplicationsCount(rows) {
  const jobIds = rows.map((j) => j.id);
  if (jobIds.length === 0) return;
  const counts = await sequelize.query(
    `SELECT job_id AS jobId, COUNT(*) AS cnt
     FROM job_applications
     WHERE deleted_at IS NULL AND job_id IN (?)
     GROUP BY job_id`,
    { replacements: [jobIds], type: sequelize.QueryTypes.SELECT }
  );
  const map = Object.fromEntries(counts.map((c) => [c.jobId, parseInt(c.cnt, 10)]));
  for (const job of rows) {
    job.dataValues.applicationsCount = map[job.id] || 0;
  }
}

/**
 * @returns {Promise<{ rows: any[], nextCursor: string|null, hasMore: boolean }>}
 */
export async function executeJobListQuery({
  mode,
  reqQuery,
  cursorToken,
  limitRaw,
  skipCache = false
}) {
  const limit = clampLimit(limitRaw);
  const fetchLimit = limit + 1;

  const filter = await buildJobListFilterState(reqQuery, {
    mode,
    defaultStatus: 1,
    defaultSortOrder: mode === 'ctv' ? 'DESC' : 'ASC'
  });

  let cursorDecoded = decodeJobCursor(cursorToken);
  if (
    cursorDecoded &&
    (cursorDecoded.sortField !== filter.sortField || cursorDecoded.sortOrder !== filter.orderDirection)
  ) {
    cursorDecoded = null;
  }
  if (
    filter.pinFirst &&
    cursorDecoded != null &&
    cursorDecoded.isPinned !== 0 &&
    cursorDecoded.isPinned !== 1
  ) {
    cursorDecoded = null;
  }

  const finalWhere = applyCursorToWhere(
    filter.where,
    cursorDecoded,
    filter.sortField,
    filter.orderDirection,
    filter.pinFirst
  );

  const includes = buildIncludes({
    mode,
    salaryWhere: filter.salaryWhere,
    sectorNameList: filter.sectorNameList
  });

  const cachePayload = {
    ns: mode,
    q: reqQuery,
    c: cursorToken || null,
    l: limit,
    sf: filter.sortField,
    so: filter.orderDirection,
    pf: filter.pinFirst ? 1 : 0
  };

  if (!skipCache) {
    const hit = await getJobListCached(cachePayload);
    if (hit && hit.rows && Array.isArray(hit.rows)) {
      return {
        plainRows: hit.rows,
        nextCursor: hit.nextCursor ?? null,
        hasMore: !!hit.hasMore
      };
    }
  }

  const rows = await Job.findAll({
    where: finalWhere,
    distinct: true,
    // LIMIT must apply to distinct jobs, not joined row explosion (job_values, locations, …).
    subQuery: true,
    attributes: LIST_JOB_ATTRIBUTES,
    include: includes,
    limit: fetchLimit,
    order: filter.orderClause
  });

  const hasMore = rows.length > fetchLimit - 1;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  if (mode === 'admin') {
    await attachApplicationsCount(slice);
  }

  let nextCursor = null;
  if (hasMore && slice.length > 0) {
    const last = slice[slice.length - 1];
    nextCursor = encodeJobCursor({
      sortField: filter.sortField,
      sortOrder: filter.orderDirection,
      id: last.id,
      primaryValue: primaryValueFromRow(last, filter.sortField),
      isPinned: last.isPinned ? 1 : 0
    });
  }

  const plainRows = jobsToPlainWithTruncate(slice, { isAdmin: mode === 'admin' });
  if (!skipCache) {
    await setJobListCached(cachePayload, { rows: plainRows, nextCursor, hasMore });
  }

  return { plainRows, nextCursor, hasMore };
}

export function jobsToPlainWithTruncate(rows, { isAdmin } = {}) {
  return rows.map((job) => {
    const plain = job.toJSON ? job.toJSON() : { ...job };
    if (isAdmin) {
      plain.applicationsCount = job.dataValues?.applicationsCount ?? plain.applicationsCount ?? 0;
    }
    return truncateJobTexts(plain, null);
  });
}

const allowedIdsSortFields = ['id', 'createdAt', 'updatedAt', 'deadline', 'viewsCount', 'title'];

export async function executeJobListInIdsQuery({
  jobIds,
  reqQuery,
  cursorToken,
  limitRaw,
  status = 1,
  skipCache = false
}) {
  if (!jobIds || jobIds.length === 0) {
    return { plainRows: [], nextCursor: null, hasMore: false };
  }

  const limit = clampLimit(limitRaw);
  const fetchLimit = limit + 1;
  let sortBy = reqQuery.sortBy ?? 'id';
  if (sortBy === 'created_at') sortBy = 'createdAt';
  if (sortBy === 'updated_at') sortBy = 'updatedAt';
  if (sortBy === 'views_count') sortBy = 'viewsCount';

  const sortOrder = reqQuery.sortOrder ?? 'DESC';

  const sortField = allowedIdsSortFields.includes(sortBy) ? sortBy : 'id';
  const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const dbSortField = mapOrderField(sortField);
  const orderClause = [['isPinned', 'DESC'], [dbSortField, orderDirection]];
  if (sortField !== 'id') {
    orderClause.push(['id', orderDirection]);
  }
  const pinFirst = true;

  let cursorDecoded = decodeJobCursor(cursorToken);
  if (
    cursorDecoded &&
    (cursorDecoded.sortField !== sortField || cursorDecoded.sortOrder !== orderDirection)
  ) {
    cursorDecoded = null;
  }
  if (
    pinFirst &&
    cursorDecoded != null &&
    cursorDecoded.isPinned !== 0 &&
    cursorDecoded.isPinned !== 1
  ) {
    cursorDecoded = null;
  }

  const baseWhere = {
    id: { [Op.in]: jobIds },
    ...(status != null ? { status } : {})
  };

  const finalWhere = applyCursorToWhere(baseWhere, cursorDecoded, sortField, orderDirection, pinFirst);

  const cachePayload = {
    ns: 'ctv-in-ids',
    ids: jobIds.slice().sort((a, b) => a - b).slice(0, 200),
    q: reqQuery,
    c: cursorToken || null,
    l: limit,
    pf: 1
  };

  if (!skipCache && jobIds.length <= 500) {
    const hit = await getJobListCached(cachePayload);
    if (hit && hit.rows && Array.isArray(hit.rows)) {
      return {
        plainRows: hit.rows,
        nextCursor: hit.nextCursor ?? null,
        hasMore: !!hit.hasMore
      };
    }
  }

  const includes = buildIncludes({
    mode: 'ctv',
    salaryWhere: [],
    sectorNameList: []
  });

  const rows = await Job.findAll({
    where: finalWhere,
    distinct: true,
    subQuery: true,
    attributes: LIST_JOB_ATTRIBUTES,
    include: includes,
    limit: fetchLimit,
    order: orderClause
  });

  const hasMore = rows.length > fetchLimit - 1;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor = null;
  if (hasMore && slice.length > 0) {
    const last = slice[slice.length - 1];
    nextCursor = encodeJobCursor({
      sortField,
      sortOrder: orderDirection,
      id: last.id,
      primaryValue: primaryValueFromRow(last, sortField),
      isPinned: last.isPinned ? 1 : 0
    });
  }

  const plainRows = jobsToPlainWithTruncate(slice, { isAdmin: false });
  if (!skipCache && jobIds.length <= 500) {
    await setJobListCached(cachePayload, { rows: plainRows, nextCursor, hasMore });
  }
  return { plainRows, nextCursor, hasMore };
}
