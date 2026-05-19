/**
 * Options có sẵn cho Điều kiện ứng tuyển bắt buộc
 * - Trình độ tiếng Nhật: N1~N5, mỗi level có "bắt buộc" và "tương đương"
 * - Số năm kinh nghiệm (theo template JD)
 * - Bằng lái xe (Có / Không)
 */

export const JAPANESE_LEVEL_OPTIONS = [
  { value: 'N1_required', vi: 'N1 bắt buộc', en: 'N1 required', jp: 'N1必須' },
  { value: 'N1_equivalent', vi: 'N1 tương đương', en: 'N1 equivalent', jp: 'N1相当' },
  { value: 'N2_required', vi: 'N2 bắt buộc', en: 'N2 required', jp: 'N2必須' },
  { value: 'N2_equivalent', vi: 'N2 tương đương', en: 'N2 equivalent', jp: 'N2相当' },
  { value: 'N3_required', vi: 'N3 bắt buộc', en: 'N3 required', jp: 'N3必須' },
  { value: 'N3_equivalent', vi: 'N3 tương đương', en: 'N3 equivalent', jp: 'N3相当' },
  { value: 'N4_required', vi: 'N4 bắt buộc', en: 'N4 required', jp: 'N4必須' },
  { value: 'N4_equivalent', vi: 'N4 tương đương', en: 'N4 equivalent', jp: 'N4相当' },
  { value: 'N5_required', vi: 'N5 bắt buộc', en: 'N5 required', jp: 'N5必須' },
  { value: 'N5_equivalent', vi: 'N5 tương đương', en: 'N5 equivalent', jp: 'N5相当' },
];

export const EXPERIENCE_YEARS_OPTIONS = [
  { value: 'none', vi: 'Không yêu cầu kinh nghiệm', en: 'No experience required', jp: '経験不問' },
  { value: 'under1', vi: 'Dưới 1 năm kinh nghiệm', en: 'Less than 1 year of experience', jp: '1年未満の経験' },
  { value: '1', vi: 'Trên 1 năm kinh nghiệm', en: 'More than 1 year of experience', jp: '1年以上の経験' },
  { value: '2', vi: 'Trên 2 năm kinh nghiệm', en: 'More than 2 years of experience', jp: '2年以上の経験' },
  { value: '3', vi: 'Trên 3 năm kinh nghiệm', en: 'More than 3 years of experience', jp: '3年以上の経験' },
  { value: '4', vi: 'Trên 4 năm kinh nghiệm', en: 'More than 4 years of experience', jp: '4年以上の経験' },
  { value: '5', vi: 'Trên 5 năm kinh nghiệm', en: 'More than 5 years of experience', jp: '5年以上の経験' },
];

export const DRIVER_LICENSE_OPTIONS = [
  { value: 'yes', vi: 'Bằng lái xe: Có', en: 'Driver\'s license: Yes', jp: '運転免許: あり' },
  { value: 'no', vi: 'Bằng lái xe: Không', en: 'Driver\'s license: No', jp: '運転免許: なし' },
];
