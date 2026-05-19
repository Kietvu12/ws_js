/**
 * Tính hoa hồng campaign: lấy salary_range (type=year) từ job, parse min-max, nhân với campaign.percent
 * Dùng khi job thuộc campaign và có salary range theo năm.
 * 
 * Với job không thuộc campaign hoặc không có lương năm:
 * - Lấy lương tháng × 12 × điều kiện phí (từ job_values) × level CTV
 */

function isSalaryRangeYearType(sr) {
  if (!sr) return false;
  const t = String(sr.type || '').toLowerCase().trim();
  const tjp = String(sr.typeJp || sr.type_jp || '').trim();
  const tjpLower = tjp.toLowerCase();
  if (t === 'year' || t === 'năm' || t === 'yearly') return true;
  if (tjp === '年' || tjpLower === 'year') return true;
  return false;
}

function isSalaryRangeMonthType(sr) {
  if (!sr) return false;
  const t = String(sr.type || '').toLowerCase().trim();
  const tjp = String(sr.typeJp || sr.type_jp || '').trim();
  const tjpLower = tjp.toLowerCase();
  if (t === 'month' || t === 'tháng' || t === 'monthly') return true;
  if (tjp === '月' || tjpLower === 'month') return true;
  return false;
}

/**
 * Parse chuỗi "3.000.000 - 7.500.000" hoặc "3000000-7500000" thành { min, max } (đơn vị gốc: yen/Y)
 * Dùng giá trị gốc để nhân đúng: 3.000.000 × 30% = 900.000
 * @param {string} str - Chuỗi salary_range (dạng năm, đã là đơn vị yen hoặc triệu)
 * @returns {{ min: number, max: number } | null}
 */
function parseSalaryRange(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
  if (!m) return null;
  const parseNum = (s) => {
    const cleaned = String(s).replace(/[.,]/g, '');
    const num = parseFloat(cleaned) || 0;
    const digitCount = cleaned.replace(/[^0-9]/g, '').length;
    // 7+ chữ số = đơn vị gốc (yen/Y), giữ nguyên
    if (digitCount >= 7) return num;
    // < 7 chữ số = đang là triệu, nhân 1M ra đơn vị gốc
    return num * 1000000;
  };
  const min = parseNum(m[1]);
  const max = parseNum(m[2]);
  if (min <= 0 || max <= 0) return null;
  return { min, max };
}

/**
 * Parse lương tháng dạng "23 - 61.5" hoặc "230000 - 615000" thành { min, max } (đơn vị: yen)
 * Lương tháng thường lưu ở đơn vị 万 (10,000 yen), ví dụ: 23万 = 230,000 yen
 * @param {string} str - Chuỗi salary_range dạng tháng
 * @returns {{ min: number, max: number } | null}
 */
function parseMonthlySalaryRange(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
  if (!m) return null;
  
  const parseMonthNum = (s) => {
    // Giữ dấu chấm thập phân, chỉ loại dấu phẩy
    const cleaned = String(s).replace(/,/g, '').trim();
    const num = parseFloat(cleaned) || 0;
    if (num <= 0) return 0;
    
    // Nếu số có 5+ chữ số (ví dụ: 230000, 615000) → đã là yen, giữ nguyên
    const intPart = Math.floor(num);
    const digitCount = String(intPart).length;
    if (digitCount >= 5) return num;
    
    // Nếu số nhỏ (1-3 chữ số, ví dụ: 23, 61.5) → đang là 万 (10,000), nhân 10,000
    // Lương tháng Nhật thường từ 15万 - 100万 (150,000 - 1,000,000 yen)
    if (num < 1000) return num * 10000;
    
    // Số 4 chữ số (ví dụ: 2300) → có thể là 万 × 100 format, nhân 100
    // Hoặc là số thô yen (2300 yen) → không hợp lý cho lương tháng
    // Giả sử là đơn vị 100 (230000 / 100 = 2300)
    return num * 100;
  };
  
  const min = parseMonthNum(m[1]);
  const max = parseMonthNum(m[2]);
  if (min <= 0 || max <= 0) return null;
  
  // Sanity check: lương tháng hợp lý từ 100,000 đến 2,000,000 yen
  // Nếu nằm ngoài khoảng này, có thể format sai
  if (min < 50000 || max > 5000000) return null;
  
  return { min, max };
}

/**
 * Giống frontend resolveCampaignPercentFromJob: không chỉ dùng jobCampaigns[0]
 * (JOIN / thứ tự có thể khiến phần tử đầu thiếu campaign hoặc percent).
 */
