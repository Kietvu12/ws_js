import {
  Job,
  JobValue,
  JobCampaign,
  Campaign,
  Collaborator,
  RankLevel,
  CVStorage,
  Type,
  Value
} from '../models/index.js';

/**
 * Lấy giá trị từ CV dựa trên cvField
 * @param {Object} cv - CV object
 * @param {string} cvField - Tên field trong CV (ví dụ: 'jlptLevel', 'experienceYears')
 * @returns {number|null} - Giá trị từ CV hoặc null nếu không có
 */
function getCVValue(cv, cvField) {
  if (!cv || !cvField) return null;
  const value = cv[cvField];
  return value !== null && value !== undefined ? parseFloat(value) : null;
}

/**
 * So sánh giá trị CV với điều kiện trong job value
 * @param {number} cvValue - Giá trị từ CV
 * @param {Object} valueRef - Object Value từ database có comparisonOperator, comparisonValue, comparisonValueEnd
 * @param {string} cvField - Tên field trong CV (để xác định loại so sánh: 'jlptLevel' cần đảo ngược, các field khác thì bình thường)
 * @returns {boolean} - true nếu CV value thỏa mãn điều kiện
 */
function compareValue(cvValue, valueRef, cvField) {
  if (cvValue === null || cvValue === undefined || !valueRef) return false;
  
  // Nếu không có comparison operator, không so sánh ở đây (sẽ so sánh exact match ở nơi khác)
  if (!valueRef.comparisonOperator) {
    return false;
  }
  
  const operator = valueRef.comparisonOperator;
  const compareValue = parseFloat(valueRef.comparisonValue);
  
  if (isNaN(compareValue)) return false;
  
  const cvNum = parseFloat(cvValue);
  if (isNaN(cvNum)) return false;
  
  // Đặc biệt cho JLPT: số nhỏ hơn = level cao hơn (1=N1 cao nhất, 5=N5 thấp nhất)
  const isJLPT = cvField === 'jlptLevel';
  
  switch (operator) {
    case '>=':
      return isJLPT ? cvNum <= compareValue : cvNum >= compareValue;
    case '<=':
      return isJLPT ? cvNum >= compareValue : cvNum <= compareValue;
    case '>':
      return isJLPT ? cvNum < compareValue : cvNum > compareValue;
    case '<':
      return isJLPT ? cvNum > compareValue : cvNum < compareValue;
    case '=':
      return cvNum === compareValue;
    case 'between':
      const compareValueEnd = parseFloat(valueRef.comparisonValueEnd);
      if (isNaN(compareValueEnd)) return false;
      const minValue = Math.min(compareValue, compareValueEnd);
      const maxValue = Math.max(compareValue, compareValueEnd);
      return cvNum >= minValue && cvNum <= maxValue;
    default:
      return false;
  }
}

/**
 * So sánh jobValue với CV để tìm match
 * @param {Object} jobValue - JobValue object có type, valueRef
 * @param {Object} cv - CV object
 * @returns {boolean} - true nếu jobValue match với CV
 */
function matchJobValueWithCV(jobValue, cv) {
  if (!jobValue || !jobValue.type || !cv) return false;
  
  const type = jobValue.type;
  const cvField = type.cvField;
  
  // Nếu type không có cvField, không thể so sánh
  if (!cvField) return false;
  
  const cvValue = getCVValue(cv, cvField);
  if (cvValue === null) return false;
  
  // Ưu tiên 1: So sánh với comparison operator
  if (jobValue.valueRef && jobValue.valueRef.comparisonOperator) {
    return compareValue(cvValue, jobValue.valueRef, cvField);
  }
  
  // Ưu tiên 2: Exact match với valueId
  if (jobValue.valueId === cvValue) {
    return true;
  }
  
  // Ưu tiên 3: So sánh với valuename (chỉ cho JLPT)
  if (cvField === 'jlptLevel' && jobValue.valueRef) {
    const valueName = (jobValue.valueRef.valuename || '').toUpperCase();
    const jlptMapping = {
      1: ['N1'],
      2: ['N2'],
      3: ['N3'],
      4: ['N4'],
      5: ['N5']
    };
    const cvJlptNames = jlptMapping[cvValue] || [];
    return cvJlptNames.some(name => valueName.includes(name));
  }
  
  return false;
}

