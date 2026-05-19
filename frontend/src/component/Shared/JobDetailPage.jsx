import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Users,
  FileText,
  Award,
  Heart,
  Share2,
  Copy,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Phone,
  Mail,
  Globe,
  Check,
  XCircle,
  AlertCircle,
  Bookmark,
  Settings,
  User,
  UserPlus,
  Plus,
  Download,
  Zap,
  Edit,
  Sparkles,
  Loader2,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';
import { openRemoteFileDownloadUrl } from '../../utils/safeFileDownload.js';
import { getJobApplicationStatus, getJobApplicationStatusLabelByLanguage } from '../../utils/jobApplicationStatus';
import { yearSalaryRangeStringForCommission, findYearSalaryRangeRow } from '../../utils/salaryRangeForCommission';
import { formatSalaryValueWithJlptIfRange } from '../../utils/salaryDisplay';
import {
  normalizeJobCommissionType,
  resolveCampaignPercentFromJob,
  pickPrimaryCommissionJobValue,
} from '../../utils/jobCommissionUi';
import { hasJobAttachment, hasAnyDownloadableAttachment } from '../../utils/jobAttachmentAvailability';
import { getRecruitmentLocationLabel } from '../../utils/recruitmentLocationLabels.js';
import { isCvUnavailableForNomination } from '../../utils/cvStatus.js';

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en') return enText || viText || '';
  if (lang === 'ja') return jpText || enText || viText || '';
  return viText || enText || jpText || '';
};

const MICROSOFT_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
const MICROSOFT_TRANSLATOR_KEY = import.meta.env.VITE_MICROSOFT_TRANSLATOR_KEY || '';
const MICROSOFT_TRANSLATOR_REGION = import.meta.env.VITE_MICROSOFT_TRANSLATOR_REGION || '';

