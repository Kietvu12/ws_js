import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, AlertTriangle, CheckCircle, Briefcase, Building2, MapPin, DollarSign, History, Calendar, X, ListTree, ChevronDown, Upload } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { useNominationFlow } from '../../hooks/useNominationFlow';
import apiService from '../../services/api';
import JobCategoryPickerModal from '../../component/Shared/JobCategoryPickerModal.jsx';
import { CV_ORIGINAL_ACCEPT, isSupportedCvOriginalFile } from '../../utils/cvOriginalFileTypes.js';

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
];

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const isValidPhone = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return true;
  if (!/^[\+0-9()\-\s.]{8,20}$/.test(raw)) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
};
const formatDateValue = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const NominationSelectPage = ({ variant = 'agent' }) => {
  const navigate = useNavigate();
  const flow = useNominationFlow({ variant });
  const [activeTab, setActiveTab] = useState('existing');
  const [hoveredId, setHoveredId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    nameKanji: '', birthDate: '', email: '', phone: '', jlptLevel: '', experienceYears: '',
    jobCategoryId: '', jobCategoryLabel: '', currentSalary: '', desiredSalary: '',
    desiredPosition: '', desiredLocation: '', desiredStartDate: '',
  });
  const cvFileInputRef = useRef(null);
  const shokumuFileInputRef = useRef(null);
  const [cvFile, setCvFile] = useState(null);
  const [shokumuFile, setShokumuFile] = useState(null);
  const [jobCategoryModalOpen, setJobCategoryModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'existing') flow.loadCVStorages();
    if (activeTab === 'recent') flow.loadRecentCVs();
    if (activeTab === 'history') flow.loadNominationHistory();
  }, [activeTab, flow.currentPage, flow.itemsPerPage, flow.searchTerm, flow.historySearchTerm, flow.historyStatusFilter, flow.recentPage]);

  useEffect(() => {
    if (activeTab !== 'existing') return;
    const ids = (flow.filteredCVStorages || []).map((cv) => cv?.id).filter(Boolean).map(String);
    if (!ids.length) return;
    flow.loadScoreForCvs(ids);
  }, [activeTab, flow.filteredCVStorages, flow.loadScoreForCvs]);

  const goConfirm = async (cvId) => {
    const ok = await flow.handleSelectCV(cvId);
    if (!ok) return;

    const confirmPath = flow.isAdmin
      ? `/admin/jobs/${flow.jobId}/confirm`
      : flow.isApplicantCandidate
        ? `/candidate/jobs/${flow.jobId}/confirm`
        : `/agent/jobs/${flow.jobId}/confirm`;

    navigate(confirmPath, { state: { selectedCvId: cvId, variant } });
  };

  const validateNewProfile = () => {
    const next = {};
    if (!String(form.nameKanji || '').trim()) next.nameKanji = 'Vui lòng nhập họ tên';
    if (!String(form.birthDate || '').trim()) next.birthDate = 'Vui lòng chọn ngày sinh';
    if (!String(form.email || '').trim()) next.email = 'Vui lòng nhập email';
    else if (!isValidEmail(form.email)) next.email = 'Email không hợp lệ';
    if (!isValidPhone(form.phone)) next.phone = 'Số điện thoại không hợp lệ';
    if (!cvFile) next.cvFile = 'Vui lòng tải file CV';
    else if (!isSupportedCvOriginalFile(cvFile)) next.cvFile = 'Vui lòng chọn file hợp lệ';
    if (cvFile && cvFile.size > 40 * 1024 * 1024) next.cvFile = 'File CV tối đa 40MB';
    if (shokumuFile && !isSupportedCvOriginalFile(shokumuFile)) next.shokumuFile = 'Vui lòng chọn file hợp lệ';
    if (shokumuFile && shokumuFile.size > 40 * 1024 * 1024) next.shokumuFile = 'File Shokumu tối đa 40MB';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createNewProfile = async () => {
    if (saving || !validateNewProfile()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('quickCreate', '1');
      fd.append('nameKanji', form.nameKanji || '');
      fd.append('birthDate', form.birthDate || '');
      fd.append('email', form.email || '');
      fd.append('phone', form.phone || '');
      fd.append('jlptLevel', form.jlptLevel || '');
      fd.append('experienceYears', form.experienceYears || '');
      fd.append('jobCategoryId', form.jobCategoryId || '');
      fd.append('currentSalary', form.currentSalary || '');
      fd.append('desiredSalary', form.desiredSalary || '');
      fd.append('desiredPosition', form.desiredPosition || '');
      fd.append('desiredLocation', form.desiredLocation || '');
      fd.append('desiredStartDate', form.desiredStartDate || '');
      if (cvFile) fd.append('cvFile', cvFile);
      if (shokumuFile) fd.append('shokumuFile', shokumuFile);
      if (flow.jobId) fd.append('jobId', flow.jobId);

      const res = await apiService.createCVStorage(fd);
      const cv = res?.data?.cv || res?.data?.createdCv || null;
      const cvId = cv?.id || res?.data?.cvId || null;
      if (!res?.success || !cvId) {
        alert(res?.message || 'Không tạo được hồ sơ');
        return;
      }

      const confirmPath = flow.isAdmin
        ? `/admin/jobs/${flow.jobId}/confirm`
        : flow.isApplicantCandidate
          ? `/candidate/jobs/${flow.jobId}/confirm`
          : `/agent/jobs/${flow.jobId}/confirm`;

      navigate(confirmPath, { state: { selectedCvId: cvId, variant, createdCv: cv, fromQuickCreate: true } });
    } catch (error) {
      alert(error?.message || 'Không tạo được hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const rawResidenceStatuses = flow.job?.residenceStatuses || flow.job?.residence_statuses || flow.job?.residenceStatus || flow.job?.residence_status;
  const residenceStatusTags = (() => {
    const normalizeValues = (input) => {
      if (Array.isArray(input)) return input;
      if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            return trimmed.split(',');
          }
        }
        return trimmed.split(',');
      }
      return input ? [input] : [];
    };
    return normalizeValues(rawResidenceStatuses)
      .map((item) => String(item).replace(/["'\[\]]/g, '').trim())
      .filter(Boolean)
      .map((value) => {
        const opt = RESIDENCE_STATUS_OPTIONS.find((o) => o.value === value);
        return { value, label: opt?.vi || value };
      });
  })();

  return (
    <div className="space-y-4">
      {flow.job && (
        <div className="rounded-xl p-4 border bg-white border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 flex-shrink-0"><Briefcase className="w-6 h-6 text-blue-600" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-gray-900">{flow.pickByLanguage(flow.job.title, flow.job.titleEn || flow.job.title_en, flow.job.titleJp || flow.job.title_jp)}</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] text-gray-600 mt-1.5">
                {(flow.job.company || flow.job.recruitingCompany) && <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /><span className="truncate">{flow.pickByLanguage((flow.job.recruitingCompany || flow.job.company)?.companyName || (flow.job.company?.name), (flow.job.recruitingCompany || flow.job.company)?.companyNameEn || (flow.job.recruitingCompany || flow.job.company)?.company_name_en, (flow.job.recruitingCompany || flow.job.company)?.companyNameJp || (flow.job.recruitingCompany || flow.job.company)?.company_name_jp)}</span></div>}
                {flow.job.workLocation && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{flow.job.workLocation}</span></div>}
                {flow.job.estimatedSalary && <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /><span className="truncate">{flow.job.estimatedSalary}</span></div>}
              </div>
            </div>
          </div>
          {residenceStatusTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {residenceStatusTags.map((tag) => (
                <span key={tag.value} className="px-2 py-1 rounded-full text-[10px] font-semibold border" style={{ backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}>
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-white border-gray-200">
        <div className="flex border-b overflow-x-auto border-gray-200">
          <button className={`px-4 py-3 text-[10px] font-medium border-b-2 ${activeTab === 'existing' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500'}`} onClick={() => setActiveTab('existing')}>{variant === 'applicant' ? 'Chọn hồ sơ ứng tuyển' : 'Chọn ứng viên có sẵn'}</button>
          {!flow.isApplicantCandidate && <button className={`px-4 py-3 text-[10px] font-medium border-b-2 hidden ${activeTab === 'history' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500'}`} onClick={() => setActiveTab('history')}><History className="w-3.5 h-3.5 inline mr-1" />Lịch sử</button>}
          {!flow.isApplicantCandidate && <button className={`px-4 py-3 text-[10px] font-medium border-b-2 ${activeTab === 'new' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500'}`} onClick={() => setActiveTab('new')}>Tạo hồ sơ mới</button>}
        </div>
        <div className="p-4 sm:p-6">
          {activeTab === 'existing' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-[10px]" placeholder="Tìm kiếm ứng viên..." value={flow.searchTerm} onChange={(e) => flow.setSearchTerm(e.target.value)} />
              </div>
              {flow.loadingCVs ? <div className="text-center py-8 text-gray-500 text-[10px]">Đang tải...</div> : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {flow.filteredCVStorages.map((cv) => {
                      const unavailable = !flow.isApplicantCandidate && flow.isCvUnavailableForNomination(cv);
                      const hovered = hoveredId === cv.id;
                      const scoreRow = flow.scoreByCvId[String(cv.id)];
                      const scoreValue = scoreRow?.similarity_score ?? scoreRow?.score ?? scoreRow?.match_score ?? null;
                      const scorePercent = scoreValue == null ? null : Math.max(0, Math.min(100, Number(scoreValue) <= 1 ? Number(scoreValue) * 100 : Number(scoreValue)));
                      const reasonText = flow.scoreReasonByCvId[String(cv.id)] || scoreRow?.reasoning?.reason || scoreRow?.reasoning || scoreRow?.reason || '';
                      return (
                        <div key={cv.id} onMouseEnter={() => setHoveredId(cv.id)} onMouseLeave={() => setHoveredId(null)} onClick={() => !unavailable && goConfirm(cv.id)} className="rounded-xl border p-4 transition-all" style={{ backgroundColor: unavailable ? '#f9fafb' : 'white', borderColor: hovered ? '#93c5fd' : '#e5e7eb', opacity: unavailable ? 0.6 : 1, cursor: unavailable ? 'not-allowed' : 'pointer' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">{cv.name ? cv.name.charAt(0) : '?'}</div>
                            {unavailable ? <AlertTriangle className="w-5 h-5 text-orange-500" /> : <CheckCircle className="w-5 h-5 text-blue-600 opacity-0" />}
                          </div>
                          <p className="mt-2 font-semibold text-[11px] truncate text-gray-900">{cv.name || 'N/A'}</p>
                          <p className="text-[10px] truncate text-gray-500">{cv.email || 'N/A'}</p>
                          <p className="text-[9px] mt-1 text-gray-400">{cv.code}</p>
                          {!unavailable && scorePercent != null && (
                            <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] text-blue-800">
                              <div className="font-semibold">Điểm match: {Math.round(scorePercent)}%</div>
                              {reasonText && <div className="mt-0.5 line-clamp-2 text-blue-700">{String(reasonText)}</div>}
                            </div>
                          )}
                          {unavailable && <div className="mt-2 text-[9px] text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />CV không thể tiến cử</div>}
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700">Chọn <ChevronRight className="w-3 h-3" /></div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-gray-600">
                    <div>
                      Tổng {flow.totalItems || flow.filteredCVStorages.length} hồ sơ
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50"
                        disabled={flow.currentPage <= 1 || flow.loadingCVs}
                        onClick={() => flow.setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        Trước
                      </button>
                      <span>Trang {flow.currentPage} / {Math.max(flow.totalPages || 1, 1)}</span>
                      <button
                        type="button"
                        className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50"
                        disabled={flow.currentPage >= (flow.totalPages || 1) || flow.loadingCVs}
                        onClick={() => flow.setCurrentPage((p) => p + 1)}
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'history' ? (
            <div className="text-[10px] text-gray-500">Đang giữ tab lịch sử để mở rộng sau.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0"><ListTree className="w-4 h-4" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Tạo hồ sơ mới</h3>
                    <p className="text-xs text-gray-500">Nhập nhanh thông tin ứng viên rồi tạo luôn đơn tiến cử.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Họ tên<span className="text-red-500"> *</span></label>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.nameKanji} onChange={(e) => setForm((p) => ({ ...p, nameKanji: e.target.value }))} />
                    {errors.nameKanji ? <p className="mt-1 text-xs text-red-600">{errors.nameKanji}</p> : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Ngày sinh<span className="text-red-500"> *</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <DatePicker selected={form.birthDate ? new Date(form.birthDate) : null} onChange={(date) => setForm((p) => ({ ...p, birthDate: formatDateValue(date) }))} dateFormat="yyyy-MM-dd" placeholderText="Chọn ngày sinh" className="w-full rounded-lg border pl-10 pr-3 py-2 text-sm" />
                    </div>
                    {errors.birthDate ? <p className="mt-1 text-xs text-red-600">{errors.birthDate}</p> : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Email<span className="text-red-500"> *</span></label>
                    <input type="email" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                    {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Số điện thoại</label>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                    {errors.phone ? <p className="mt-1 text-xs text-red-600">{errors.phone}</p> : null}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">{flow.t?.addCandidateIndustry || 'Ngành nghề'}</label>
                  <button type="button" onClick={() => setJobCategoryModalOpen(true)} className="w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-left hover:bg-gray-50">
                    <span className="flex items-center gap-2 min-w-0"><ListTree className="w-4 h-4 shrink-0 text-blue-600" /><span className="truncate text-gray-800">{form.jobCategoryLabel || 'Chọn ngành nghề'}</span></span>
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border bg-white border-gray-200 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Kinh nghiệm (năm)</label>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.experienceYears} onChange={(e) => setForm((p) => ({ ...p, experienceYears: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">JLPT</label>
                    <select className="w-full rounded-lg border px-3 py-2 text-sm bg-white" value={form.jlptLevel} onChange={(e) => setForm((p) => ({ ...p, jlptLevel: e.target.value }))}>
                      <option value="">Chọn JLPT</option><option value="1">N1</option><option value="2">N2</option><option value="3">N3</option><option value="4">N4</option><option value="5">N5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Lương hiện tại</label>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.currentSalary} onChange={(e) => setForm((p) => ({ ...p, currentSalary: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Lương mong muốn</label>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.desiredSalary} onChange={(e) => setForm((p) => ({ ...p, desiredSalary: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Vị trí mong muốn</label>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.desiredPosition} onChange={(e) => setForm((p) => ({ ...p, desiredPosition: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Địa điểm mong muốn</label>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.desiredLocation} onChange={(e) => setForm((p) => ({ ...p, desiredLocation: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Upload CV</label>
                    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-3 text-sm hover:bg-gray-50">
                      <span className="min-w-0 truncate text-gray-700">{cvFile ? cvFile.name : 'Chọn file CV'}</span>
                      <span className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white inline-flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Browse</span>
                      <input ref={cvFileInputRef} type="file" accept={CV_ORIGINAL_ACCEPT} className="hidden" onChange={(e) => { setCvFile(e.target.files?.[0] || null); setErrors((p) => ({ ...p, cvFile: undefined })); e.target.value = ''; }} />
                    </label>
                    {errors.cvFile ? <p className="mt-1 text-xs text-red-600">{errors.cvFile}</p> : null}
                    {cvFile ? <button type="button" className="mt-2 text-xs text-red-600" onClick={() => { setCvFile(null); if (cvFileInputRef.current) cvFileInputRef.current.value = ''; }}>Xóa file</button> : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Upload Shokumu</label>
                    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-3 text-sm hover:bg-gray-50">
                      <span className="min-w-0 truncate text-gray-700">{shokumuFile ? shokumuFile.name : 'Chọn file Shokumu'}</span>
                      <span className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white inline-flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Browse</span>
                      <input ref={shokumuFileInputRef} type="file" accept={CV_ORIGINAL_ACCEPT} className="hidden" onChange={(e) => { setShokumuFile(e.target.files?.[0] || null); setErrors((p) => ({ ...p, shokumuFile: undefined })); e.target.value = ''; }} />
                    </label>
                    {errors.shokumuFile ? <p className="mt-1 text-xs text-red-600">{errors.shokumuFile}</p> : null}
                    {shokumuFile ? <button type="button" className="mt-2 text-xs text-red-600" onClick={() => { setShokumuFile(null); if (shokumuFileInputRef.current) shokumuFileInputRef.current.value = ''; }}>Xóa file</button> : null}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" className="px-4 py-2 rounded-lg border text-sm" onClick={() => setActiveTab('existing')}>Quay lại</button>
                  <button type="button" disabled={saving} onClick={createNewProfile} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-60">{saving ? 'Đang tạo...' : 'Tạo hồ sơ và tiến cử'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {jobCategoryModalOpen && (
        <JobCategoryPickerModal
          open={jobCategoryModalOpen}
          onClose={() => setJobCategoryModalOpen(false)}
          onSelect={(category) => setForm((p) => ({ ...p, jobCategoryId: category?.id || '', jobCategoryLabel: category?.name || category?.label || '' }))}
          selectedCategoryId={form.jobCategoryId}
        />
      )}
    </div>
  );
};

export default NominationSelectPage;