/**
 * Tính toán hoa hồng cho CTV hoặc Admin
 * @param {Object} params - Tham số tính toán
 * @param {number} params.jobId - ID của job
 * @param {number} params.jobApplicationId - ID của job application
 * @param {number} params.yearlySalary - Lương năm (万円)
 * @param {number} params.collaboratorId - ID của CTV (null nếu là Admin)
 * @param {string} params.cvCode - Mã CV của ứng viên
 * @returns {Promise<number>} - Số tiền hoa hồng (Y)
 */
export async function calculateCommission({
  jobId,
  jobApplicationId,
  yearlySalary,
  collaboratorId = null,
  cvCode = null
}) {
  try {
    // Load job với các relations cần thiết
    const job = await Job.findByPk(jobId, {
      include: [
        {
          model: JobValue,
          as: 'jobValues',
          required: false,
          include: [
            {
              model: Type,
              as: 'type',
              required: false
            },
            {
              model: Value,
              as: 'valueRef',
              required: false
            }
          ]
        },
        {
          model: JobCampaign,
          as: 'jobCampaigns',
          required: false,
          include: [
            {
              model: Campaign,
              as: 'campaign',
              required: false
            }
          ]
        }
      ]
    });

    if (!job) {
      throw new Error('Job không tồn tại');
    }

    const annualSalary = parseFloat(yearlySalary) || 0; // 万円/năm

    // Kiểm tra nếu job thuộc campaign
    const activeCampaign = job.jobCampaigns?.find(jc => {
      const campaign = jc.campaign;
      if (!campaign) return false;
      const now = new Date();
      const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
      const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
      return campaign.status === 1 && 
             (!startDate || now >= startDate) && 
             (!endDate || now <= endDate);
    });

    // Nếu job thuộc campaign, dùng percent từ campaign
    if (activeCampaign && activeCampaign.campaign) {
      const campaignPercent = parseFloat(activeCampaign.campaign.percent) || 0;
      const platformCommission = annualSalary * (campaignPercent / 100);

      // Nếu là Admin tiến cử
      if (!collaboratorId) {
        return platformCommission; // Admin ăn đúng % sàn, không nhân level
      }

      // Nếu là CTV tiến cử
      const collaborator = await Collaborator.findByPk(collaboratorId, {
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          }
        ]
      });

      if (!collaborator || !collaborator.rankLevel) {
        throw new Error('CTV không có rank level');
      }

      const rankPercent = parseFloat(collaborator.rankLevel.percent) || 0;
      const ctvCommission = platformCommission * (rankPercent / 100);

      return ctvCommission;
    }

    // Nếu job không thuộc campaign, tính theo job_commission_type và job_values
    const jobValues = job.jobValues || [];

    // Kiểm tra ngoại lệ: typeId = 2, valueId = 6
    const exceptionValue6 = jobValues.find(jv => 
      jv.typeId === 2 && jv.valueId === 6
    );

    if (exceptionValue6) {
      // CTV trực tiếp nhận % theo level nhân với yearly_salary hoặc số tiền nếu fixed
      if (!collaboratorId) {
        // Admin tiến cử
        if (job.jobCommissionType === 'fixed') {
          const fixedAmount = parseFloat(exceptionValue6.value) || 0;
          return fixedAmount; // Admin ăn đúng số tiền, không nhân level
        } else {
          // percent
          const percent = parseFloat(exceptionValue6.value) || 0;
          return annualSalary * (percent / 100);
        }
      }

      // CTV tiến cử
      const collaborator = await Collaborator.findByPk(collaboratorId, {
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          }
        ]
      });

      if (!collaborator || !collaborator.rankLevel) {
        throw new Error('CTV không có rank level');
      }

      const rankPercent = parseFloat(collaborator.rankLevel.percent) || 0;

      if (job.jobCommissionType === 'fixed') {
        const fixedAmount = parseFloat(exceptionValue6.value) || 0;
        return fixedAmount * (rankPercent / 100);
      } else {
        // percent
        const percent = parseFloat(exceptionValue6.value) || 0;
        return annualSalary * (percent / 100) * (rankPercent / 100);
      }
    }

    // Kiểm tra ngoại lệ: typeId = 2, valueId = 7
    const exceptionValue7 = jobValues.find(jv => 
      jv.typeId === 2 && jv.valueId === 7
    );

    if (exceptionValue7) {
      // Không cần so sánh JLPT hay gì cả
      if (!collaboratorId) {
        // Admin tiến cử
        if (job.jobCommissionType === 'fixed') {
          const fixedAmount = parseFloat(exceptionValue7.value) || 0;
          return fixedAmount;
        } else {
          const percent = parseFloat(exceptionValue7.value) || 0;
          return annualSalary * (percent / 100);
        }
      }

      // CTV tiến cử
      const collaborator = await Collaborator.findByPk(collaboratorId, {
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          }
        ]
      });

      if (!collaborator || !collaborator.rankLevel) {
        throw new Error('CTV không có rank level');
      }

      const rankPercent = parseFloat(collaborator.rankLevel.percent) || 0;

      if (job.jobCommissionType === 'fixed') {
        const fixedAmount = parseFloat(exceptionValue7.value) || 0;
        return fixedAmount * (rankPercent / 100);
      } else {
        const percent = parseFloat(exceptionValue7.value) || 0;
        return annualSalary * (percent / 100) * (rankPercent / 100);
      }
    }

    // Trường hợp thông thường: tính theo job_commission_type và job_values với điều kiện CV
    // Tìm job_value phù hợp với CV
    let matchedJobValue = null;
    let cv = null;

    if (cvCode) {
      cv = await CVStorage.findOne({
        where: { code: cvCode }
      });
    }

    if (cv) {
      // Ưu tiên 1: Tìm job_value có comparison operator và match với CV
      for (const jv of jobValues) {
        if (matchJobValueWithCV(jv, cv)) {
          matchedJobValue = jv;
          break;
        }
      }
      
      // Ưu tiên 2: Nếu không tìm thấy, lấy job_value đầu tiên có type có cvField và CV có giá trị tương ứng
      if (!matchedJobValue) {
        for (const jv of jobValues) {
          if (jv.type && jv.type.cvField) {
            const cvValue = getCVValue(cv, jv.type.cvField);
            if (cvValue !== null && jv.valueId === cvValue) {
              matchedJobValue = jv;
              break;
            }
          }
        }
      }
    }

    // Ưu tiên 3: Nếu không tìm thấy, lấy job_value đầu tiên có value
    if (!matchedJobValue) {
      for (const jv of jobValues) {
        if (jv.value) {
          matchedJobValue = jv;
          break;
        }
      }
    }

    // Fallback: lấy job_value đầu tiên
    if (!matchedJobValue && jobValues.length > 0) {
      matchedJobValue = jobValues[0];
    }

    if (!matchedJobValue || !matchedJobValue.value) {
      return 0; // Không có job_value phù hợp
    }

    const commissionValue = parseFloat(matchedJobValue.value) || 0;

    // Tính toán hoa hồng dựa trên job_commission_type
    let platformCommission = 0;
    if (job.jobCommissionType === 'percent') {
      platformCommission = annualSalary * (commissionValue / 100);
    } else {
      platformCommission = commissionValue; // fixed amount
    }

    // Nếu là Admin tiến cử
    if (!collaboratorId) {
      return platformCommission; // Admin ăn đúng % sàn hoặc số tiền cố định
    }

    // Nếu là CTV tiến cử
    const collaborator = await Collaborator.findByPk(collaboratorId, {
      include: [
        {
          model: RankLevel,
          as: 'rankLevel',
          required: false
        }
      ]
    });

    if (!collaborator || !collaborator.rankLevel) {
      throw new Error('CTV không có rank level');
    }

    const rankPercent = parseFloat(collaborator.rankLevel.percent) || 0;
    const ctvCommission = platformCommission * (rankPercent / 100);

    return ctvCommission;
  } catch (error) {
    console.error('Error calculating commission:', error);
    throw error;
  }
}