async function translateTextWithMicrosoft(text, from, to) {
  const raw = String(text ?? '').trim();
  if (!raw || from === to) return raw;
  if (!MICROSOFT_TRANSLATOR_KEY || !MICROSOFT_TRANSLATOR_REGION) return raw;
  const res = await fetch(`${MICROSOFT_TRANSLATOR_ENDPOINT}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': MICROSOFT_TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': MICROSOFT_TRANSLATOR_REGION,
      'X-ClientTraceId': globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    },
    body: JSON.stringify([{ Text: raw }]),
  });
  if (!res.ok) throw new Error(`Microsoft Translator ${res.status}`);
  const data = await res.json().catch(() => []);
  return String(data?.[0]?.translations?.[0]?.text ?? raw);
}

// Nhãn giao diện đa ngôn ngữ (dùng t(key) trong component, language từ useLanguage)
const LABELS = {
  tabGeneral: { vi: 'Thông tin chung', en: 'General', ja: '一般' },
  tabNominationsJob: { vi: 'Thông tin tiến cử job', en: 'Job nominations', ja: '求人の推薦' },
  tabAdminAdvise: { vi: 'Thông tin gợi ý từ Admin', en: 'Admin suggestions', ja: '管理者の提案情報' },
  h2NominationsJob: { vi: 'Thông tin tiến cử job', en: 'Job nominations', ja: '求人の推薦' },
  pNominationsJobAdmin: { vi: 'Danh sách các lần tiến cử vào job này (kèm trạng thái xử lý).', en: 'List of nominations for this job (with processing status).', ja: 'この求人への推薦一覧（処理ステータス付き）。' },
  pNominationsJobCtv: { vi: 'Danh sách ứng viên thuộc CTV này đã tiến cử vào job, kèm trạng thái đang ở giai đoạn nào.', en: 'Candidates from this CTV nominated for this job, with the current stage status.', ja: 'このCTVから推薦された候補者一覧（現在の段階ステータス付き）。' },
  noNominationsJob: { vi: 'Chưa có thông tin tiến cử cho job này.', en: 'No nomination information for this job yet.', ja: 'この求人の推薦情報はまだありません。' },
  h2AdminAdvise: { vi: 'Thông tin gợi ý từ Admin', en: 'Admin suggestions', ja: '管理者の提案情報' },
  pAdminAdvise: { vi: 'Admin có thể nhập gợi ý cho công việc này theo ngôn ngữ.', en: 'Admin can enter suggestions for this job in each language.', ja: '管理者はこの求人の提案を各言語で入力できます。' },
  labelAdviseVi: { vi: 'Gợi ý (VI)', en: 'Suggestion (VI)', ja: '提案（VI）' },
  labelAdviseEn: { vi: 'Gợi ý (EN)', en: 'Suggestion (EN)', ja: '提案（EN）' },
  labelAdviseJp: { vi: 'Gợi ý (JP)', en: 'Suggestion (JP)', ja: '提案（JP）' },
  btnSaveAdvise: { vi: 'Lưu gợi ý', en: 'Save suggestions', ja: '保存する' },
  adviseNoPermission: { vi: 'Bạn không có quyền chỉnh sửa.', en: 'You do not have permission to edit.', ja: '編集権限がありません。' },
  adviseSaveOk: { vi: 'Đã lưu gợi ý thành công.', en: 'Suggestions saved successfully.', ja: '保存しました。' },
  adviseSaveFail: { vi: 'Lưu gợi ý thất bại.', en: 'Failed to save suggestions.', ja: '保存に失敗しました。' },
  sectionMain: { vi: 'Thông tin chung', en: 'General', ja: '一般' },
  sectionRequirements: { vi: 'Điều kiện ứng tuyển', en: 'Application conditions', ja: '応募条件' },
  sectionBenefits: { vi: 'Chính sách đãi ngộ', en: 'Benefits & policy', ja: '待遇・福利厚生' },
  sectionInterview: { vi: 'Quy trình phỏng vấn', en: 'Interview process', ja: '面接プロセス' },
  sectionCompany: { vi: 'Thông tin công ty', en: 'Company info', ja: '企業情報' },
  labelJobContent: { vi: 'Nội dung công việc:', en: 'Job content:', ja: '仕事内容:' },
  labelVisa: { vi: 'Visa', en: 'Visa', ja: 'ビザ' },
  labelSalary: { vi: 'Mức lương:', en: 'Salary:', ja: '給与:' },
  labelSalaryDetail: { vi: 'Chi tiết mức lương', en: 'Salary details', ja: '給与の詳細' },
  labelAge: { vi: 'Tuổi', en: 'Age', ja: '年齢' },
  labelNationality: { vi: 'Quốc tịch', en: 'Nationality', ja: '国籍' },
  labelEducation: { vi: 'Trình độ học vấn', en: 'Education', ja: '学歴' },
  labelTechSpecs: { vi: 'Thông số kỹ thuật', en: 'Technical specs', ja: '技術スペック' },
  labelRequired: { vi: 'Điều kiện bắt buộc', en: 'Required conditions', ja: '必須条件' },
  labelPreferred: { vi: 'Điều kiện ưu tiên', en: 'Preferred conditions', ja: '優先条件' },
  labelApplicationConditions: { vi: 'Điều kiện ứng dụng:', en: 'Application conditions:', ja: '応募条件:' },
  labelWelcomeConditions: { vi: 'Điều kiện chào mừng', en: 'Welcome conditions', ja: '歓迎条件' },
  labelNgTarget: { vi: 'Mục tiêu NG', en: 'NG target', ja: 'NG対象' },
  labelBenefits: { vi: 'Phúc lợi:', en: 'Benefits:', ja: '福利厚生:' },
  labelJobSocialInsurance: { vi: 'Bảo hiểm xã hội:', en: 'Social insurance:', ja: '社会保険:' },
  labelJobTransportation: { vi: 'Phụ cấp đi lại:', en: 'Commuting allowance:', ja: '通勤手当:' },
  labelJobBonus: { vi: 'Thưởng:', en: 'Bonus:', ja: '賞与:' },
  labelJobSalaryReview: { vi: 'Đánh giá lương:', en: 'Salary review:', ja: '昇給・査定:' },
  labelJobBreakTime: { vi: 'Thời gian nghỉ:', en: 'Break time:', ja: '休憩時間:' },
  labelJobOvertimeSummary: { vi: 'Làm thêm giờ:', en: 'Overtime:', ja: '残業:' },
  labelJobHolidays: { vi: 'Ngày nghỉ:', en: 'Days off:', ja: '休日:' },
  labelJobHolidayDetails: { vi: 'Chi tiết ngày nghỉ:', en: 'Holiday details:', ja: '休日の詳細:' },
  labelWorkingHours: { vi: 'Thời gian làm việc:', en: 'Working hours:', ja: '勤務時間:' },
  labelOvertimeAllowance: { vi: 'Phụ cấp làm thêm:', en: 'Overtime allowance:', ja: '残業手当:' },
  labelSmokingPolicy: { vi: 'Chính sách hút thuốc:', en: 'Smoking policy:', ja: '喫煙ポリシー:' },
  labelSmokingPolicyDetail: { vi: 'Chi tiết chính sách hút thuốc:', en: 'Smoking policy details:', ja: '喫煙ポリシー詳細:' },
  labelRecruitingCompany: { vi: 'Công ty tuyển dụng:', en: 'Recruiting company:', ja: '採用企業:' },
  labelRevenue: { vi: 'Doanh thu:', en: 'Revenue:', ja: '売上:' },
  labelEmployees: { vi: 'Số nhân viên:', en: 'Employees:', ja: '従業員数:' },
  labelHeadquarters: { vi: 'Trụ sở:', en: 'Headquarters:', ja: '本社:' },
  labelEstablished: { vi: 'Thành lập:', en: 'Established:', ja: '設立:' },
  labelServices: { vi: 'Dịch vụ:', en: 'Services:', ja: 'サービス:' },
  labelSectors: { vi: 'Lĩnh vực:', en: 'Sectors:', ja: '分野:' },
  labelYearsExpIndustry: { vi: 'Số năm kinh nghiệm (ngành):', en: 'Years of experience (industry):', ja: '経験年数（業界）:' },
  labelYearsExpJob: { vi: 'Số năm kinh nghiệm (loại công việc):', en: 'Years of experience (job type):', ja: '経験年数（職種）:' },
  labelOtherExp: { vi: 'Kinh nghiệm khác:', en: 'Other experience:', ja: 'その他経験:' },
  noIndustryExp: { vi: 'Không cho phép kinh nghiệm trong ngành', en: 'No industry experience allowed', ja: '業界経験不可' },
  noExpOk: { vi: 'Không có kinh nghiệm trong bất kỳ loại công việc OK', en: 'No experience in any job type OK', ja: '職種不問・未経験OK' },
  noExpAny: { vi: 'Không có (hoàn toàn thiếu kinh nghiệm OK)', en: 'None (no experience OK)', ja: 'なし（未経験OK）' },
  btnEdit: { vi: 'Chỉnh sửa', en: 'Edit', ja: '編集' },
  btnSuggestCandidate: { vi: 'Đề xuất ứng viên', en: 'Suggest candidate', ja: '候補者を推薦' },
  btnCopyUrl: { vi: 'Sao chép URL', en: 'Copy URL', ja: 'URLをコピー' },
  btnCopied: { vi: 'Đã sao chép!', en: 'Copied!', ja: 'コピー済み!' },
  btnDownloadJd: { vi: 'Tải JD', en: 'Download JD', ja: 'JDをダウンロード' },
  jdVietnamese: { vi: 'JD tiếng Việt', en: 'JD Vietnamese', ja: 'JDベトナム語' },
  jdEnglish: { vi: 'JD tiếng Anh', en: 'JD English', ja: 'JD英語' },
  jdJapanese: { vi: 'JD tiếng Nhật', en: 'JD Japanese', ja: 'JD日本語' },
  jdOriginal: { vi: 'JD gốc', en: 'JD original', ja: 'JD原本' },
  requiredCvForm: { vi: 'CV form', en: 'CV form', ja: 'CVフォーム' },
  h2Rejected: { vi: 'Thông tin tiến cử bị từ chối', en: 'Rejected nominations', ja: '辞退された推薦' },
  h2Success: { vi: 'Thông tin tiến cử thành công', en: 'Successful nominations', ja: '成功した推薦' },
  pRejected: { vi: 'Các đơn tiến cử vào công việc này (theo cá nhân Admin/CTV đăng nhập) có trạng thái từ chối/trượt và lý do.', en: 'Nominations for this job (for the logged-in Admin/CTV) with rejected/failed status and reason.', ja: 'この仕事への推薦（ログイン中のAdmin/CTV）で辞退・不合格の状態と理由。' },
  pSuccess: { vi: 'Các đơn tiến cử vào công việc này (theo cá nhân Admin/CTV đăng nhập) đã trúng tuyển / vào công ty / đã thanh toán.', en: 'Nominations for this job that have been accepted / joined company / paid.', ja: 'この仕事への推薦で合格・入社・支払い済み。' },
  thCandidate: { vi: 'Ứng viên / Mã CV', en: 'Candidate / CV code', ja: '候補者/CVコード' },
  thStatus: { vi: 'Trạng thái', en: 'Status', ja: '状態' },
  thRejectReason: { vi: 'Lý do từ chối', en: 'Reject reason', ja: '辞退理由' },
  thNominationDate: { vi: 'Ngày tiến cử', en: 'Nomination date', ja: '推薦日' },
  noRejected: { vi: 'Chưa có đơn tiến cử nào bị từ chối.', en: 'No rejected nominations yet.', ja: '辞退された推薦はまだありません。' },
  noSuccess: { vi: 'Chưa có đơn tiến cử thành công.', en: 'No successful nominations yet.', ja: '成功した推薦はまだありません。' },
  faqTitle: { vi: 'Câu hỏi thường gặp', en: 'FAQ', ja: 'よくある質問' },
  faqMock: { vi: 'Dữ liệu mẫu (mock). Sẽ kết nối dữ liệu thật sau.', en: 'Sample data (mock). Will connect real data later.', ja: 'サンプルデータ。後で実データに接続します。' },
  recruitmentType1: { vi: 'Nhân viên chính thức', en: 'Permanent employee', ja: '正社員' },
  recruitmentType2: { vi: 'Nhân viên chính thức (công ty haken; hợp đồng vô thời hạn)', en: 'Permanent (haken; indefinite contract)', ja: '正社員（派遣元；無期契約）' },
  recruitmentType3: { vi: 'Nhân viên haken (hợp đồng có thời hạn)', en: 'Temporary staff (fixed-term contract)', ja: '派遣社員（有期契約）' },
  recruitmentType4: { vi: 'Nhân viên hợp đồng', en: 'Contract employee', ja: '契約社員' },
  labelRecruitmentLocation: { vi: 'Địa điểm tuyển dụng:', en: 'Recruitment location:', ja: '採用地域:' },
  unknown: { vi: 'Không xác định', en: 'Unknown', ja: '不明' },
  tagDirectApply: { vi: 'Ứng tuyển trực tiếp', en: 'Direct apply', ja: '直接応募' },
  jobFeatureWeekendOff: { vi: 'Đóng cửa vào cuối tuần và ngày lễ', en: 'Closed on weekends and holidays', ja: '週末・祝日休み' },
  jobFeatureMaternityLeave: { vi: 'Có chế độ nghỉ thai sản/cha con', en: 'Maternity/paternity leave', ja: '産休・育休制度あり' },
  jobFeatureScoutOk: { vi: 'Scout OK (công bố tên công ty OK)', en: 'Scout OK (company name disclosure OK)', ja: 'スカウトOK（会社名公表OK）' },
  jobTagSelection: { vi: 'Việc làm nổi bật', en: 'Featured jobs', ja: '注目求人' },
  jobFeatureNoExpOk: { vi: 'Không có kinh nghiệm trong bất kỳ loại công việc OK', en: 'No experience in any job type OK', ja: '職種不問・未経験OK' },
  jobFeatureNoIndustryExpOk: { vi: 'Không cho phép kinh nghiệm trong ngành', en: 'No industry experience allowed', ja: '業界経験不可' },
  jobFeatureMediaOk: { vi: 'Media publication OK (công bố tên công ty OK)', en: 'Media publication OK', ja: 'メディア掲載OK' },
  jobFeatureCompletelyNoExpOk: { vi: 'Hoàn toàn thiếu kinh nghiệm OK', en: 'No experience OK', ja: '未経験OK' },
  quickInfoTitle: { vi: 'Thông tin nhanh', en: 'Quick info', ja: 'クイック情報' },
  labelAnnualIncome: { vi: 'Thu nhập năm:', en: 'Annual income:', ja: '年収:' },
  labelCategory: { vi: 'Danh mục:', en: 'Category:', ja: '分類:' },
  labelGender: { vi: 'Giới tính:', en: 'Gender:', ja: '性別:' },
  labelLocation: { vi: 'Nơi làm việc:', en: 'Location:', ja: '勤務地:' },
  saveToList: { vi: 'Lưu danh sách', en: 'Save to list', ja: 'リストに保存' },
  saveToListTitle: { vi: 'Lưu công việc vào danh sách', en: 'Save job to list', ja: '仕事をリストに保存' },
  noListsYet: { vi: 'Chưa có danh sách nào. Tạo danh sách mới để lưu công việc.', en: 'No lists yet. Create one to save this job.', ja: 'リストがまだありません。この仕事を保存するリストを作成してください。' },
  createNewList: { vi: 'Tạo danh sách mới', en: 'Create new list', ja: '新規リスト作成' },
  newListName: { vi: 'Tên danh sách mới', en: 'New list name', ja: '新規リスト名' },
  newListNamePlaceholder: { vi: 'VD: Việc làm IT yêu thích', en: 'e.g. Favourite IT jobs', ja: '例：お気に入りIT仕事' },
  cancel: { vi: 'Hủy', en: 'Cancel', ja: 'キャンセル' },
  creating: { vi: 'Đang tạo...', en: 'Creating...', ja: '作成中...' },
  createAndSave: { vi: 'Tạo và lưu', en: 'Create & save', ja: '作成して保存' },
  btnBack: { vi: 'Quay lại', en: 'Back', ja: '戻る' },
  labelJobId: { vi: 'ID công việc:', en: 'Job ID:', ja: '求人ID:' },
  labelJobCategory: { vi: 'Phân loại công việc:', en: 'Job category:', ja: '求人分類:' },
  labelRecruitingCompanies: { vi: 'Các công ty tuyển dụng:', en: 'Recruiting companies:', ja: '採用企業:' },
  backToJobList: { vi: 'Quay lại danh sách việc làm', en: 'Back to job list', ja: '求人一覧に戻る' },
  matchingTitle: { vi: 'Ứng viên phù hợp (AI)', en: 'Matching candidates (AI)', ja: 'マッチ候補（AI）' },
  matchingLoading: { vi: 'Đang tải gợi ý AI...', en: 'Loading AI suggestions...', ja: 'AI提案を読み込み中…' },
  matchingError: { vi: 'Không tải được gợi ý AI.', en: 'Could not load AI suggestions.', ja: 'AI提案を読み込めませんでした。' },
  matchingComputing: { vi: 'Đang tính toán. Vui lòng chờ.', en: 'Computing. Please wait.', ja: '計算中です。しばらくお待ちください。' },
  matchingEmpty: { vi: 'Chưa có gợi ý phù hợp.', en: 'No suggestions yet.', ja: '該当する候補がありません。' },
  matchingScore: { vi: 'Điểm match', en: 'Match score', ja: 'マッチ度' },
  matchingReason: { vi: 'Lý do', en: 'Reason', ja: '理由' },
  matchingViewReason: { vi: 'Xem lý do', en: 'View reason', ja: '理由を見る' },
  matchingHideReason: { vi: 'Ẩn lý do', en: 'Hide reason', ja: '閉じる' },
  matchingOpenCandidate: { vi: 'Mở hồ sơ', en: 'Open profile', ja: 'プロフィール' },
  matchingQuickNominate: { vi: 'Tiến cử nhanh', en: 'Quick nominate', ja: 'クイック推薦' },
  matchingFilteredNote: { vi: 'Chỉ hiển thị hồ sơ trong phạm vi của bạn (CTV).', en: 'Only profiles you can access (CTV).', ja: 'あなたが閲覧できる候補のみ表示（CTV）。' },
  matchingReasonLoadError: { vi: 'Không lấy được lý do.', en: 'Could not load the reason.', ja: '理由を取得できませんでした。' },
};

// Helper function to strip HTML tags and format text
const stripHtml = (html) => {
  if (!html) return '';
  if (!html.includes('<')) return html;
  
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    
    // Convert <br> to newlines
    const breaks = tmp.querySelectorAll('br');
    breaks.forEach(br => br.replaceWith('\n'));
    
    // Convert <p> to newlines
    const paragraphs = tmp.querySelectorAll('p');
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (text) {
        p.replaceWith(`\n${text}\n`);
      } else {
        p.remove();
      }
    });
    
    // Convert <ul><li> and <ol><li> to bullet points
    const lists = tmp.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const items = list.querySelectorAll('li');
      const bulletPoints = Array.from(items)
        .map(li => li.textContent.trim())
        .filter(Boolean)
        .map(text => `• ${text}`)
        .join('\n');
      
      if (bulletPoints) {
        const textNode = document.createTextNode(`\n${bulletPoints}\n`);
        if (list.parentNode) {
          list.parentNode.replaceChild(textNode, list);
        }
      } else {
        list.remove();
      }
    });
    
    // Get text content
    let text = tmp.textContent || tmp.innerText || '';
    
    // Clean up extra whitespace and newlines
    text = text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
      .trim();
    
    return text;
  } catch (error) {
    // Fallback: simple regex to remove HTML tags
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
};

/** Giá trị placeholder từ JdTemplate khi ô chưa được điền — không hiển thị như nội dung thật */
const JD_DETAIL_PLACEHOLDER_NORMALIZED = new Set([
  'điền chi tiết',
  'enter details',
  '詳細を入力',
]);

const RESIDENCE_STATUS_OPTIONS = [
  { value: 'engineer', vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế', en: 'Engineer/Specialist in Humanities/International Services', jp: '技術・人文知識・国際業務' },
  { value: 'ssw', vi: 'Visa kỹ năng đặc định', en: 'Specified Skilled Worker', jp: '特定技能' },
  { value: 'student', vi: 'Visa du học', en: 'Student', jp: '留学' },
  { value: 'pr', vi: 'Vĩnh trú', en: 'Permanent resident', jp: '永住者' },
  { value: 'spouse', vi: 'Vợ/chồng người Nhật', en: 'Spouse of Japanese national', jp: '日本人の配偶者等' },
  { value: 'ltr', vi: 'Visa định trú', en: 'Long-term Resident', jp: '定住者' },
  { value: 'other', vi: 'Khác', en: 'Other', jp: 'その他' },
  { value: 'hsp', vi: 'Visa chuyên gia trình độ cao', en: 'Highly Skilled Professional', jp: '高度専門職' },
  { value: 'labor_skill', vi: 'Visa lao động kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
  { value: 'titp', vi: 'Thực tập sinh kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
  { value: 'dependent', vi: 'Visa phụ thuộc gia đình', en: 'Dependent', jp: '家族滞在' },
  { value: 'short', vi: 'Visa ngắn hạn', en: 'Short-term stay', jp: '短期滞在' },
  { value: 'ict', vi: 'Chuyển công tác nội bộ', en: 'Intra-company Transferee', jp: '企業内転勤' },
  { value: 'entertainer', vi: 'Biểu diễn / giải trí', en: 'Entertainer / Entertainment', jp: '興行' },
  { value: 'prspouse', vi: 'Vợ/chồng thường trú nhân', en: 'Spouse of Permanent Resident', jp: '永住者の配偶者等' },
  { value: 'no_requirement', vi: 'Không yêu cầu', en: 'No requirement', jp: '不要' },
];

const normalizeResidenceStatusValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
      } catch {
        /* ignore */
      }
    }
    return trimmed.split(',').map((v) => String(v).replace(/["'\[\]]/g, '').trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
};

const getResidenceStatusLabel = (value, lang) => {
  const opt = RESIDENCE_STATUS_OPTIONS.find((item) => item.value === value);
  if (!opt) return value;
  if (lang === 'en') return opt.en || opt.vi;
  if (lang === 'ja') return opt.jp || opt.vi;
  return opt.vi;
};

const normalizeDetailTextForPlaceholderCheck = (s) =>
  String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const isJdUnfilledDetailPlaceholder = (plainText) => {
  const n = normalizeDetailTextForPlaceholderCheck(plainText);
  return n.length > 0 && JD_DETAIL_PLACEHOLDER_NORMALIZED.has(n);
};

/**
 * Chi tiết việc làm dùng chung cho Agent, Admin, Admin Group.
 * @param {Function} getJobApi - Hàm load job (vd: apiService.getJobById hoặc apiService.getAdminJobById)
 * @param {string} backPath - Đường mặc định quay lại danh sách (vd: '/agent/jobs'). Có thể ghi đè bằng `navigate(..., { state: { returnTo: '/agent' } })` từ màn hình trước.
 * @param {boolean} showEditButton - Chỉ SuperAdmin/AdminBackOffice mới true
 * @param {string} [editPath] - Đường sửa job (vd: '/admin/jobs/:id/edit')
 * @param {string} [applyButtonText] - Nhãn nút tiến cử
 * @param {Function} [onApply] - Override hành vi nút tiến cử
 * @param {boolean} [hideSaveToList] - Ẩn nút lưu danh sách
 * @param {Function} [getJobFileUrlApi] - Override API lấy URL file JD
 * @param {boolean} [publicLanding] - Trang chi tiết public (collaborator/candidate landing): không gọi API CTV riêng, ẩn tab tiến cử / AI sidebar / khối phí giới thiệu
 * @param {import('react').ReactNode} [sidebarBelowActionsSlot] - Nội dung trong cột phải, ngay dưới nhóm nút hành động (vd. việc làm liên quan trên landing)
 * @param {(job: object | null) => void} [onJobLoaded] - Gọi khi load job xong (job) hoặc lỗi/không tìm thấy (null)
 */
const JobDetailPage = ({
  getJobApi,
  backPath = '/agent/jobs',
  showEditButton = false,
  editPath,
  applyButtonText,
  onApply,
  hideSaveToList = false,
  getJobFileUrlApi = null,
  publicLanding = false,
  sidebarBelowActionsSlot = null,
  onJobLoaded = null,
}) => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = (key) => (LABELS[key] && (LABELS[key][language] ?? LABELS[key].vi)) ?? key;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    requirements: true,
    location: true,
    benefits: true,
    interview: true,
    company: true,
  });

  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredEditButton, setHoveredEditButton] = useState(false);
  const [hoveredCollapsibleCard, setHoveredCollapsibleCard] = useState({});
  const [hoveredSuggestButton, setHoveredSuggestButton] = useState(false);
  const [hoveredCopyButton, setHoveredCopyButton] = useState(false);
  const [hoveredDownloadButton, setHoveredDownloadButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredBackToListButton, setHoveredBackToListButton] = useState(false);
  const [showSaveToListModal, setShowSaveToListModal] = useState(false);
  const [saveToListLists, setSaveToListLists] = useState([]);
  const [loadingSaveToListLists, setLoadingSaveToListLists] = useState(false);
  const [saveToListMessage, setSaveToListMessage] = useState(null);
  const [showCreateListInSaveModal, setShowCreateListInSaveModal] = useState(false);
  const [newListNameInSaveModal, setNewListNameInSaveModal] = useState('');
  const [creatingListInSaveModal, setCreatingListInSaveModal] = useState(false);
  const [openDownloadMenu, setOpenDownloadMenu] = useState(false);
  const [openMobileDownloadMenu, setOpenMobileDownloadMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const translationCacheRef = React.useRef(new Map());

  useEffect(() => {
    if (!showMobileSidebar) {
      setOpenMobileDownloadMenu(false);
      return;
    }
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [showMobileSidebar]);

  /** Tắt cơ chế scale tự động vì gây cảm giác layout bị co và dạt trái trên laptop/desktop. */
  const VIEWPORT_ZOOM_BREAKPOINT = 1300;
  const ZOOM_MIN_WIDTH = 1024;
  const ZOOM_SCALE = 0.8;
  const shouldZoomOut = () => false;
  const [zoomOut, setZoomOut] = useState(shouldZoomOut);
  useEffect(() => {
    const check = () => setZoomOut(shouldZoomOut());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'nominations' | 'adminAdvise'
  const [jobApplications, setJobApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [adminAdviseVi, setAdminAdviseVi] = useState('');
  const [adminAdviseEn, setAdminAdviseEn] = useState('');
  const [adminAdviseJp, setAdminAdviseJp] = useState('');
  const [savingAdminAdvise, setSavingAdminAdvise] = useState(false);
  const [adminAdviseMsg, setAdminAdviseMsg] = useState(null);

  const currentAdminAdviseText =
    language === 'en' ? adminAdviseEn : language === 'ja' ? adminAdviseJp : adminAdviseVi;

  const [aiMatches, setAiMatches] = useState([]);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [aiMatchError, setAiMatchError] = useState(null);
  const [aiCvNames, setAiCvNames] = useState({});
  const [aiCvDetails, setAiCvDetails] = useState({});
  const [validAiMatchIds, setValidAiMatchIds] = useState([]);
  const [expandedAiCvId, setExpandedAiCvId] = useState(null);
  const [aiReasonByCvId, setAiReasonByCvId] = useState({});
  const [aiReasonLoadingId, setAiReasonLoadingId] = useState(null);

  const useAdminAPI = backPath?.startsWith('/admin');
  const isApplicantMode = backPath?.startsWith('/applicant');


  /** Trang quay lại từ nút Back (ưu tiên state từ nơi mở chi tiết, vd. trang chủ CTV /agent) */
  const effectiveListBackPath = useMemo(() => {
    const st = location.state;
    if (st && typeof st.returnTo === 'string' && st.returnTo.trim().startsWith('/')) {
      return st.returnTo.trim().replace(/\/$/, '') || backPath;
    }
    if (st && typeof st.backPath === 'string' && st.backPath.trim().startsWith('/')) {
      return st.backPath.trim().replace(/\/$/, '') || backPath;
    }
    return (backPath || '/agent/jobs').replace(/\/$/, '');
  }, [location.state, backPath]);

  const [ctvProfile, setCtvProfile] = useState(null);
  useEffect(() => {
    if (!useAdminAPI && !publicLanding && !isApplicantMode) {
      const loadCTVProfile = async () => {
        try {
          const response = await apiService.getCTVProfile();
          if (response.success && response.data) {
            setCtvProfile(response.data.collaborator || response.data);
          }
        } catch (error) {
          console.error('Error loading CTV profile:', error);
        }
      };
      loadCTVProfile();
    }
  }, [useAdminAPI, publicLanding, isApplicantMode]);
  const ctvRankPercent = ctvProfile?.rankLevel?.percent ? parseFloat(ctvProfile.rankLevel.percent) : 0;
  const MOCK_QA = [
    { q: 'Công ty có hỗ trợ visa cho ứng viên nước ngoài không?', a: 'Có, công ty hỗ trợ tư vấn và thủ tục visa cho ứng viên đủ điều kiện.' },
    { q: 'Thời gian thử việc là bao lâu?', a: 'Thời gian thử việc thường từ 3–6 tháng tùy vị trí, được ghi rõ trong thông tin tuyển dụng.' },
    { q: 'Có thể làm việc từ xa một phần không?', a: 'Tùy từng vị trí và phòng ban, một số vị trí có chế độ remote. Chi tiết xem tại mô tả công việc.' },
  ];

  useEffect(() => {
    loadJobDetail();
  }, [jobId, getJobApi]);

  useEffect(() => {
    if (isApplicantMode || publicLanding) return;
    if (!jobId || !job) return;
    let cancelled = false;
    setLoadingApplications(true);
    const fetchApi = useAdminAPI ? apiService.getAdminJobApplications : apiService.getJobApplications;
    fetchApi({ jobId: Number(jobId), limit: 200 })
      .then((res) => {
        if (!cancelled) setJobApplications(res?.data?.jobApplications ?? []);
      })
      .catch(() => { if (!cancelled) setJobApplications([]); })
      .finally(() => { if (!cancelled) setLoadingApplications(false); });
    return () => { cancelled = true; };
  }, [jobId, job, useAdminAPI, isApplicantMode, publicLanding]);

  useEffect(() => {
    if (isApplicantMode || publicLanding) return;
    if (!jobId || !job?.id) return;
    let cancelled = false;
    const run = async () => {
      setAiMatchLoading(true);
      setAiMatchError(null);
      setAiMatches([]);
      setAiCvNames({});
      setAiCvDetails({});
      setValidAiMatchIds([]);
      setExpandedAiCvId(null);
      setAiReasonByCvId({});
      try {
        let allowedCvIds = null;
        if (!useAdminAPI) {
          allowedCvIds = new Set();
          const ctvId = Number(ctvProfile?.id);
          let page = 1;
          const limit = 500;
          for (let guard = 0; guard < 30; guard += 1) {
            const params = { page, limit };
            if (ctvId) params.collaboratorId = ctvId;
            const res = await apiService.getCVStorages(params);
            const cvs = res?.data?.cvs || [];
            cvs.forEach((c) => {
              const cvId = Number(c?.id);
              const isDuplicate = c?.isDuplicate ?? c?.is_duplicate ?? c?.is_duplicated ?? false;
              const completionState = String(c?.completionState || c?.completion_state || '').trim();
              const vectorSyncStatus = String(c?.vectorSyncStatus || c?.vector_sync_status || '').trim();
              const isParseReady = c?.isParse === true || c?.isParse === 1 || c?.is_parse === 1;
              const isVectorDone = vectorSyncStatus === 'vector_done' || vectorSyncStatus === 'done';
              const isValidCv =
                cvId != null &&
                Number(c?.status) === 1 &&
                isDuplicate === false &&
                (c?.duplicate_with_cv_id == null || c?.duplicate_with_cv_id === 'null') &&
                isParseReady &&
                completionState === 'ready_for_parse' &&
                isVectorDone;
              if (isValidCv) allowedCvIds.add(cvId);
            });
            const pg = res?.data?.pagination;
            const totalPages = pg?.totalPages ?? 1;
            if (page >= totalPages || cvs.length < limit) break;
            page += 1;
          }
        }
        let list = [];
        const normalizeAiMatchRow = (row) => {
          if (!row || typeof row !== 'object') return null;
          const score = Number(row.score ?? row.similarity_score ?? row.match_score ?? 0);
          const meta = row.metadata || row.meta || {};
          return {
            ...row,
            similarity_score: Number.isFinite(score) ? score : 0,
            reasoning: row.reasoning || row.reason || row.matching_reasons?.reason || null,
            metadata: meta,
          };
        };
        if (!useAdminAPI) {
          const allowedCvIdSet = allowedCvIds || new Set();
          const cvIds = Array.from(allowedCvIdSet).map((id) => String(id));
          if (cvIds.length > 0) {
            const scored = await apiService.getAiMatchScoreForJobCv({
              job_id: job.id,
              top_k: cvIds.length,
              cv_ids: cvIds,
            });
            const sourceList = Array.isArray(scored)
              ? scored
              : Array.isArray(scored?.items)
                ? scored.items
                : Array.isArray(scored?.data?.items)
                  ? scored.data.items
                  : [];
            list = sourceList
              .map(normalizeAiMatchRow)
              .filter((row) => row && allowedCvIdSet.has(Number(row?.id)));
          } else {
            list = [];
          }
        } else {
          const raw = await apiService.getAiMatchCvsForJob(job.id);
          const sourceList = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.items)
              ? raw.items
              : [];
          list = sourceList.map(normalizeAiMatchRow).filter(Boolean);
        }

        const sorted = [...list]
          .filter((row) => Number(row?.status ?? 1) === 1)
          .filter((row) => {
            const isDuplicate = row?.isDuplicate ?? row?.is_duplicate ?? row?.is_duplicated ?? false;
            return isDuplicate === false;
          })
          .filter((row) => row?.duplicate_with_cv_id == null || row?.duplicate_with_cv_id === 'null')
          .sort((a, b) => (Number(b.similarity_score) || 0) - (Number(a.similarity_score) || 0));
        if (!cancelled) setAiMatches(sorted);
      } catch (e) {
        console.error('AI match cvs:', e);
        if (!cancelled) {
          // 404 = vector chưa được tính toán, hiển thị thông báo chờ
          const is404 = e?.status === 404 || e?.response?.status === 404 || String(e?.message || '').includes('404');
          setAiMatchError(is404 ? t('matchingComputing') : (e?.message || t('matchingError')));
        }
      } finally {
        if (!cancelled) setAiMatchLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [jobId, job?.id, useAdminAPI, isApplicantMode, publicLanding]);

  useEffect(() => {
    if (isApplicantMode || publicLanding) return;
    if (!aiMatches.length) return;
    let cancelled = false;
    const ids = aiMatches.slice(0, 30).map((m) => Number(m.id)).filter((n) => !Number.isNaN(n));
    const loadNames = async () => {
      const fn = useAdminAPI ? apiService.getAdminCVById : apiService.getCVStorageById;
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await fn(id);
            const cv = r?.data?.cv;
            const isValidCv =
              Number(cv?.status) === 1 &&
              Number(cv?.is_duplicate ?? cv?.is_duplicated ?? 0) !== 1 &&
              Number(cv?.is_duplicated ?? 0) !== 1 &&
              Number(cv?.is_duplicate ?? 0) !== 1 &&
              (cv?.duplicated_with_cv_id == null || cv?.duplicate_with_cv_id == null || cv?.duplicated_with_cv_id === '' || cv?.duplicate_with_cv_id === '');
            if (!isValidCv) return null;
            const name = cv?.name || cv?.fullName || cv?.code || `#${id}`;
            return [id, { name, cv }];
          } catch {
            return null;
          }
        })
      );
      const filteredEntries = entries.filter(Boolean);
      const validIds = filteredEntries.map(([id]) => Number(id));
      if (!cancelled) {
        setAiCvNames(Object.fromEntries(filteredEntries.map(([id, data]) => [id, data.name])));
        setAiCvDetails(Object.fromEntries(filteredEntries.map(([id, data]) => [id, data.cv])));
        setValidAiMatchIds(validIds);
      }
    };
    loadNames();
    return () => { cancelled = true; };
  }, [aiMatches, useAdminAPI, isApplicantMode, publicLanding]);

  const parseAiCoreSkillsRaw = (raw) => {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getAiReasonText = (matchRow) => {
    const reasoning = matchRow?.reasoning || matchRow?.reason || matchRow?.matching_reasons?.reason;
    if (reasoning && typeof reasoning === 'object') {
      return pickByLanguage(reasoning.vi, reasoning.en, reasoning.jp, language);
    }
    if (typeof reasoning === 'string') return reasoning.trim();
    return '';
  };

  useEffect(() => {
    if (!expandedAiCvId) return;
    const current = aiMatches.find((row) => String(row?.id) === String(expandedAiCvId));
    if (!current) return;
    const nextReason = getAiReasonText(current);
    if (!nextReason) return;
    setAiReasonByCvId((prev) => ({ ...prev, [String(expandedAiCvId)]: nextReason }));
  }, [language, expandedAiCvId, aiMatches]);

  const toggleAiCvReason = (cvIdNum, matchRow) => {
    const key = String(cvIdNum);
    if (expandedAiCvId === key) {
      setExpandedAiCvId(null);
      return;
    }
    setExpandedAiCvId(key);
    const cachedReason = aiReasonByCvId[key];
    if (cachedReason) return;
    const directReason = getAiReasonText(matchRow);
    setAiReasonByCvId((prev) => ({
      ...prev,
      [key]: directReason || t('matchingReasonLoadError'),
    }));
  };

  useEffect(() => {
    if (!showSaveToListModal) return;
    let cancelled = false;
    setLoadingSaveToListLists(true);
    setSaveToListMessage(null);
    apiService.getSavedLists({ page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled && res.success && res.data?.items) setSaveToListLists(res.data.items);
        else if (!cancelled) setSaveToListLists([]);
      })
      .catch(() => { if (!cancelled) setSaveToListLists([]); })
      .finally(() => { if (!cancelled) setLoadingSaveToListLists(false); });
    return () => { cancelled = true; };
  }, [showSaveToListModal]);

  const loadJobDetail = async () => {
    if (!getJobApi) return;
    try {
      setLoading(true);
      setError(null);
      const response = await getJobApi(jobId);
      if (response.success && response.data?.job) {
        const nextJob = response.data.job;
        setJob(nextJob);
        setIsFavorite(nextJob.isFavorite || false);
        setAdminAdviseVi(nextJob.adminAdviseVi ?? nextJob.admin_advise_vi ?? '');
        setAdminAdviseEn(nextJob.adminAdviseEn ?? nextJob.admin_advise_en ?? '');
        setAdminAdviseJp(nextJob.adminAdviseJp ?? nextJob.admin_advise_jp ?? '');
        setAdminAdviseMsg(null);
        onJobLoaded?.(nextJob);
      } else {
        setError('Không tìm thấy thông tin việc làm');
        onJobLoaded?.(null);
      }
    } catch (err) {
      console.error('Error loading job detail:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải thông tin việc làm');
      onJobLoaded?.(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    const landingUrl = `${window.location.origin}/collaborator/jobs/${jobId}`;
    navigator.clipboard.writeText(landingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveAdminAdvise = async () => {
    if (!showEditButton) return;
    if (!job?.id) return;
    setSavingAdminAdvise(true);
    setAdminAdviseMsg(null);
    try {
      const res = await apiService.updateAdminJob(job.id, {
        adminAdviseVi: adminAdviseVi || null,
        adminAdviseEn: adminAdviseEn || null,
        adminAdviseJp: adminAdviseJp || null,
      });
      if (!res?.success) throw new Error(res?.message || (language === 'vi' ? 'Save failed' : 'Save failed'));
      setJob((prev) => (prev ? { ...prev, adminAdviseVi, adminAdviseEn, adminAdviseJp } : prev));
      setAdminAdviseMsg(t('adviseSaveOk'));
    } catch (e) {
      setAdminAdviseMsg(e?.message || t('adviseSaveFail'));
    } finally {
      setSavingAdminAdvise(false);
    }
  };

  const handleOpenSaveToList = () => {
    setShowSaveToListModal(true);
    setShowCreateListInSaveModal(false);
    setNewListNameInSaveModal('');
    setSaveToListMessage(null);
  };

  const handleAddJobToList = async (listId) => {
    if (!jobId) return;
    setSaveToListMessage(null);
    try {
      await apiService.addJobToSavedList(listId, { jobId });
      setSaveToListMessage(language === 'vi' ? 'Đã thêm vào danh sách.' : 'Added to list.');
      setIsFavorite(true);
      setTimeout(() => { setShowSaveToListModal(false); }, 800);
    } catch (e) {
      setSaveToListMessage(e?.message || (language === 'vi' ? 'Thêm thất bại.' : 'Failed.'));
    }
  };

  const handleCreateListAndAddJob = async () => {
    const name = newListNameInSaveModal.trim();
    if (!name || creatingListInSaveModal || !jobId) return;
    setCreatingListInSaveModal(true);
    setSaveToListMessage(null);
    try {
      const createRes = await apiService.createSavedList({ name });
      if (!createRes.success || !createRes.data?.id) throw new Error('Create failed');
      await apiService.addJobToSavedList(createRes.data.id, { jobId });
      setSaveToListMessage(language === 'vi' ? 'Đã tạo danh sách và thêm công việc.' : 'List created and job added.');
      setIsFavorite(true);
      setShowCreateListInSaveModal(false);
      setNewListNameInSaveModal('');
      setSaveToListLists((prev) => [...prev, createRes.data]);
      setTimeout(() => { setShowSaveToListModal(false); }, 800);
    } catch (e) {
      setSaveToListMessage(e?.message || (language === 'vi' ? 'Tạo danh sách thất bại.' : 'Failed.'));
    } finally {
      setCreatingListInSaveModal(false);
    }
  };

  const handleDownloadJD = async (fileType = 'jdFile') => {
    const id = job?.id || jobId;
    if (!id) return;
    try {
      const getUrl =
        getJobFileUrlApi
        || (useAdminAPI
          ? apiService.getAdminJobFileUrl
          : isApplicantMode || publicLanding
            ? apiService.getApplicantJobFileUrl
            : apiService.getCtvJobFileUrl);
      const url = await getUrl(id, fileType, 'download');
      if (url) openRemoteFileDownloadUrl(url);
      else alert(language === 'vi' ? 'Công việc này chưa có file JD.' : 'No JD file.');
    } catch (e) {
      alert(e?.message || (language === 'vi' ? 'Không tải được JD.' : 'Failed to download JD.'));
    }
  };

  const basePath = backPath.replace(/\/$/, '');
  const handleApply = async () => {
    if (typeof onApply === 'function') {
      await onApply({ jobId, job });
      return;
    }
    navigate(`${basePath}/${jobId}/nominate`);
  };
  const handleEdit = () => {
    const path = editPath ? editPath.replace(':id', jobId) : `${basePath}/${jobId}/edit`;
    navigate(path, { state: { jobLoadMode: 'edit' } });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Collapsible Card Component
  const CollapsibleCard = ({ 
    title, 
    icon: Icon, 
    sectionKey, 
    children, 
    defaultExpanded = true,
    className = ''
  }) => {
    const isExpanded = expandedSections[sectionKey] ?? defaultExpanded;
    const isHovered = hoveredCollapsibleCard[sectionKey] || false;
    
    return (
      <div className={`rounded-lg sm:rounded-xl transition-shadow ${className}`} style={{ backgroundColor: 'white', borderColor: '#e5e7eb', borderWidth: '1px', borderStyle: 'solid', boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} onMouseEnter={() => setHoveredCollapsibleCard(prev => ({ ...prev, [sectionKey]: true }))} onMouseLeave={() => setHoveredCollapsibleCard(prev => ({ ...prev, [sectionKey]: false }))}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-3 sm:p-4 lg:p-5 xl:p-6 transition-colors rounded-t-lg sm:rounded-t-xl"
          style={{
            backgroundColor: isHovered ? '#f9fafb' : 'transparent'
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 flex-shrink-0" style={{ color: '#2563eb' }} />}
            <h2 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-left" style={{ color: '#111827' }}>
              {title}
            </h2>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 flex-shrink-0 transition-transform" style={{ color: '#6b7280' }} />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 flex-shrink-0 transition-transform" style={{ color: '#6b7280' }} />
          )}
        </button>
        {isExpanded && (
          <div className="px-3 sm:px-4 lg:px-5 xl:px-6 pb-3 sm:pb-4 lg:pb-5 xl:pb-6 pt-2 sm:pt-3 lg:pt-4 border-t" style={{ borderColor: '#f3f4f6' }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: 'white' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2563eb' }}></div>
          <p style={{ color: '#4b5563' }}>Đang tải thông tin việc làm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: 'white' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: '#ef4444' }}>{error}</p>
          <button
            onClick={() => navigate(effectiveListBackPath)}
            onMouseEnter={() => setHoveredBackToListButton(true)}
            onMouseLeave={() => setHoveredBackToListButton(false)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredBackToListButton ? '#1d4ed8' : '#2563eb',
              color: 'white'
            }}
          >
            {t('backToJobList')}
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  // Format data - dùng trường *_en, *_jp theo ngôn ngữ (fallback vi)
  const pick = (vi, en, jp) => pickByLanguage(vi, en, jp, language);
  const translateIfMissing = async (vi, en, jp) => {
    const fromText = language === 'en' ? en || vi || jp : language === 'ja' ? jp || en || vi : vi || en || jp;
    const from = language === 'en' ? (en ? 'en' : vi ? 'vi' : 'ja') : language === 'ja' ? (jp ? 'ja' : en ? 'en' : 'vi') : (vi ? 'vi' : en ? 'en' : 'ja');
    const to = language === 'en' ? 'en' : language === 'ja' ? 'ja' : 'vi';
    const cacheKey = `${from}|${to}|${fromText}`;
    const cache = translationCacheRef.current;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const translated = await translateTextWithMicrosoft(fromText, from, to).catch(() => fromText);
    cache.set(cacheKey, translated);
    return translated;
  };

  const workingLocations = (job.workingLocationDetails || [])
    .map(detail => {
      const content = pick(detail.content, detail.contentEn || detail.content_en, detail.contentJp || detail.content_jp);
      if (!content) return null;
      const stripped = stripHtml(content);
      return stripped.split('\n').map(loc => loc.trim()).filter(Boolean);
    })
    .filter(Boolean)
    .flat();
  const workingLocationsFromTable = (job.workingLocations || []).map(loc => {
    const locText = pick(loc.location, loc.locationEn || loc.location_en, loc.locationJp || loc.location_jp);
    const countryText = pick(loc.country, loc.countryEn || loc.country_en, loc.countryJp || loc.country_jp);
    return [locText, countryText].filter(Boolean).join(' - ');
  }).filter(Boolean);
  const workingLocationFallback = pick(
    job.workingLocation,
    job.workingLocationEn || job.working_location_en,
    job.workingLocationJp || job.working_location_jp
  ) || pick(
    job.location,
    job.locationEn || job.location_en,
    job.locationJp || job.location_jp
  );
  const allWorkingLocations = workingLocations.length
    ? workingLocations
    : workingLocationsFromTable.length
      ? workingLocationsFromTable
      : (workingLocationFallback ? [stripHtml(String(workingLocationFallback))] : []);

  const getSalaryTypeLabel = (typeRaw) => {
    const type = String(typeRaw || '').toLowerCase();
    if (type.includes('year') || type.includes('năm')) return t('labelAnnualIncome');
    if (type.includes('month') || type.includes('tháng')) {
      return language === 'vi' ? 'Lương tháng:' : language === 'en' ? 'Monthly salary:' : '月給:';
    }
    return t('labelSalary');
  };

  const appendJpyIfNeeded = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    const normalized = text.replace(/\s+/g, ' ');
    const hasLetters = /[A-Za-z\p{L}]/u.test(normalized);
    const alreadyHasJpy = /\bJPY\b/i.test(normalized);
    const hasNumber = /\d/.test(normalized);
    const rangeMatch = normalized.match(/^(.+?)\s*[-–—〜～]\s*(.+?)$/);
    if (alreadyHasJpy || !hasNumber || hasLetters) {
      return normalized;
    }
    if (rangeMatch) {
      const left = rangeMatch[1].trim();
      const right = rangeMatch[2].trim();
      return `${left} - ${right} JPY`;
    }
    return `${normalized} JPY`;
  };

  const salaryRows = (job.salaryRanges || [])
    .map(sr => {
      const text = stripHtml(pick(sr.salaryRange, sr.salaryRangeEn || sr.salary_range_en, sr.salaryRangeJp || sr.salary_range_jp) || '');
      if (!text) return null;
      return {
        label: getSalaryTypeLabel(sr.type),
        value: appendJpyIfNeeded(formatSalaryValueWithJlptIfRange(text)),
      };
    })
    .filter(Boolean);

  const salaryRangeDetailsRows = (job.salaryRangeDetails || [])
    .map((detail) => {
      const text = stripHtml(pick(detail.content, detail.contentEn || detail.content_en, detail.contentJp || detail.content_jp) || '').trim();
      return text || null;
    })
    .filter(Boolean);

  const overtimeAllowances = (job.overtimeAllowanceDetails || [])
    .map(detail => stripHtml(pick(detail.content, detail.contentEn || detail.content_en, detail.contentJp || detail.content_jp) || ''))
    .filter(Boolean)
    .filter((t) => !isJdUnfilledDetailPlaceholder(t));
  if (overtimeAllowances.length === 0 && (job.overtimeAllowances || []).length > 0) {
    job.overtimeAllowances.forEach(oa => {
      const text = pick(oa.overtimeAllowanceRange, oa.overtimeAllowanceRangeEn || oa.overtime_allowance_range_en, oa.overtimeAllowanceRangeJp || oa.overtime_allowance_range_jp);
      if (text) {
        const stripped = stripHtml(String(text)).trim();
        if (stripped && !isJdUnfilledDetailPlaceholder(stripped)) overtimeAllowances.push(stripped);
      }
    });
  }

  const smokingPolicyDetails = (job.smokingPolicyDetails || [])
    .map(detail => stripHtml(pick(detail.content, detail.contentEn || detail.content_en, detail.contentJp || detail.content_jp) || ''))
    .filter(Boolean);

  const workingHours = (job.workingHourDetails || [])
    .map(detail => stripHtml(pick(detail.content, detail.contentEn || detail.content_en, detail.contentJp || detail.content_jp) || ''))
    .filter(Boolean);
  if (workingHours.length === 0 && (job.workingHours || []).length > 0) {
    job.workingHours.forEach(wh => {
      const text = pick(wh.workingHours, wh.workingHoursEn || wh.working_hours_en, wh.workingHoursJp || wh.working_hours_jp);
      if (text) workingHours.push(text);
    });
  }

  const businessFields = (job.company?.businessFields || [])
    .map(field => stripHtml(pick(field.content, field.contentEn || field.content_en, field.contentJp || field.content_jp) || ''))
    .filter(Boolean);

  const offices = job.company?.offices || [];

  const getRecruitmentTypeText = (type) => {
    const key = type === 1 ? 'recruitmentType1' : type === 2 ? 'recruitmentType2' : type === 3 ? 'recruitmentType3' : type === 4 ? 'recruitmentType4' : 'unknown';
    return t(key);
  };

  const benefits = (job.benefits || [])
    .map(benefit => stripHtml(pick(benefit.content, benefit.contentEn || benefit.content_en, benefit.contentJp || benefit.content_jp) || ''))
    .filter(Boolean);

  // Các trường lưu trực tiếp trên bảng jobs (form AddJob) — trước đây trang chi tiết chỉ đọc bảng `benefits`
  const buildJobPolicyBlocks = (entries) => {
    const blocks = [];
    entries.forEach(([labelKey, vi, en, jp]) => {
      const text = stripHtml(pick(vi, en, jp) || '').trim();
      if (text && !isJdUnfilledDetailPlaceholder(text)) blocks.push({ labelKey, text });
    });
    return blocks;
  };
  const jobWelfarePolicyBlocks = buildJobPolicyBlocks([
    [
      'labelJobSocialInsurance',
      job.socialInsurance,
      job.socialInsuranceEn || job.social_insurance_en,
      job.socialInsuranceJp || job.social_insurance_jp,
    ],
    [
      'labelJobTransportation',
      job.transportation,
      job.transportationEn || job.transportation_en,
      job.transportationJp || job.transportation_jp,
    ],
    ['labelJobBonus', job.bonus, job.bonusEn || job.bonus_en, job.bonusJp || job.bonus_jp],
    [
      'labelJobSalaryReview',
      job.salaryReview,
      job.salaryReviewEn || job.salary_review_en,
      job.salaryReviewJp || job.salary_review_jp,
    ],
  ]);
  const jobSchedulePolicyBlocks = buildJobPolicyBlocks([
    [
      'labelJobBreakTime',
      job.breakTime,
      job.breakTimeEn || job.break_time_en,
      job.breakTimeJp || job.break_time_jp,
    ],
    [
      'labelJobOvertimeSummary',
      job.overtime,
      job.overtimeEn || job.overtime_en,
      job.overtimeJp || job.overtime_jp,
    ],
    [
      'labelJobHolidays',
      job.holidays,
      job.holidaysEn || job.holidays_en,
      job.holidaysJp || job.holidays_jp,
    ],
    [
      'labelJobHolidayDetails',
      job.holidayDetails,
      job.holidayDetailsEn || job.holiday_details_en,
      job.holidayDetailsJp || job.holiday_details_jp,
    ],
  ]);
  const hasJobPolicyFields =
    jobWelfarePolicyBlocks.length > 0 || jobSchedulePolicyBlocks.length > 0;

  const smokingLabels = { vi: { allow: 'Cho phép hút thuốc', deny: 'Không cho phép hút thuốc' }, en: { allow: 'Smoking allowed', deny: 'Smoking not allowed' }, ja: { allow: '喫煙可', deny: '喫煙不可' } };
  const smokingPolicies = (job.smokingPolicies || [])
    .map(policy => (language === 'en' ? smokingLabels.en : language === 'ja' ? smokingLabels.ja : smokingLabels.vi)[policy.allow ? 'allow' : 'deny']);

  // Get job tags
  const jobTags = [];
  if (job.isHot) {
    jobTags.push({ label: t('jobTagSelection'), color: 'green' });
  }
  const isInCampaign = job.jobCampaigns && job.jobCampaigns.length > 0;
  if (isInCampaign) {
    jobTags.push({ label: 'Campaign', color: 'blue' });
  }

  const disqualifications = (job.disqualifications || [])
    .map(item => stripHtml(pick(item.content, item.contentEn || item.content_en, item.contentJp || item.content_jp) || item.name || ''))
    .filter(Boolean);

  const welcomeConditions = (job.welcomeConditions || [])
    .map(item => stripHtml(pick(item.content, item.contentEn || item.content_en, item.contentJp || item.content_jp) || item.name || ''))
    .filter(Boolean);

  const jobFeatures = [];
  if (job.weekendOff) jobFeatures.push(t('jobFeatureWeekendOff'));
  if (job.maternityLeave) jobFeatures.push(t('jobFeatureMaternityLeave'));
  if (job.scoutOk) jobFeatures.push(t('jobFeatureScoutOk'));
  if (job.noExpOk) jobFeatures.push(t('jobFeatureNoExpOk'));
  if (job.noIndustryExpOk) jobFeatures.push(t('jobFeatureNoIndustryExpOk'));
  if (job.mediaOk) jobFeatures.push(t('jobFeatureMediaOk'));
  if (job.completelyNoExpOk) jobFeatures.push(t('jobFeatureCompletelyNoExpOk'));

  const getCommissionText = () => {
    if (job.jobValues && job.jobValues.length > 0) {
      const firstJobValue = job.jobValues[0];
      const value = firstJobValue.value;
      const vid = Number(firstJobValue.valueId ?? firstJobValue.valueRef?.id ?? 0);
      if (vid === 34) return value || 'Liên hệ';
      if (value !== null && value !== undefined) {
        if (job.jobCommissionType === 'percent') {
          return `${parseFloat(value).toLocaleString('vi-VN')}%`;
        } else {
          return `${parseFloat(value).toLocaleString('vi-VN')} JPY`;
        }
      }
    }
    return 'Liên hệ';
  };

  // Điều kiện phí: tính commissionTiers + commissionText giống AgentJobsPageSession2 (rankMultiplier = 1)
  const parseSalaryRangeRaw = (rangeStr) => {
    if (!rangeStr) return null;
    const m = String(rangeStr).trim().match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
    if (!m) return null;
    const parseNum = (s) => {
      const cleaned = String(s).replace(/[.,]/g, '');
      const num = parseFloat(cleaned) || 0;
      const digitCount = cleaned.replace(/[^0-9]/g, '').length;
      if (digitCount >= 7) return num;
      return num * 1000000;
    };
    const min = parseNum(m[1]);
    const max = parseNum(m[2]);
    if (min <= 0 || max <= 0) return null;
    return { min, max };
  };

  const allJobValuesForCommission = job.jobValues || job.profits || [];
  const commissionTypeIds = [1, 2, 3, 4];
  const jobValuesForCommission = allJobValuesForCommission.filter(jv => {
    const tid = jv.typeId ?? jv.id_typename ?? jv.type?.id;
    const tname = (jv.type?.typename || '').toLowerCase();
    const vid = Number(jv.valueId ?? jv.valueRef?.id ?? 0);
    if (vid === 34) return true;
    if (tid === 2 || tid === '2' || tname === 'phí' || tname === 'commission') return true;
    if (commissionTypeIds.includes(Number(tid))) return true;
    if (jv.type?.cvField && (jv.value !== null && jv.value !== undefined && jv.value !== '')) return true;
    return false;
  });

  const hideCommissionConditionLabel = jobValuesForCommission.some(jv => {
    const tid = Number(jv.typeId ?? jv.type?.id ?? 0);
    const valueId = jv.valueId ?? jv.valueRef?.id;
    const val = jv.value;
    const numVal = val !== null && val !== undefined && val !== '' ? Number(val) : null;
    if (Number(valueId) === 34) return true;
    return tid === 2 && (Number(valueId) === 6 || Number(valueId) === 7 || numVal === 6 || numVal === 7);
  });

  const contactLabel = language === 'vi' ? 'Liên hệ' : language === 'en' ? 'Contact' : 'お問い合わせ';
  let detailCommissionText = contactLabel;
  let detailCommissionTiers = [];
  let isCommissionFromCampaign = false;
  const rankMultiplier = useAdminAPI ? 1 : (ctvRankPercent > 0 ? ctvRankPercent / 100 : 1);
  const jobCampaigns = job.jobCampaigns || [];
  const campaignPercent = resolveCampaignPercentFromJob(job);
  const hasCampaignPercent = campaignPercent != null;
  const campaignPctUi =
    campaignPercent != null && Number(campaignPercent) > 0 ? Number(campaignPercent) : null;

  const formatAmountWithCurrency = (amount) => {
    const nRaw = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const n = Math.round(nRaw);
    const formatted = n.toLocaleString('vi-VN');
    return `${formatted} JPY`;
  };
  const formatCommissionForDisplay = (amount) => {
    if (amount >= 1000) return Math.round(amount).toLocaleString('vi-VN');
    if (amount < 1) return amount.toFixed(2).replace(/\.?0+$/, '');
    if (amount < 10) return amount.toFixed(1).replace(/\.?0+$/, '');
    return Math.round(amount).toString();
  };
  const formatRangeWithCurrency = (min, max, formatFn) => {
    const fm = formatFn ? formatFn(min) : Math.round(min).toLocaleString('vi-VN');
    const fx = formatFn ? formatFn(max) : Math.round(max).toLocaleString('vi-VN');
    return `${fm} - ${fx} JPY`;
  };
  const formatFromCollaboratorView = (raw) => {
    if (!raw) return null;
    const text = String(raw).trim();
    const rangeMatch = text.match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
    if (rangeMatch) {
      const minVal = parseFloat(rangeMatch[1].replace(/[.,]/g, '')) || 0;
      const maxVal = parseFloat(rangeMatch[2].replace(/[.,]/g, '')) || 0;
      if (minVal > 0 && maxVal > 0) {
        return formatRangeWithCurrency(minVal * rankMultiplier, maxVal * rankMultiplier, formatCommissionForDisplay);
      }
    }
    const numVal = parseFloat(text.replace(/[.,]/g, '')) || 0;
    if (numVal > 0) return formatAmountWithCurrency(numVal * rankMultiplier);
    return text || null;
  };

  const formatAdminJobsharePercentReceived = (percentNumeric) => {
    if (!useAdminAPI) return null;
    const n = typeof percentNumeric === 'number' ? percentNumeric : parseFloat(percentNumeric);
    if (!Number.isFinite(n)) return null;
    const formatted = n.toLocaleString('vi-VN');
    if (language === 'en') return `${formatted}% of annual income`;
    if (language === 'ja') return `${formatted}%（年収）`;
    return `${formatted}% thu nhập năm`;
  };

  /** CTV: net % = job % x level % when no numeric annual range (e.g. valueId 7 + textual salary). */
  const formatCtvReceivedPercentOfAnnualIncome = (percentNumeric) => {
    if (useAdminAPI) return contactLabel;
    const n = typeof percentNumeric === 'number' ? percentNumeric : parseFloat(percentNumeric);
    if (!Number.isFinite(n) || n <= 0) return contactLabel;
    const formatted = Number.isInteger(n)
      ? n.toLocaleString('vi-VN')
      : n.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    if (language === 'en') return `${formatted}% of annual income`;
    if (language === 'ja') return `${formatted}%（年収）`;
    return `${formatted}% thu nhập năm`;
  };

  /** Admin + jobCommissionType fixed: show amount with JPY when value parses as a number. */
  const formatAdminJobshareFixedAmount = (raw) => {
    if (!useAdminAPI || raw == null || String(raw).trim() === '') return null;
    const n = parseFloat(String(raw).replace(/[.,]/g, ''));
    if (!Number.isFinite(n) || n < 0) return null;
    return formatAmountWithCurrency(n);
  };

  const apiSalaryRanges = job.salaryRanges || [];
  const rawRange = yearSalaryRangeStringForCommission(apiSalaryRanges);
  const salaryRangeData = rawRange ? parseSalaryRangeRaw(rawRange) : null;

  if (useAdminAPI) {
    // Admin: hiển thị raw value, không tính toán
    if (jobValuesForCommission.length > 0) {
      const firstJv = pickPrimaryCommissionJobValue(jobValuesForCommission) ?? jobValuesForCommission[0];
      const value = firstJv.value;
      const valueId = Number(firstJv.valueId ?? firstJv.valueRef?.id ?? 0);

      if (valueId === 34) {
        detailCommissionText = value || contactLabel;
        detailCommissionTiers = [{ label: language === 'vi' ? 'Giá trị nhận' : 'Received Value', amount: value || contactLabel }];
      } else if (hideCommissionConditionLabel) {
        if (normalizeJobCommissionType(job) === 'percent' && value != null && value !== '') {
          const effectivePct = campaignPctUi != null ? campaignPctUi : (parseFloat(value) || 0);
          detailCommissionText =
            formatAdminJobsharePercentReceived(effectivePct) || `${value}`;
        } else if (normalizeJobCommissionType(job) === 'fixed' && value != null && value !== '') {
          detailCommissionText =
            formatAdminJobshareFixedAmount(value) || `${value}`;
        } else {
          detailCommissionText = value != null && value !== '' ? `${value}` : contactLabel;
        }
        detailCommissionTiers = [{ label: '', amount: detailCommissionText }];
      } else {
        detailCommissionTiers = jobValuesForCommission.map((jv) => {
          const rawValue = jv.value;
          const jvValueId = Number(jv.valueId ?? jv.valueRef?.id ?? 0);
          let amountText = '';
          if (jvValueId === 34) {
            amountText = rawValue != null && rawValue !== '' ? `${rawValue}` : '';
          } else if (normalizeJobCommissionType(job) === 'percent' && rawValue != null && rawValue !== '') {
            const tierPct = parseFloat(rawValue) || 0;
            const effectivePct = campaignPctUi != null ? campaignPctUi : tierPct;
            amountText = formatAdminJobsharePercentReceived(effectivePct) || `${rawValue}`;
          } else if (normalizeJobCommissionType(job) === 'fixed' && rawValue != null && rawValue !== '') {
            amountText = formatAdminJobshareFixedAmount(rawValue) || `${rawValue}`;
          } else {
            amountText = rawValue != null && rawValue !== '' ? `${rawValue}` : '';
          }
          const valueRef = jv.valueRef || {};
          const conditionLabel = pick(valueRef.valuename, valueRef.valuenameEn || valueRef.valuename_en, valueRef.valuenameJp || valueRef.valuename_jp) || (language === 'vi' ? 'Phí' : 'Fee');
          return (conditionLabel || amountText) ? { label: conditionLabel, amount: amountText || contactLabel } : null;
        }).filter(Boolean);
        if (detailCommissionTiers.length > 0) {
          detailCommissionText = detailCommissionTiers[0].amount;
        }
      }
    }
  } else if (job.computedCampaignCommission) {
    const { min, max } = job.computedCampaignCommission;
    isCommissionFromCampaign = true;
    const ctvMin = min * rankMultiplier;
    const ctvMax = max * rankMultiplier;
    detailCommissionText = formatRangeWithCurrency(ctvMin, ctvMax, formatCommissionForDisplay);
    detailCommissionTiers = [{ label: 'Campaign', amount: detailCommissionText }];
  } else if (hasCampaignPercent && campaignPercent > 0 && salaryRangeData) {
    isCommissionFromCampaign = true;
    const platformCommissionMin = salaryRangeData.min * (campaignPercent / 100);
    const platformCommissionMax = salaryRangeData.max * (campaignPercent / 100);
    const ctvMinAmount = platformCommissionMin * rankMultiplier;
    const ctvMaxAmount = platformCommissionMax * rankMultiplier;
    detailCommissionText = formatRangeWithCurrency(ctvMinAmount, ctvMaxAmount, formatCommissionForDisplay);
    detailCommissionTiers = [{ label: 'Campaign', amount: detailCommissionText }];
  } else if (jobValuesForCommission.length > 0) {
    const firstJv = pickPrimaryCommissionJobValue(jobValuesForCommission) ?? jobValuesForCommission[0];
    const commissionType = normalizeJobCommissionType(job);
    const value = firstJv.value;
    const valueId = Number(firstJv.valueId ?? firstJv.valueRef?.id ?? 0);
    const firstJvCollaboratorView = firstJv.viewOnCollaborator || firstJv.view_on_collaborator || '';
    const effectivePercent =
      campaignPctUi != null
        ? campaignPctUi
        : commissionType === 'percent'
          ? (parseFloat(value) || 0)
          : (parseFloat(value) || 0);
    isCommissionFromCampaign = campaignPctUi != null;

    if (valueId === 34) {
      const ctvDisplayVal = firstJv.viewOnCollaborator || firstJv.view_on_collaborator || '';
      if (ctvDisplayVal) {
        const rangeMatch = ctvDisplayVal.match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
        if (rangeMatch) {
          const minVal = parseFloat(rangeMatch[1].replace(/[.,]/g, '')) || 0;
          const maxVal = parseFloat(rangeMatch[2].replace(/[.,]/g, '')) || 0;
          detailCommissionText = formatRangeWithCurrency(minVal * rankMultiplier, maxVal * rankMultiplier, formatCommissionForDisplay);
        } else {
          const numVal = parseFloat(ctvDisplayVal.replace(/[.,]/g, '')) || 0;
          if (numVal > 0) {
            detailCommissionText = formatAmountWithCurrency(numVal * rankMultiplier);
          } else {
            detailCommissionText = ctvDisplayVal;
          }
        }
      } else {
        detailCommissionText = contactLabel;
      }
      detailCommissionTiers = [{ label: language === 'vi' ? 'Giá trị nhận' : 'Received Value', amount: detailCommissionText }];
    } else if (valueId === 6 && value !== null && value !== undefined) {
      if (commissionType === 'fixed') {
        const fixedAmount = parseFloat(value) || 0;
        if (fixedAmount > 0) {
          detailCommissionText = formatAmountWithCurrency(fixedAmount * rankMultiplier);
        }
      } else if (commissionType === 'percent' && salaryRangeData) {
        const platformCommissionMin = salaryRangeData.min * (effectivePercent / 100);
        const platformCommissionMax = salaryRangeData.max * (effectivePercent / 100);
        detailCommissionText = formatRangeWithCurrency(platformCommissionMin * rankMultiplier, platformCommissionMax * rankMultiplier, formatCommissionForDisplay);
      } else {
        detailCommissionText = formatFromCollaboratorView(firstJvCollaboratorView) || `${effectivePercent}%`;
      }
    } else {
      const value7PercentNoAnnualRange =
        valueId === 7 &&
        commissionType === 'percent' &&
        !salaryRangeData &&
        effectivePercent > 0;

      if (value7PercentNoAnnualRange) {
        detailCommissionText = formatCtvReceivedPercentOfAnnualIncome(effectivePercent * rankMultiplier);
      } else if (
        salaryRangeData &&
        commissionType === 'percent' &&
        (value !== null && value !== undefined || campaignPctUi != null)
      ) {
        const platformCommissionMin = salaryRangeData.min * (effectivePercent / 100);
        const platformCommissionMax = salaryRangeData.max * (effectivePercent / 100);
        detailCommissionText = formatRangeWithCurrency(platformCommissionMin * rankMultiplier, platformCommissionMax * rankMultiplier, formatCommissionForDisplay);
      } else if (commissionType === 'fixed' && value !== null && value !== undefined) {
        const amount = parseFloat(value) || 0;
        if (amount > 0) detailCommissionText = formatAmountWithCurrency(amount * rankMultiplier);
      } else if (commissionType === 'percent') {
        detailCommissionText = formatFromCollaboratorView(firstJvCollaboratorView) || `${effectivePercent}%`;
      }
    }

    if (
      campaignPctUi != null &&
      detailCommissionText === contactLabel &&
      Number(firstJv.valueId ?? firstJv.valueRef?.id ?? 0) !== 34
    ) {
      detailCommissionText = `${campaignPctUi}%`;
    }

    if (Number(firstJv.valueId ?? firstJv.valueRef?.id) === 34) {
      // already set above
    } else if (isCommissionFromCampaign && detailCommissionText !== contactLabel) {
      detailCommissionTiers = [{ label: 'Campaign', amount: detailCommissionText }];
    } else {
      detailCommissionTiers = jobValuesForCommission.map((jv) => {
        const tierCommissionType = normalizeJobCommissionType(job);
        const rawValue = jv.value;
        const jvValueId = Number(jv.valueId ?? jv.valueRef?.id ?? 0);
        let amountText = '';

        if (jvValueId === 34) {
          const ctvVal = jv.viewOnCollaborator || jv.view_on_collaborator || '';
          if (ctvVal) {
            const rm = ctvVal.match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
            if (rm) {
              const mn = parseFloat(rm[1].replace(/[.,]/g, '')) || 0;
              const mx = parseFloat(rm[2].replace(/[.,]/g, '')) || 0;
              amountText = formatRangeWithCurrency(mn * rankMultiplier, mx * rankMultiplier, formatCommissionForDisplay);
            } else {
              const nv = parseFloat(ctvVal.replace(/[.,]/g, '')) || 0;
              amountText = nv > 0 ? formatAmountWithCurrency(nv * rankMultiplier) : ctvVal;
            }
          } else {
            amountText = contactLabel;
          }
        } else if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          if (tierCommissionType === 'percent') {
            const tierPercent = parseFloat(rawValue) || 0;
            const effectivePct = campaignPctUi != null ? campaignPctUi : tierPercent;
            if (salaryRangeData && effectivePct > 0) {
              const pMin = salaryRangeData.min * (effectivePct / 100) * rankMultiplier;
              const pMax = salaryRangeData.max * (effectivePct / 100) * rankMultiplier;
              amountText = formatRangeWithCurrency(pMin, pMax, formatCommissionForDisplay);
            } else if (jvValueId === 7 && effectivePct > 0) {
              amountText = formatCtvReceivedPercentOfAnnualIncome(effectivePct * rankMultiplier);
            } else {
              const ctvVal = jv.viewOnCollaborator || jv.view_on_collaborator || '';
              amountText = formatFromCollaboratorView(ctvVal) || `${effectivePct.toLocaleString('vi-VN')}%`;
            }
          } else {
            const amt = parseFloat(rawValue) || 0;
            amountText = amt > 0 ? formatAmountWithCurrency(amt * rankMultiplier) : '';
          }
        }
        const valueRef = jv.valueRef || {};
        const conditionLabel = pick(valueRef.valuename, valueRef.valuenameEn || valueRef.valuename_en, valueRef.valuenameJp || valueRef.valuename_jp) || (language === 'vi' ? 'Phí' : 'Fee');
        return (conditionLabel || amountText) ? { label: conditionLabel, amount: amountText || detailCommissionText } : null;
      }).filter(Boolean);
      if (detailCommissionTiers.length === 0 && detailCommissionText !== contactLabel) {
        detailCommissionTiers = [{ label: language === 'vi' ? 'Phí' : 'Fee', amount: detailCommissionText }];
      }
    }
  }

  // Helper function to get tag color style
  const getTagColorStyle = (color) => {
    const colors = {
      green: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' },
      orange: { backgroundColor: '#fed7aa', color: '#9a3412', borderColor: '#fdba74' },
      blue: { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' },
    };
    return colors[color] || colors.green;
  };

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  const updatedAt = formatDate(job.updatedAt);
  const publishedAt = formatDate(job.publishedAt || job.createdAt);
  const showDownloadJdMenu = hasAnyDownloadableAttachment(job);

  const displayTitle = pick(job.title, job.titleEn || job.title_en, job.titleJp || job.title_jp) || job.title;
  const displayCategoryName = (job.category && pick(job.category.name, job.category.nameEn || job.category.name_en, job.category.nameJp || job.category.name_jp)) || job.category?.name || '';
  const rc = job.recruitingCompany;
  const displayCompanyName = pick(
    rc?.companyName,
    rc?.companyNameEn || rc?.company_name_en,
    rc?.companyNameJp || rc?.company_name_jp
  ) || rc?.companyName || '';
  const displayCompanyRevenue = rc && pick(rc.revenue, rc.revenueEn || rc.revenue_en, rc.revenueJp || rc.revenue_jp);  const displayCompanyEmployees = rc && pick(rc.numberOfEmployees, rc.numberOfEmployeesEn || rc.number_of_employees_en, rc.numberOfEmployeesJp || rc.number_of_employees_jp);
  const displayCompanyHeadquarters = rc && pick(rc.headquarters, rc.headquartersEn || rc.headquarters_en, rc.headquartersJp || rc.headquarters_jp);
  const displayCompanyEstablished = rc && pick(rc.establishedDate, rc.establishedDateEn || rc.established_date_en, rc.establishedDateJp || rc.established_date_jp);
  const displayCompanyIntroduction = rc && pick(rc.companyIntroduction, rc.companyIntroductionEn || rc.company_introduction_en, rc.companyIntroductionJp || rc.company_introduction_jp);
  const displayDescription = stripHtml(pick(job.description, job.descriptionEn || job.description_en, job.descriptionJp || job.description_jp) || '');
  const displaySalaryRanges = salaryRows;
  const displaySalaryRangeDetails = salaryRangeDetailsRows;
  const displayAgeRange = job.ageRange ?? '';
  const displayNationality = job.nationality ?? '';
  const displayEducationLevel = job.educationLevel ?? '';
  const displayWorkingLocations = allWorkingLocations;
  const displayRecruitmentLocation = getRecruitmentLocationLabel(
    job.interviewLocation ?? job.interview_location,
    language
  );
  const displayGender = job.gender ?? '';
  const jobResidenceStatuses = normalizeResidenceStatusValues(
    job.residenceStatuses || job.residence_statuses || job.residenceStatus || job.residence_status
  );
  const displayResidenceStatusTags = jobResidenceStatuses.map((value) => ({
    value,
    label: getResidenceStatusLabel(value, language),
  }));
  const displayVisaSummary = displayResidenceStatusTags.map((tag) => tag.label).join(', ');
  // AddJob lưu đủ loại: technique, experience, language, certification (bắt buộc), education/skill/other (ưu tiên), v.v.
  const mappedJobRequirements = (job.requirements || [])
    .map((req) => ({
      content: stripHtml(pick(req.content, req.contentEn || req.content_en, req.contentJp || req.content_jp) || ''),
      status: req.status,
    }))
    .filter((r) => r.content);
  const requiredConditions = mappedJobRequirements.filter((r) => r.status === 'required').map((r) => r.content).filter(Boolean);
  const preferredConditions = mappedJobRequirements.filter((r) => r.status !== 'required').map((r) => r.content).filter(Boolean);
  const displayBenefits = benefits;
  const displayRecruitmentReason = stripHtml(
    pick(
      job.recruitmentReason || job.recruitment_reason,
      job.recruitmentReasonEn || job.recruitment_reason_en,
      job.recruitmentReasonJp || job.recruitment_reason_jp
    ) || ''
  );
  const displayRecruitmentProcess = stripHtml(pick(job.recruitmentProcess, job.recruitmentProcessEn || job.recruitment_process_en, job.recruitmentProcessJp || job.recruitment_process_jp) || '');
  const displayJobTags = jobTags;

  const zoomStyle = zoomOut ? { width: `${100 / ZOOM_SCALE}%`, height: `${100 / ZOOM_SCALE}%`, transform: `scale(${ZOOM_SCALE})`, transformOrigin: 'top left' } : undefined;

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
      <div
        className={`max-w-full min-w-0 w-full h-full overflow-x-hidden lg:overflow-hidden ${showMobileSidebar ? 'overflow-hidden overscroll-none touch-none' : 'overflow-y-auto'}`}
      >
        <div style={zoomStyle} className="h-auto min-w-0 max-w-full lg:h-full w-full origin-top-left">
      <div className="mx-auto w-full xl:max-w-[1600px] flex min-w-0 max-w-full flex-col gap-3 p-2 sm:p-4 lg:h-full lg:flex-row lg:gap-5 lg:p-6 pb-20 sm:pb-16 lg:pb-4" style={{ backgroundColor: '#f9fafb' }}>
      {/* Main Content - Left Column */}
      <div className="flex-1 min-w-0 min-h-0 lg:overflow-y-auto custom-scrollbar">
        <div className="min-w-0 max-w-full overflow-x-hidden rounded-lg border p-3 sm:p-4 lg:p-5 transition-shadow" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div className="min-w-0 max-w-full space-y-3 sm:space-y-4 lg:space-y-5">
          {/* Header Section: trái = tiêu đề + meta, phải = thẻ phí */}
          <div className="rounded-lg p-2 sm:p-4 lg:p-5" style={{ backgroundColor: 'transparent' }}>
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 items-stretch lg:items-start">
              {/* Cột trái: Quay lại, ID, tags, tiêu đề, category, company, features */}
              <div className="flex-1 min-w-0">
                {/* Top bar with Back button and Mobile Actions toggle */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-5">
                  <button
                    onClick={() => navigate(effectiveListBackPath)}
                    onMouseEnter={() => setHoveredBackButton(true)}
                    onMouseLeave={() => setHoveredBackButton(false)}
                    className="flex items-center gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm lg:text-base group"
                    style={{
                      color: hoveredBackButton ? '#111827' : '#4b5563'
                    }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 transition-transform" style={{ transform: hoveredBackButton ? 'translateX(-4px)' : 'translateX(0)' }} />
                    <span>{t('btnBack')}</span>
                  </button>
                  
                  {/* Mobile Actions Toggle Button */}
                  <button
                    onClick={() => setShowMobileSidebar(true)}
                    className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors"
                    style={{ 
                      borderColor: '#93c5fd', 
                      backgroundColor: showMobileSidebar ? '#eff6ff' : 'white',
                      color: '#2563eb'
                    }}
                  >
                    <Menu className="w-4 h-4" />
                    <span className="text-[10px] sm:text-xs font-medium">
                      {language === 'vi' ? 'Thao tác' : language === 'en' ? 'Actions' : 'アクション'}
                    </span>
                  </button>
                </div>

                <div className="text-[10px] sm:text-xs lg:text-sm mb-2 sm:mb-3" style={{ color: '#6b7280' }}>
                  {t('labelJobId')} <span className="font-semibold" style={{ color: '#374151' }}>{job.jobCode || job.id}</span>
                </div>

                {displayJobTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-4">
                    {displayJobTags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold border"
                        style={getTagColorStyle(tag.color)}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}

                <h1 className="max-w-full break-words text-base sm:text-lg lg:text-xl xl:text-2xl font-bold mb-2 sm:mb-3 lg:mb-4 leading-tight [overflow-wrap:anywhere]" style={{ color: '#2563eb' }}>
                  {displayTitle}
                </h1>

                {displayCategoryName && (
                  <div className="text-[10px] sm:text-xs lg:text-sm mb-2 sm:mb-3" style={{ color: '#374151' }}>
                    <span className="font-semibold" style={{ color: '#4b5563' }}>{t('labelJobCategory')}</span>
                    <span className="ml-1 sm:ml-2">{displayCategoryName || job.category?.name || ''}</span>
                  </div>
                )}

                <div className="flex items-start gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-4">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" style={{ color: '#6b7280' }} />
                  <div className="text-[10px] sm:text-xs lg:text-sm" style={{ color: '#374151' }}>
                    <span className="font-semibold" style={{ color: '#4b5563' }}>{t('labelRecruitingCompanies')}</span>
                    <span className="ml-1 sm:ml-2">{displayCompanyName || 'N/A'}</span>
                  </div>
                </div>

                {jobFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {jobFeatures.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-xs lg:text-sm font-medium border"
                        style={{ backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cột phải: Thẻ điều kiện phí (ẩn landing public) + khung thông tin nhanh */}
              {((!publicLanding && (detailCommissionTiers.length > 0 || detailCommissionText !== contactLabel)) || (displaySalaryRanges?.length > 0 || displayCategoryName || displayGender || (displayWorkingLocations?.length > 0) || displayRecruitmentLocation)) && (
                <div className="w-full lg:w-64 xl:w-72 2xl:w-80 flex-shrink-0 flex flex-col gap-1.5 sm:gap-2">
                  {/* Block điều kiện phí */}
                  {!publicLanding && (detailCommissionTiers.length > 0 || detailCommissionText !== contactLabel) && (
                    <div className="flex flex-col gap-1 sm:gap-1.5">
                      {isInCampaign && (
                        <span
                          className="self-start px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase rounded-br-md text-white"
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          Campaign
                        </span>
                      )}
                      <div
                        className="flex rounded-md overflow-hidden shadow-sm border"
                        style={{ borderColor: '#7c3aed' }}
                      >
                        <div
                          className="flex-[0_0_32%] sm:flex-[0_0_35%] min-w-0 px-1.5 sm:px-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-medium flex items-center justify-center text-center leading-snug whitespace-normal"
                          style={{
                            backgroundColor: useAdminAPI ? '#5F5F5F' : '#4b4f5a',
                            color: '#ffffff',
                          }}
                        >
                          <span className="line-clamp-3">
                            {useAdminAPI
                              ? (language === 'vi' ? 'Phí giới thiệu JobShare nhận từ khách hàng' : 'Referral fee (JS receives)')
                              : (language === 'vi' ? 'Phí giới thiệu dự kiến của bạn' : language === 'en' ? 'Estimated referral fee for you' : '想定紹介料（あなた）')}
                          </span>
                        </div>
                        {hideCommissionConditionLabel && detailCommissionTiers.length > 0 ? (
                          <div
                            className="flex-1 min-w-0 px-2 py-1.5 text-[10px] sm:text-[12px] font-bold flex items-center justify-center text-center leading-snug"
                            style={{
                              backgroundColor: '#DF2020',
                              color: '#ffffff',
                            }}
                            title={detailCommissionTiers[0]?.amount || detailCommissionText}
                          >
                            {detailCommissionTiers[0]?.amount || detailCommissionText}
                          </div>
                        ) : detailCommissionTiers.length > 0 ? (
                          <div className="flex-1 min-w-0 flex flex-col">
                            {detailCommissionTiers.map((tier, index) => (
                              <div
                                key={index}
                                className="flex min-h-[36px]"
                                style={{
                                  borderTop: index === 0 ? 'none' : '1px solid #9ca3af',
                                }}
                              >
                                <div
                                  className="w-24 sm:w-28 flex-shrink-0 px-2 py-1.5 text-[10px] sm:text-[11px] font-semibold flex items-center justify-center text-center leading-snug"
                                  style={{
                                    backgroundColor: '#EB9696',
                                    color: '#ffffff',
                                  }}
                                >
                                  <span className="break-words line-clamp-2">{tier.label}</span>
                                </div>
                                <div
                                  className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-[10px] sm:text-[12px] font-bold flex items-center justify-center text-center leading-snug"
                                  style={{
                                    backgroundColor: '#DF2020',
                                    color: '#ffffff',
                                  }}
                                >
                                  <span className="break-words" title={tier.amount}>{tier.amount}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className="flex-1 min-w-0 px-2 py-1.5 text-[10px] sm:text-[11px] font-bold flex items-center justify-center text-center break-words"
                            style={{
                              backgroundColor: '#DF2020',
                              color: '#ffffff',
                            }}
                            title={detailCommissionText}
                          >
                            {detailCommissionText}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Khung nhỏ dưới điều kiện phí: thu nhập năm, danh mục, giới tính, nơi làm việc (chỉ hiển thị khi có dữ liệu) */}
                  {(displaySalaryRanges?.length > 0 || displayCategoryName || displayGender || (displayWorkingLocations?.length > 0) || displayRecruitmentLocation) && (
                    <div className="rounded-lg border p-2 sm:p-3 text-[10px] sm:text-xs" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                      <div className="font-semibold mb-1.5 sm:mb-2" style={{ color: '#374151' }}>
                        {t('quickInfoTitle')}
                      </div>
                      <div className="space-y-1 sm:space-y-1.5">
                        {displaySalaryRanges?.length > 0 && (
                          <div className="space-y-1">
                            {displaySalaryRanges.map((salary, index) => (
                              <div key={`quick-salary-${index}`}>
                                <span className="text-gray-500 font-medium">{salary.label}</span>
                                <span className="ml-1" style={{ color: '#111827' }}>{salary.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {displayCategoryName && (
                          <div>
                            <span className="text-gray-500 font-medium">{t('labelCategory')}</span>
                            <span className="ml-1" style={{ color: '#111827' }}>{displayCategoryName}</span>
                          </div>
                        )}
                        {displayGender && (
                          <div>
                            <span className="text-gray-500 font-medium">{t('labelGender')}</span>
                            <span className="ml-1" style={{ color: '#111827' }}>{displayGender}</span>
                          </div>
                        )}
                        {displayWorkingLocations?.length > 0 && (
                          <div>
                            <span className="text-gray-500 font-medium">{t('labelLocation')}</span>
                            <span className="ml-1 block mt-0.5" style={{ color: '#111827' }}>{displayWorkingLocations.slice(0, 3).join(', ')}{displayWorkingLocations.length > 3 ? ` (+${displayWorkingLocations.length - 3})` : ''}</span>
                          </div>
                        )}
                        {displayRecruitmentLocation && (
                          <div>
                            <span className="text-gray-500 font-medium">{t('labelRecruitmentLocation')}</span>
                            <span className="ml-1 block mt-0.5" style={{ color: '#111827' }}>{displayRecruitmentLocation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date Information */}
          {(updatedAt || publishedAt) && (
            <div className="rounded-lg sm:rounded-xl shadow-sm p-2.5 sm:p-4 lg:p-5" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-5 text-[10px] sm:text-xs lg:text-sm" style={{ color: '#4b5563' }}>
                {updatedAt && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" style={{ color: '#6b7280' }} />
                    <span className="font-medium">Ngày cập nhật {updatedAt}</span>
                  </div>
                )}
                {updatedAt && publishedAt && (
                  <div className="hidden sm:block h-5 w-px" style={{ backgroundColor: '#d1d5db' }}></div>
                )}
                {publishedAt && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" style={{ color: '#6b7280' }} />
                    <span className="font-medium">Ngày xuất bản {publishedAt}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: landing public chỉ General + Q&A */}
          <div className="flex min-w-0 max-w-full border-b gap-0.5 sm:gap-1 overflow-x-auto overscroll-x-contain" style={{ borderColor: '#e5e7eb' }}>
            {(isApplicantMode || publicLanding
              ? [
                  { key: 'general', label: t('tabGeneral') },
                ]
              : [
              { key: 'general', label: t('tabGeneral') },
              { key: 'nominations', label: t('tabNominationsJob') },
              { key: 'adminAdvise', label: t('tabAdminAdvise') },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className="px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-[10px] sm:text-xs lg:text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0"
                style={{
                  color: activeTab === key ? '#2563eb' : '#6b7280',
                  borderBottomColor: activeTab === key ? '#2563eb' : 'transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'general' && (
          <>
          <CollapsibleCard
            title={t('sectionMain')}
            icon={FileText}
            sectionKey="main"
            defaultExpanded={true}
          >
            <div className="space-y-3 sm:space-y-4 lg:space-y-5 pt-1 sm:pt-2">
              {/* Job Description */}
              {(job.description || displayDescription) && (
                <div>
                  <div className="text-[10px] sm:text-xs lg:text-sm font-bold mb-2 sm:mb-3" style={{ color: '#1f2937' }}>{t('labelJobContent')}</div>
                  <div className="min-w-0 max-w-full break-words leading-relaxed whitespace-pre-line text-[10px] sm:text-xs lg:text-sm [overflow-wrap:anywhere]" style={{ color: '#374151' }}>
                    {displayDescription}
                  </div>
                </div>
              )}

              {/* Salary Range */}
              {displaySalaryRanges.length > 0 && (
                <div>
                  <div className="text-[10px] sm:text-xs lg:text-sm font-bold mb-2 sm:mb-3" style={{ color: '#1f2937' }}>{t('labelSalary')}</div>
                  <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs lg:text-sm" style={{ color: '#4b5563' }}>
                    {displaySalaryRanges.map((salary, index) => (
                      <div key={index} className="min-w-0 break-words whitespace-pre-line [overflow-wrap:anywhere]">
                        <span className="font-medium">{salary.label}</span> {salary.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displaySalaryRangeDetails.length > 0 && (
                <div>
                  <div className="text-[10px] sm:text-xs lg:text-sm font-bold mb-2 sm:mb-3" style={{ color: '#1f2937' }}>{t('labelSalaryDetail')}</div>
                  <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs lg:text-sm" style={{ color: '#4b5563' }}>
                    {displaySalaryRangeDetails.map((line, index) => {
                      const cleanedLine = stripHtml(line)
                        .replace(/^[\s•・·\-*]+/, '')
                        .replace(/^[\u25AA\u25AB\u2022\u25CF\u25E6\u2043\u2219]\s*/u, '')
                        .trim();
                      if (!cleanedLine) return null;
                      return (
                        <div key={index} className="min-w-0 break-words whitespace-pre-line [overflow-wrap:anywhere]">
                          {cleanedLine}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Info Grid - chỉ giữ Tuổi, Quốc tịch, Trình độ (phí/category/company/nơi làm việc đã có ở khung bên cạnh tiêu đề job) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 pt-3 sm:pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                {/* Visa */}
                {displayVisaSummary && (
                  <div className="rounded-lg p-2 sm:p-3 col-span-2 sm:col-span-2 lg:col-span-3" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="text-[9px] sm:text-[10px] lg:text-xs font-semibold uppercase tracking-wide mb-1 sm:mb-2" style={{ color: '#6b7280' }}>
                      {t('labelVisa')}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base font-bold" style={{ color: '#111827' }}>{displayVisaSummary}</div>
                  </div>
                )}

                {/* Age */}
                {displayAgeRange && (
                  <div className="rounded-lg p-2 sm:p-3" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="text-[9px] sm:text-[10px] lg:text-xs font-semibold uppercase tracking-wide mb-1 sm:mb-2" style={{ color: '#6b7280' }}>
                      {t('labelAge')}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base font-bold" style={{ color: '#111827' }}>{displayAgeRange}</div>
                  </div>
                )}

                {/* Nationality */}
                {displayNationality && (
                  <div className="rounded-lg p-2 sm:p-3" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="text-[9px] sm:text-[10px] lg:text-xs font-semibold uppercase tracking-wide mb-1 sm:mb-2" style={{ color: '#6b7280' }}>
                      {t('labelNationality')}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base font-bold" style={{ color: '#111827' }}>{displayNationality}</div>
                  </div>
                )}

                {/* Education Level */}
                {displayEducationLevel && (
                  <div className="rounded-lg p-2 sm:p-3" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="text-[9px] sm:text-[10px] lg:text-xs font-semibold uppercase tracking-wide mb-1 sm:mb-2" style={{ color: '#6b7280' }}>
                      {t('labelEducation')}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base font-bold" style={{ color: '#111827' }}>{displayEducationLevel}</div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title={t('sectionRequirements')}
            icon={Users}
            sectionKey="requirements"
            defaultExpanded={true}
          >
            <div className="space-y-6 pt-2">
              {/* Điều kiện bắt buộc */}
              {requiredConditions.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm font-bold mb-3" style={{ color: '#111827' }}>{t('labelRequired')}</div>
                  <ul className="space-y-1 text-xs sm:text-sm ml-4">
                    {requiredConditions.map((content, index) => (
                      <li key={index} style={{ color: '#111827' }}>■ {content}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Điều kiện ưu tiên */}
              {preferredConditions.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm font-bold mb-3" style={{ color: '#111827' }}>{t('labelPreferred')}</div>
                  <ul className="space-y-1 text-xs sm:text-sm ml-4" style={{ color: '#4b5563' }}>
                    {preferredConditions.map((content, index) => (
                      <li key={index}>• {content}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Welcome Conditions */}
              {welcomeConditions.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm font-bold mb-3" style={{ color: '#111827' }}>{t('labelWelcomeConditions')}</div>
                  <ul className="space-y-1 text-xs sm:text-sm ml-4" style={{ color: '#4b5563' }}>
                    {welcomeConditions.map((condition, index) => (
                      <li key={index}>• {condition}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disqualifications (Mục tiêu NG) */}
              {disqualifications.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm font-bold mb-3" style={{ color: '#111827' }}>{t('labelNgTarget')}</div>
                  <ul className="space-y-1 text-xs sm:text-sm ml-4" style={{ color: '#4b5563' }}>
                    {disqualifications.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleCard>

          {(benefits.length > 0 || hasJobPolicyFields || workingHours.length > 0 || overtimeAllowances.length > 0 || smokingPolicies.length > 0 || smokingPolicyDetails.length > 0) && (
            <CollapsibleCard
              title={t('sectionBenefits')}
              icon={Award}
              sectionKey="benefits"
              defaultExpanded={true}
            >
              <div className="space-y-4 pt-2">
                {jobWelfarePolicyBlocks.map((block, index) => (
                  <div key={`welfare-${block.labelKey}-${index}`}>
                    <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: '#374151' }}>{t(block.labelKey)}</div>
                    <div
                      className="text-xs sm:text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]"
                      style={{ color: '#4b5563' }}
                    >
                      {block.text}
                    </div>
                  </div>
                ))}

                {displayBenefits.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: '#374151' }}>{t('labelBenefits')}</div>
                    <ul className="space-y-2 text-xs sm:text-sm pl-5" style={{ color: '#4b5563', listStyleType: 'disc', listStylePosition: 'outside' }}>
                      {displayBenefits.map((benefit, index) => (
                        <li key={index} className="pl-1">
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {workingHours.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: '#374151' }}>{t('labelWorkingHours')}</div>
                    <ul className="space-y-1 text-xs sm:text-sm pl-5" style={{ color: '#4b5563', listStyleType: 'disc', listStylePosition: 'outside' }}>
                      {workingHours.map((hour, index) => (
                        <li key={index} className="pl-1">{hour}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {jobSchedulePolicyBlocks.map((block, index) => (
                  <div key={`sched-${block.labelKey}-${index}`}>
                    <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: '#374151' }}>{t(block.labelKey)}</div>
                    <div
                      className="text-xs sm:text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]"
                      style={{ color: '#4b5563' }}
                    >
                      {block.text}
                    </div>
                  </div>
                ))}

                {overtimeAllowances.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: '#374151' }}>{t('labelOvertimeAllowance')}</div>
                    <ul className="space-y-1 text-xs sm:text-sm pl-5" style={{ color: '#4b5563', listStyleType: 'disc', listStylePosition: 'outside' }}>
                      {overtimeAllowances.map((allowance, index) => (
                        <li key={index} className="pl-1">{allowance}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {smokingPolicies.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: '#374151' }}>{t('labelSmokingPolicy')}</div>
                    <ul className="space-y-1 text-xs sm:text-sm pl-5" style={{ color: '#4b5563', listStyleType: 'disc', listStylePosition: 'outside' }}>
                      {smokingPolicies.map((policy, index) => (
                        <li key={index} className="pl-1">{policy}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {smokingPolicyDetails.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: '#374151' }}>{t('labelSmokingPolicyDetail')}</div>
                    <ul className="space-y-1 text-xs sm:text-sm pl-5" style={{ color: '#4b5563', listStyleType: 'disc', listStylePosition: 'outside' }}>
                      {smokingPolicyDetails.map((detail, index) => (
                        <li key={index} className="pl-1">{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleCard>
          )}

          {(job.recruitmentProcess ||
            job.recruitment_process ||
            displayRecruitmentProcess ||
            job.recruitmentReason ||
            job.recruitment_reason ||
            displayRecruitmentReason) && (
            <CollapsibleCard
              title={t('sectionInterview')}
              icon={AlertCircle}
              sectionKey="interview"
              defaultExpanded={true}
            >
              <div className="min-w-0 max-w-full break-words pt-2 text-xs sm:text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]" style={{ color: '#4b5563' }}>
                {displayRecruitmentReason && (
                  <div className="mb-4">
                    <div className="text-xs sm:text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>
                      {language === 'vi' ? 'Lý do tuyển dụng' : language === 'en' ? 'Reason for recruitment' : '募集理由'}
                    </div>
                    <div>{displayRecruitmentReason}</div>
                  </div>
                )}
                {displayRecruitmentProcess && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>
                      {language === 'vi' ? 'Quy trình tuyển dụng' : language === 'en' ? 'Recruitment process' : '選考フロー'}
                    </div>
                    <div>{displayRecruitmentProcess}</div>
                  </div>
                )}
              </div>
            </CollapsibleCard>
          )}

          {job.recruitingCompany && (
            <CollapsibleCard
              title={t('sectionCompany')}
              icon={Building2}
              sectionKey="company"
              defaultExpanded={true}
            >
              <div className="space-y-4 pt-2">
                {/* Recruiting Company */}
                {job.recruitingCompany && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold mb-3" style={{ color: '#374151' }}>{t('labelRecruitingCompany')}</div>
                    <div className="space-y-2 text-xs sm:text-sm" style={{ color: '#4b5563' }}>
                      {displayCompanyName && (
                        <div className="font-semibold text-sm sm:text-base" style={{ color: '#111827' }}>{displayCompanyName}</div>
                      )}
                      {displayCompanyRevenue && (
                        <div>
                          <span className="font-medium">{t('labelRevenue')}</span> {displayCompanyRevenue}
                        </div>
                      )}
                      {displayCompanyEmployees && (
                        <div>
                          <span className="font-medium">{t('labelEmployees')}</span> {displayCompanyEmployees}
                        </div>
                      )}
                      {displayCompanyHeadquarters && (
                        <div>
                          <span className="font-medium">{t('labelHeadquarters')}</span> {displayCompanyHeadquarters}
                        </div>
                      )}
                      {displayCompanyEstablished && (
                        <div>
                          <span className="font-medium">{t('labelEstablished')}</span> {displayCompanyEstablished}
                        </div>
                      )}
                    </div>
                    {displayCompanyIntroduction && (
                      <p className="text-xs sm:text-sm leading-relaxed mt-3" style={{ color: '#4b5563' }}>
                        {stripHtml(displayCompanyIntroduction)}
                      </p>
                    )}
                    {job.recruitingCompany.services && job.recruitingCompany.services.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium mb-2" style={{ color: '#6b7280' }}>{t('labelServices')}</div>
                        <div className="flex flex-wrap gap-1">
                          {job.recruitingCompany.services.map((service, index) => (
                            <span key={index} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
                              {service.serviceName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {job.recruitingCompany.businessSectors && job.recruitingCompany.businessSectors.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium mb-2" style={{ color: '#6b7280' }}>{t('labelSectors')}</div>
                        <div className="flex flex-wrap gap-1">
                          {job.recruitingCompany.businessSectors.map((sector, index) => (
                            <span key={index} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                              {sector.sectorName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                    )}
              </div>
            </CollapsibleCard>
          )}
          </>
          )}

          {activeTab === 'nominations' && (
            <div className="rounded-xl shadow-sm p-5 sm:p-6" style={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>{t('h2NominationsJob')}</h2>
              <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
                {useAdminAPI ? t('pNominationsJobAdmin') : t('pNominationsJobCtv')}
              </p>
              {loadingApplications ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : (() => {
                const nominations = Array.isArray(jobApplications) ? jobApplications : [];
                if (nominations.length === 0) {
                  return <p className="text-sm py-4" style={{ color: '#6b7280' }}>{t('noNominationsJob')}</p>;
                }

                const hasRejected = nominations.some((app) => {
                  try {
                    return getJobApplicationStatus(app.status)?.category === 'rejected';
                  } catch {
                    return false;
                  }
                });

                return (
                  <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
                    <table className="w-full max-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th className="text-left py-2 px-3 font-semibold" style={{ color: '#374151' }}>{t('thCandidate')}</th>
                          <th className="text-left py-2 px-3 font-semibold" style={{ color: '#374151' }}>{t('thStatus')}</th>
                          {hasRejected && (
                            <th className="text-left py-2 px-3 font-semibold" style={{ color: '#374151' }}>{t('thRejectReason')}</th>
                          )}
                          <th className="text-left py-2 px-3 font-semibold" style={{ color: '#374151' }}>{t('thNominationDate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nominations.map((app) => {
                          const statusInfo = getJobApplicationStatus(app.status);
                          return (
                            <tr key={app.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td className="max-w-[40%] break-words py-2 px-3 align-top" style={{ color: '#111827' }}>
                                {app.cv?.name || app.cv?.code || `#${app.id}`}
                              </td>
                              <td className="break-words py-2 px-3 align-top">
                                <span className={`px-2 py-0.5 rounded text-xs border ${statusInfo.color}`}>
                                  {getJobApplicationStatusLabelByLanguage(app.status, language)}
                                </span>
                              </td>
                              {hasRejected && (
                                <td className="max-w-[35%] break-words py-2 px-3 align-top" style={{ color: '#4b5563' }}>
                                  {app.rejectNote || '—'}
                                </td>
                              )}
                              <td className="whitespace-nowrap py-2 px-3 align-top" style={{ color: '#6b7280' }}>
                                {app.appliedAt ? formatDate(app.appliedAt) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'adminAdvise' && !publicLanding && (
            <div className="rounded-xl shadow-sm p-5 sm:p-6" style={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>{t('h2AdminAdvise')}</h2>
              <p className="text-xs mb-4" style={{ color: '#6b7280' }}>{t('pAdminAdvise')}</p>
              {showEditButton ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>{t('labelAdviseVi')}</div>
                      <textarea
                        value={adminAdviseVi}
                        onChange={(e) => setAdminAdviseVi(e.target.value)}
                        disabled={savingAdminAdvise}
                        className="w-full px-2 py-2 text-[10px] sm:text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                        style={{ borderColor: '#d1d5db', minHeight: 110 }}
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>{t('labelAdviseEn')}</div>
                      <textarea
                        value={adminAdviseEn}
                        onChange={(e) => setAdminAdviseEn(e.target.value)}
                        disabled={savingAdminAdvise}
                        className="w-full px-2 py-2 text-[10px] sm:text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                        style={{ borderColor: '#d1d5db', minHeight: 110 }}
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>{t('labelAdviseJp')}</div>
                      <textarea
                        value={adminAdviseJp}
                        onChange={(e) => setAdminAdviseJp(e.target.value)}
                        disabled={savingAdminAdvise}
                        className="w-full px-2 py-2 text-[10px] sm:text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                        style={{ borderColor: '#d1d5db', minHeight: 110 }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={handleSaveAdminAdvise}
                      disabled={savingAdminAdvise}
                      className="px-3 py-1.5 rounded text-[11px] font-semibold transition-colors"
                      style={{
                        backgroundColor: savingAdminAdvise ? '#e5e7eb' : '#2563eb',
                        color: 'white',
                        cursor: savingAdminAdvise ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {savingAdminAdvise ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : t('btnSaveAdvise')}
                    </button>
                  </div>

                  {adminAdviseMsg && (
                    <div className="text-xs mt-3" style={{ color: adminAdviseMsg === t('adviseSaveOk') ? '#166534' : '#dc2626' }}>
                      {adminAdviseMsg}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold" style={{ color: '#374151' }}>
                    {language === 'en' ? t('labelAdviseEn') : language === 'ja' ? t('labelAdviseJp') : t('labelAdviseVi')}
                  </div>
                  <textarea
                    value={currentAdminAdviseText}
                    disabled
                    readOnly
                    className="w-full px-2 py-2 text-[10px] sm:text-xs border rounded focus:outline-none bg-gray-50 disabled:opacity-100"
                    style={{ borderColor: '#e5e7eb', minHeight: 110, whiteSpace: 'pre-wrap' }}
                  />
                </div>
              )}
            </div>
          )}

        </div>
        </div>
      </div>

      {/* Sidebar - Right Column - Hidden on mobile, shown via slide-in modal */}
      <div className="hidden lg:block h-auto lg:h-full min-h-0 w-full shrink-0 lg:w-64 xl:w-72 2xl:w-80">
        <div className="flex h-full min-h-0 w-full flex-col">
          {/* Action Buttons - Vertical on desktop */}
          <div className="flex flex-col gap-2">
            {showEditButton && (
              <button
                onClick={handleEdit}
                onMouseEnter={() => setHoveredEditButton(true)}
                onMouseLeave={() => setHoveredEditButton(false)}
                className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-all duration-200 font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5"
                style={{
                  backgroundColor: hoveredEditButton ? '#1d4ed8' : '#2563eb',
                  color: 'white',
                  boxShadow: hoveredEditButton ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{t('btnEdit')}</span>
              </button>
            )}
            {/* Suggest Candidate Button - Yellow */}
            <button
              onClick={handleApply}
              onMouseEnter={() => setHoveredSuggestButton(true)}
              onMouseLeave={() => setHoveredSuggestButton(false)}
              className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-all duration-200 font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 col-span-2 sm:col-span-1"
              style={{
                backgroundColor: hoveredSuggestButton ? '#facc15' : '#fbbf24',
                color: '#111827',
                boxShadow: hoveredSuggestButton ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="truncate">{applyButtonText || t('btnSuggestCandidate')}</span>
            </button>

            {/* Copy URL Button - Light Blue / Green when copied */}
            <button
              onClick={handleCopyUrl}
              onMouseEnter={() => setHoveredCopyButton(true)}
              onMouseLeave={() => setHoveredCopyButton(false)}
              className="w-full border py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-all duration-200 font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5"
              style={{
                borderColor: copied ? '#86efac' : '#93c5fd',
                backgroundColor: copied ? '#f0fdf4' : (hoveredCopyButton ? '#eff6ff' : 'white'),
                color: copied ? '#16a34a' : '#2563eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              {copied ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />}
              <span className="text-center leading-tight truncate">{copied ? t('btnCopied') : t('btnCopyUrl')}</span>
            </button>

            {/* Download JD Button with dropdown — chỉ hiện khi có ít nhất một file đính kèm */}
            {showDownloadJdMenu && (
            <div className="relative">
              <button
                onClick={() => setOpenDownloadMenu(!openDownloadMenu)}
                onMouseEnter={() => setHoveredDownloadButton(true)}
                onMouseLeave={() => setHoveredDownloadButton(false)}
                className="w-full border py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-all duration-200 font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5"
                style={{
                  borderColor: '#93c5fd',
                  backgroundColor: hoveredDownloadButton ? '#eff6ff' : 'white',
                  color: '#2563eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{t('btnDownloadJd')}</span>
                <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform flex-shrink-0 ${openDownloadMenu ? 'rotate-180' : ''}`} />
              </button>
              {openDownloadMenu && (
                <div
                  className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg text-[10px] sm:text-xs py-1"
                  style={{ borderColor: '#e5e7eb' }}
                  onMouseLeave={() => setOpenDownloadMenu(false)}
                >
                  {hasJobAttachment(job, 'jdFile') && (
                    <button
                      className="w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50 transition-colors"
                      onClick={() => { handleDownloadJD('jdFile'); setOpenDownloadMenu(false); }}
                    >
                      {t('jdVietnamese')}
                    </button>
                  )}
                  {hasJobAttachment(job, 'jdFileEn') && (
                    <button
                      className="w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50"
                      onClick={() => { handleDownloadJD('jdFileEn'); setOpenDownloadMenu(false); }}
                    >
                      {t('jdEnglish')}
                    </button>
                  )}
                  {hasJobAttachment(job, 'jdFileJp') && (
                    <button
                      className="w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50"
                      onClick={() => { handleDownloadJD('jdFileJp'); setOpenDownloadMenu(false); }}
                    >
                      {t('jdJapanese')}
                    </button>
                  )}
                  {hasJobAttachment(job, 'jdOriginalFile') && (
                    <button
                      className="w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50"
                      onClick={() => { handleDownloadJD('jdOriginalFile'); setOpenDownloadMenu(false); }}
                    >
                      {t('jdOriginal')}
                    </button>
                  )}
                  {hasJobAttachment(job, 'requiredCvForm') && (
                    <button
                      className="w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50"
                      onClick={() => { handleDownloadJD('requiredCvForm'); setOpenDownloadMenu(false); }}
                    >
                      {t('requiredCvForm')}
                    </button>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Save to list Button */}
            {!hideSaveToList && !isApplicantMode && (
              <button
                onClick={handleOpenSaveToList}
                onMouseEnter={() => setHoveredSaveButton(true)}
                onMouseLeave={() => setHoveredSaveButton(false)}
                className="w-full border py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-all duration-200 font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5"
                style={{
                  borderColor: '#93c5fd',
                  backgroundColor: hoveredSaveButton ? '#eff6ff' : 'white',
                  color: '#2563eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                <span className="truncate">{t('saveToList')}</span>
              </button>
            )}
          </div>
          {sidebarBelowActionsSlot != null && sidebarBelowActionsSlot !== false && (
            <div className="mt-3 sm:mt-4 w-full min-w-0 shrink-0 border-t border-gray-200 pt-3 sm:pt-4">
              {sidebarBelowActionsSlot}
            </div>
          )}
          {/* AI Matching Section - Hidden on mobile, visible on lg+ */}
          {activeTab === 'general' && !isApplicantMode && !publicLanding && (
            <div className="hidden lg:flex mt-3 sm:mt-4 border rounded-lg p-3 sm:p-4 flex-1 min-h-0 flex-col" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <h2 className="text-xs sm:text-sm font-bold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2" style={{ color: '#111827' }}>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" style={{ color: '#2563eb' }} />
                {t('matchingTitle')}
              </h2>
              {!useAdminAPI && (
                <p className="text-[10px] sm:text-xs mb-2 sm:mb-3" style={{ color: '#6b7280' }}>{t('matchingFilteredNote')}</p>
              )}
              {aiMatchLoading && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm" style={{ color: '#6b7280' }}>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
                  {t('matchingLoading')}
                </div>
              )}
              {aiMatchError && !aiMatchLoading && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm" style={{ color: aiMatchError === t('matchingComputing') ? '#d97706' : '#dc2626' }}>
                  {aiMatchError === t('matchingComputing') && <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />}
                  <p>{aiMatchError}</p>
                </div>
              )}
              {!aiMatchLoading && !aiMatchError && aiMatches.length === 0 && (
                <p className="text-xs sm:text-sm" style={{ color: '#6b7280' }}>{t('matchingEmpty')}</p>
              )}
              {!aiMatchLoading && !aiMatchError && aiMatches.length > 0 && (
                <div className="space-y-2 sm:space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
                  {aiMatches
                    .filter((row) => validAiMatchIds.includes(Number(row.id)))
                    .map((row) => {
                      const cvId = Number(row.id);
                      const key = String(cvId);
                      const meta = row.metadata || {};
                      const skills = parseAiCoreSkillsRaw(meta.core_skills_raw);
                      const name = aiCvNames[cvId] || `#${cvId}`;
                      const cvDetail = aiCvDetails[cvId] || meta.cv || meta.candidate || null;
                      const residenceStatuses = normalizeResidenceStatusValues(
                        cvDetail?.residenceStatuses ||
                          cvDetail?.residence_statuses ||
                          cvDetail?.residenceStatus ||
                          cvDetail?.residence_status ||
                          meta.residenceStatuses ||
                          meta.residence_statuses ||
                          meta.residenceStatus ||
                          meta.residence_status
                      );
                      const residenceTags = residenceStatuses.map((value) => ({
                        value,
                        label: getResidenceStatusLabel(value, language),
                      }));
                      const expanded = expandedAiCvId === key;
                      const candPath = useAdminAPI ? `/admin/candidates/${cvId}` : `/agent/candidates/${cvId}`;
                      const rawScore = Number(row.similarity_score ?? row.score ?? row.match_score ?? 0);
                      const scorePercent = Math.max(0, Math.min(100, rawScore <= 1 ? rawScore * 100 : rawScore));
                      const roundedScore = Math.round(scorePercent);
                      const managerName =
                        row.managerName ||
                        row.manager_name ||
                        row.assigned_manager ||
                        row.assignedManager ||
                        meta.managerName ||
                        meta.manager_name ||
                        meta.assigned_manager ||
                        meta.assignedManager ||
                        meta.ctv_name ||
                        meta.ctvName ||
                        meta.admin_name ||
                        meta.adminName ||
                        '';
                      const visaLabel = residenceTags[0]?.label || 'Chưa có visa';
                      const scoreTagStyle = scorePercent < 60
                        ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
                        : scorePercent <= 80
                          ? { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }
                          : { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
                      return (
                        <div key={key} className="rounded-lg border p-2.5 text-xs" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 break-words font-semibold text-[11px]" style={{ color: '#111827' }}>{name}</div>
                              <div className="mt-1 line-clamp-2 break-words text-[10px] font-semibold" style={{ color: '#4b5563' }}>{visaLabel}</div>
                            </div>
                            <div
                              className="shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                              title={`${t('matchingScore')}: ${roundedScore}%`}
                              style={scoreTagStyle}
                            >
                              {roundedScore}%
                            </div>
                          </div>
                          <div className="mt-2 flex flex-col gap-1">
                            <div className="grid grid-cols-2 gap-1 w-full">
                              <button
                                type="button"
                                onClick={() => navigate(candPath)}
                                className="inline-flex w-full items-center justify-center gap-1 whitespace-normal px-2 py-1 text-center text-[10px] font-semibold leading-tight border"
                                style={{ borderColor: '#2563eb', color: '#2563eb' }}
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {t('matchingOpenCandidate')}
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`${basePath}/${jobId}/nominate`, {
                                  state: {
                                    preselectCvId: Number(cvId),
                                    fromJobDetailAiMatching: true,
                                  },
                                })}
                                className="inline-flex w-full items-center justify-center gap-1 whitespace-normal px-2 py-1 text-center text-[10px] font-semibold leading-tight"
                                style={{ backgroundColor: '#facc15', color: '#111827' }}
                              >
                                <UserPlus className="h-3 w-3 shrink-0" />
                                {t('matchingQuickNominate')}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleAiCvReason(cvId, row)}
                              className="inline-flex w-full items-center justify-center gap-1 whitespace-normal px-2 py-1 text-center text-[10px] font-semibold leading-tight"
                              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                            >
                              {expanded ? t('matchingHideReason') : t('matchingViewReason')}
                            </button>
                          </div>
                          {expanded && (
                            <div className="mt-3 pt-3 border-t text-xs whitespace-pre-wrap" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                              <span className="font-semibold">{t('matchingReason')}: </span>
                              {aiReasonLoadingId === key && !aiReasonByCvId[key] ? (
                                <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> …</span>
                              ) : (
                                aiReasonByCvId[key] || '—'
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Mobile Sidebar Slide-in Modal — full viewport height, above bottom nav */}
    {showMobileSidebar && (
      <>
        {/* Backdrop: blocks interaction with page behind */}
        <div
          className="lg:hidden fixed inset-0 z-[100] bg-black/40"
          aria-hidden
          onClick={() => { setShowMobileSidebar(false); setOpenMobileDownloadMenu(false); }}
        />
        {/* Slide-in Panel from Right */}
        <div
          className="lg:hidden fixed top-0 right-0 z-[101] flex h-[100dvh] min-h-0 w-[min(100vw,22rem)] max-w-full flex-col bg-white shadow-2xl"
          style={{
            animation: 'slideInRight 0.25s ease-out',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3">
            <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>
              {language === 'vi' ? 'Thao tác nhanh' : language === 'en' ? 'Quick Actions' : 'クイックアクション'}
            </h3>
            <button
              type="button"
              onClick={() => { setShowMobileSidebar(false); setOpenMobileDownloadMenu(false); }}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
            >
              <X className="h-4 w-4" style={{ color: '#6b7280' }} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-3 custom-scrollbar">
            {/* Action Buttons */}
            <div className="space-y-2">
              {showEditButton && (
                <button
                  onClick={() => { handleEdit(); setShowMobileSidebar(false); }}
                  className="w-full py-2.5 px-3 rounded-lg transition-all duration-200 font-semibold text-xs flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                  }}
                >
                  <Edit className="w-4 h-4" />
                  <span>{t('btnEdit')}</span>
                </button>
              )}
              <button
                onClick={() => { handleApply(); setShowMobileSidebar(false); }}
                className="w-full py-2.5 px-3 rounded-lg transition-all duration-200 font-semibold text-xs flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#fbbf24',
                  color: '#111827',
                }}
              >
                <UserPlus className="w-4 h-4" />
                <span>{applyButtonText || t('btnSuggestCandidate')}</span>
              </button>
              <button
                type="button"
                onClick={() => { handleCopyUrl(); }}
                className="w-full border py-2.5 px-3 rounded-lg transition-all duration-200 font-semibold text-xs flex items-center justify-center gap-2"
                style={{
                  borderColor: copied ? '#86efac' : '#93c5fd',
                  backgroundColor: copied ? '#f0fdf4' : 'white',
                  color: copied ? '#16a34a' : '#2563eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                {copied ? <Check className="w-4 h-4 flex-shrink-0" /> : <Copy className="w-4 h-4 flex-shrink-0" />}
                <span className="text-center leading-tight">{copied ? t('btnCopied') : t('btnCopyUrl')}</span>
              </button>

              {/* Download JD — same pattern as desktop sidebar (outline button + dropdown) */}
              {showDownloadJdMenu && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMobileDownloadMenu((v) => !v)}
                  className="w-full border py-2.5 px-3 rounded-lg transition-all duration-200 font-semibold text-xs flex items-center justify-center gap-2"
                  style={{
                    borderColor: '#93c5fd',
                    backgroundColor: openMobileDownloadMenu ? '#eff6ff' : 'white',
                    color: '#2563eb',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t('btnDownloadJd')}</span>
                  <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${openMobileDownloadMenu ? 'rotate-180' : ''}`} />
                </button>
                {openMobileDownloadMenu && (
                  <div
                    className="absolute z-30 mt-1 w-full rounded-lg border bg-white py-1 text-xs shadow-lg"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    {hasJobAttachment(job, 'jdFile') && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left transition-colors hover:bg-gray-50"
                        onClick={() => { handleDownloadJD('jdFile'); setOpenMobileDownloadMenu(false); }}
                      >
                        {t('jdVietnamese')}
                      </button>
                    )}
                    {hasJobAttachment(job, 'jdFileEn') && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-50"
                        onClick={() => { handleDownloadJD('jdFileEn'); setOpenMobileDownloadMenu(false); }}
                      >
                        {t('jdEnglish')}
                      </button>
                    )}
                    {hasJobAttachment(job, 'jdFileJp') && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-50"
                        onClick={() => { handleDownloadJD('jdFileJp'); setOpenMobileDownloadMenu(false); }}
                      >
                        {t('jdJapanese')}
                      </button>
                    )}
                    {hasJobAttachment(job, 'jdOriginalFile') && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-50"
                        onClick={() => { handleDownloadJD('jdOriginalFile'); setOpenMobileDownloadMenu(false); }}
                      >
                        {t('jdOriginal')}
                      </button>
                    )}
                    {hasJobAttachment(job, 'requiredCvForm') && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-50"
                        onClick={() => { handleDownloadJD('requiredCvForm'); setOpenMobileDownloadMenu(false); }}
                      >
                        {t('requiredCvForm')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}
              
              {!hideSaveToList && !isApplicantMode && (
                <button
                  onClick={() => { handleOpenSaveToList(); setShowMobileSidebar(false); }}
                  className="w-full border py-2.5 px-3 rounded-lg transition-all duration-200 font-semibold text-xs flex items-center justify-center gap-2"
                  style={{
                    borderColor: '#93c5fd',
                    backgroundColor: 'white',
                    color: '#2563eb',
                  }}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  <span>{t('saveToList')}</span>
                </button>
              )}
            </div>

            {/* AI Matching Section - Only for non-public, non-applicant mode */}
            {activeTab === 'general' && !isApplicantMode && !publicLanding && (
              <div className="border rounded-lg p-3" style={{ backgroundColor: '#fafafa', borderColor: '#e5e7eb' }}>
                <h2 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: '#111827' }}>
                  <Sparkles className="w-4 h-4" style={{ color: '#2563eb' }} />
                  {t('matchingTitle')}
                </h2>
                {!useAdminAPI && (
                  <p className="text-[10px] mb-2" style={{ color: '#6b7280' }}>{t('matchingFilteredNote')}</p>
                )}
                {aiMatchLoading && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('matchingLoading')}
                  </div>
                )}
                {aiMatchError && !aiMatchLoading && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: aiMatchError === t('matchingComputing') ? '#d97706' : '#dc2626' }}>
                    {aiMatchError === t('matchingComputing') && <Loader2 className="w-4 h-4 animate-spin" />}
                    <p>{aiMatchError}</p>
                  </div>
                )}
                {!aiMatchLoading && !aiMatchError && aiMatches.length === 0 && (
                  <p className="text-xs" style={{ color: '#6b7280' }}>{t('matchingEmpty')}</p>
                )}
                {!aiMatchLoading && !aiMatchError && aiMatches.length > 0 && (
                  <div className="max-h-[min(50vh,24rem)] space-y-2 overflow-y-auto pr-0.5">
                    {aiMatches.map((row) => {
                      const cvId = Number(row.id);
                      const key = String(cvId);
                      const meta = row.metadata || {};
                      const name = aiCvNames[cvId] || `#${cvId}`;
                      const expanded = expandedAiCvId === key;
                      const candPath = useAdminAPI ? `/admin/candidates/${cvId}` : `/agent/candidates/${cvId}`;
                      const rawScore = Number(row.similarity_score ?? 0);
                      const scorePercent = Math.max(0, Math.min(100, rawScore <= 1 ? rawScore * 100 : rawScore));
                      const roundedScore = Math.round(scorePercent);
                      const managerName =
                        row.managerName ||
                        row.manager_name ||
                        row.assigned_manager ||
                        row.assignedManager ||
                        meta.managerName ||
                        meta.manager_name ||
                        meta.assigned_manager ||
                        meta.assignedManager ||
                        meta.ctv_name ||
                        meta.ctvName ||
                        meta.admin_name ||
                        meta.adminName ||
                        '';
                      const visaLabel = residenceTags[0]?.label || 'Chưa có visa';
                      const scoreTagStyle = scorePercent < 60
                        ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
                        : scorePercent <= 80
                          ? { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }
                          : { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
                      return (
                        <div key={key} className="rounded-lg border p-2.5 text-xs" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 break-words font-semibold text-[11px]" style={{ color: '#111827' }}>{name}</div>
                              <div className="mt-1 line-clamp-2 break-words text-[10px] font-semibold" style={{ color: '#4b5563' }}>{visaLabel}</div>
                            </div>
                            <div
                              className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                              title={`${t('matchingScore')}: ${roundedScore}%`}
                              style={scoreTagStyle}
                            >
                              {roundedScore}%
                            </div>
                          </div>
                          <div className="mt-2 flex flex-col gap-1">
                            <div className="grid w-full grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() => { navigate(candPath); setShowMobileSidebar(false); }}
                                className="inline-flex w-full items-center justify-center gap-1 whitespace-normal rounded border px-2 py-1.5 text-center text-[10px] font-semibold leading-tight"
                                style={{ borderColor: '#2563eb', color: '#2563eb' }}
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {t('matchingOpenCandidate')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(`${basePath}/${jobId}/nominate`, {
                                    state: {
                                      preselectCvId: Number(cvId),
                                      fromJobDetailAiMatching: true,
                                    },
                                  });
                                  setShowMobileSidebar(false);
                                }}
                                className="inline-flex w-full items-center justify-center gap-1 whitespace-normal rounded px-2 py-1.5 text-center text-[10px] font-semibold leading-tight"
                                style={{ backgroundColor: '#facc15', color: '#111827' }}
                              >
                                <UserPlus className="h-3 w-3 shrink-0" />
                                {t('matchingQuickNominate')}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleAiCvReason(cvId)}
                              className="inline-flex w-full items-center justify-center gap-1 whitespace-normal rounded px-2 py-1.5 text-center text-[10px] font-semibold leading-tight"
                              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                            >
                              {expanded ? t('matchingHideReason') : t('matchingViewReason')}
                            </button>
                          </div>
                          {expanded && (
                            <div className="mt-3 border-t pt-3 text-xs whitespace-pre-wrap" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                              <span className="font-semibold">{t('matchingReason')}: </span>
                              {aiReasonLoadingId === key && !aiReasonByCvId[key] ? (
                                <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> …</span>
                              ) : (
                                aiReasonByCvId[key] || '—'
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    )}

    {/* Modal Lưu vào danh sách */}
    {showSaveToListModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} onClick={() => !creatingListInSaveModal && setShowSaveToListModal(false)}>
        <div className="bg-white rounded-lg sm:rounded-xl shadow-xl p-4 sm:p-6 max-w-md w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
              {t('saveToListTitle')}
            </h3>
            <button type="button" onClick={() => !creatingListInSaveModal && setShowSaveToListModal(false)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </button>
          </div>
          {saveToListMessage && (
            <p className={`text-xs sm:text-sm mb-2 sm:mb-3 ${saveToListMessage.includes('thất bại') || saveToListMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveToListMessage}
            </p>
          )}
          {!showCreateListInSaveModal ? (
            <>
              {loadingSaveToListLists ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 text-sm">Loading...</div>
              ) : saveToListLists.length === 0 ? (
                <div className="py-3 sm:py-4 space-y-2 sm:space-y-3">
                  <p className="text-xs sm:text-sm text-gray-600">{t('noListsYet')}</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateListInSaveModal(true)}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-medium text-xs sm:text-sm"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t('createNewList')}
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 min-h-0 space-y-1.5 sm:space-y-2">
                  {saveToListLists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => handleAddJobToList(list.id)}
                      className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors font-medium text-gray-900 text-xs sm:text-sm"
                    >
                      {list.name}
                    </button>
                  ))}
                </div>
              )}
              {saveToListLists.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateListInSaveModal(true)}
                  className="mt-3 sm:mt-4 w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm font-medium"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('createNewList')}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-medium text-gray-700">{t('newListName')}</p>
              <input
                type="text"
                value={newListNameInSaveModal}
                onChange={(e) => setNewListNameInSaveModal(e.target.value)}
                placeholder={t('newListNamePlaceholder')}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                disabled={creatingListInSaveModal}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !creatingListInSaveModal && setShowCreateListInSaveModal(false)}
                  disabled={creatingListInSaveModal}
                  className="flex-1 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  disabled={!newListNameInSaveModal.trim() || creatingListInSaveModal}
                  onClick={handleCreateListAndAddJob}
                  className="flex-1 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm"
                >
                  {creatingListInSaveModal ? t('creating') : t('createAndSave')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
        </div>
      </div>
    </>
  );
};

export default JobDetailPage;