function resolveCampaignPercentFromJobData(j) {
  const rows = j?.jobCampaigns || [];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  for (const jc of rows) {
    if (!jc) continue;
    const c = jc.campaign ?? jc.Campaign;
    const raw = c != null ? c.percent : null;
    if (raw == null || raw === '') continue;
    const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : parseFloat(String(raw));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Lấy % phí từ job_values (điều kiện phí):
 * - typeId = 2 hoặc typename = 'phí' / 'commission'
 * - valueId = 6 hoặc 7 (các giá trị phí đặc biệt)
 * - Kết hợp với jobCommissionType để xác định % hay fixed
 */
function resolveFeePercentFromJobValues(j) {
  const jobValues = j?.jobValues || [];
  if (!Array.isArray(jobValues) || jobValues.length === 0) return null;

  const commissionType = String(j?.jobCommissionType ?? j?.job_commission_type ?? 'fixed').toLowerCase();
  if (commissionType !== 'percent' && commissionType !== 'percentage') return null;

  const tidOf = (jv) => Number(jv?.typeId ?? jv?.id_typename ?? jv?.type?.id ?? 0);
  const vidOf = (jv) => Number(jv?.valueId ?? jv?.valueRef?.id ?? 0);
  const tnameOf = (jv) => String(jv?.type?.typename || '').toLowerCase();

  // Tìm dòng phí phù hợp (giống logic frontend pickPrimaryCommissionJobValue)
  let feeRow = jobValues.find((jv) => vidOf(jv) === 34);
  if (!feeRow) {
    feeRow = jobValues.find(
      (jv) =>
        tidOf(jv) === 2 ||
        tnameOf(jv) === 'phí' ||
        tnameOf(jv) === 'commission' ||
        vidOf(jv) === 6 ||
        vidOf(jv) === 7
    );
  }
  if (!feeRow) return null;

  const rawValue = feeRow.value;
  if (rawValue == null || rawValue === '') return null;
  const n = parseFloat(String(rawValue));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Gắn computedCampaignCommission vào job:
 * 1. Nếu job thuộc campaign và có salary range year → tính theo campaign%
 * 2. Nếu job KHÔNG thuộc campaign (hoặc không có lương năm) và có lương tháng + điều kiện phí %
 *    → tính: lương tháng × 12 × điều kiện phí % × rank CTV
 * 
 * @param {Object} job - Job object (plain hoặc Sequelize), phải có salaryRanges, jobCampaigns, jobValues
 * @param {boolean} isAdmin - Admin thì rankMultiplier=1, CTV thì nhân rank
 * @param {number} rankMultiplier - Hệ số rank CTV (0-1), Admin = 1
 * @returns {Object} job với computedCampaignCommission nếu tính được
 */
function attachCampaignCommission(job, isAdmin = true, rankMultiplier = 1) {
  const j = job && typeof job.toJSON === 'function' ? job.toJSON() : { ...job };
  const jobCampaigns = j.jobCampaigns || [];
  const salaryRanges = j.salaryRanges || [];
  const yearRange = salaryRanges.find(isSalaryRangeYearType);
  const rawYearRange = yearRange?.salaryRange ?? yearRange?.salary_range ?? '';

  const format = (n) => {
    if (n >= 1000) return Math.round(n).toLocaleString('vi-VN');
    if (n < 1) return n.toFixed(2).replace(/\.?0+$/, '');
    if (n < 10) return n.toFixed(1).replace(/\.?0+$/, '');
    return Math.round(n).toString();
  };

  // Case 1: Job thuộc campaign và có lương năm
  if (jobCampaigns.length > 0) {
    const percent = resolveCampaignPercentFromJobData(j);
    if (percent != null && Number(percent) > 0) {
      const parsed = parseSalaryRange(rawYearRange);
      if (parsed) {
        const pct = Number(percent) / 100;
        const commissionMin = parsed.min * pct * rankMultiplier;
        const commissionMax = parsed.max * pct * rankMultiplier;
        j.computedCampaignCommission = {
          min: commissionMin,
          max: commissionMax,
          formatted: `${format(commissionMin)} - ${format(commissionMax)}`,
          salaryMin: parsed.min,
          salaryMax: parsed.max,
          percent: Number(percent),
          source: 'campaign_year'
        };
        return j;
      }
    }
  }

  // Case 2: Chỉ fallback sang lương tháng khi KHÔNG có lương năm.
  // Nếu job đã có lương năm thì tuyệt đối không dùng month × 12 để tránh
  // đẩy phí giới thiệu lên sai quy mô.
  if (parseSalaryRange(rawYearRange)) {
    return j;
  }

  // Job KHÔNG thuộc campaign (hoặc campaign không tính được)
  // và không có lương năm, nhưng có lương tháng + điều kiện phí %
  const monthRange = salaryRanges.find(isSalaryRangeMonthType);
  const rawMonthRange = monthRange?.salaryRange ?? monthRange?.salary_range ?? '';
  const parsedMonth = parseMonthlySalaryRange(rawMonthRange);
  
  if (parsedMonth) {
    const feePercent = resolveFeePercentFromJobValues(j);
    if (feePercent != null && feePercent > 0) {
      // Lương tháng × 12 → lương năm (ước tính)
      const yearlyMin = parsedMonth.min * 12;
      const yearlyMax = parsedMonth.max * 12;
      const pct = feePercent / 100;
      const commissionMin = yearlyMin * pct * rankMultiplier;
      const commissionMax = yearlyMax * pct * rankMultiplier;
      j.computedCampaignCommission = {
        min: commissionMin,
        max: commissionMax,
        formatted: `${format(commissionMin)} - ${format(commissionMax)}`,
        salaryMin: yearlyMin,
        salaryMax: yearlyMax,
        percent: feePercent,
        source: 'monthly_x12_fee'
      };
      return j;
    }
  }

  return j;
}

/**
 * Gắn computedCampaignCommission cho mảng jobs
 */
function attachCampaignCommissionToJobs(jobs, isAdmin = true, rankMultiplier = 1) {
  if (!Array.isArray(jobs)) return jobs;
  return jobs.map((job) => attachCampaignCommission(job, isAdmin, rankMultiplier));
}

export { parseSalaryRange, attachCampaignCommission, attachCampaignCommissionToJobs };
