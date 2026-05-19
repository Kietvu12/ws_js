/**
 * Chuẩn hóa body JSON từ form (admin/CTV) → dùng chung cho preview HTML và preview PDF.
 */
import { parseCvTableLayoutFromRequest } from './cvTableLayoutParse.js';

/** Backend HTML/PDF chỉ embed được data:image/… */
function normalizeAvatarDataUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const s = raw.trim();
  if (s.startsWith('data:image/')) return s;
  const m = /^data:([^;]+);base64,(.+)$/s.exec(s);
  if (!m?.[2]) return '';
  const declared = (m[1] || '').toLowerCase();
  if (declared.startsWith('image/')) return s;
  if (declared === 'application/octet-stream' || declared.startsWith('application/')) {
    return `data:image/jpeg;base64,${m[2]}`;
  }
  return '';
}

export function parseCvTemplatePreviewPayload(rawData) {
  const r = rawData && typeof rawData === 'object' ? rawData : {};

  const cvData = {
    name: r.nameKanji || r.name || null,
    nameKanji: r.nameKanji || r.name || null,
    furigana: r.nameKana || r.furigana || null,
    nameKana: r.nameKana || r.furigana || null,
    email: r.email || null,
    phone: r.phone || null,
    postalCode: r.postalCode || null,
    addressCurrent: r.address || r.addressCurrent || null,
    address: r.address || r.addressCurrent || null,
    birthDate: r.birthDate || null,
    ages: r.age || r.ages || null,
    age: r.age || r.ages || null,
    gender: r.gender ? (r.gender === '男' || r.gender === '1' ? 1 : r.gender === '女' || r.gender === '2' ? 2 : null) : null,
    passport: r.passport ?? null,
    skypeId: r.skypeId ?? null,
    nearestStationLine: r.nearestStationLine ?? null,
    nearestStationName: r.nearestStationName ?? null,
    dependentsCount: r.dependentsCount ?? null,
    hasSpouse: r.hasSpouse ?? null,
    spouseDependent: r.spouseDependent ?? null,
    jpResidenceStatus: r.jpResidenceStatus ?? null,
    visaExpirationDate: r.visaExpirationDate ?? null,
    educations: r.educations
      ? (typeof r.educations === 'string'
        ? (r.educations.trim() ? JSON.parse(r.educations) : null)
        : Array.isArray(r.educations) ? r.educations : null)
      : null,
    workExperiences: r.workExperiences
      ? (typeof r.workExperiences === 'string'
        ? (r.workExperiences.trim() ? JSON.parse(r.workExperiences) : null)
        : Array.isArray(r.workExperiences) ? r.workExperiences : null)
      : null,
    certificates: r.certificates
      ? (typeof r.certificates === 'string'
        ? (r.certificates.trim() ? JSON.parse(r.certificates) : null)
        : Array.isArray(r.certificates) ? r.certificates : null)
      : null,
    technicalSkills: r.technicalSkills || null,
    careerSummary: r.careerSummary || null,
    strengths: r.strengths || null,
    motivation: r.motivation || null,
    hobbiesSpecialSkills: r.hobbiesSpecialSkills || r.hobbiesOrSpecialSkills || null,
    hobbiesOrSpecialSkills: r.hobbiesSpecialSkills || r.hobbiesOrSpecialSkills || null,
    notes: r.notes ?? r.remarks ?? null,
    remarks: r.remarks ?? r.notes ?? null,
    cvDocumentDate: r.cvDocumentDate ?? null,
    currentIncome: r.currentSalary ? parseInt(String(r.currentSalary).replace(/[^\d]/g, ''), 10) || null : null,
    desiredIncome: r.desiredSalary ? parseInt(String(r.desiredSalary).replace(/[^\d]/g, ''), 10) || null : null,
    desiredWorkLocation: r.desiredLocation || r.desiredWorkLocation || null,
    desiredPosition: r.desiredPosition || null,
    nyushaTime: r.desiredStartDate || r.nyushaTime || null,
    addressOrigin: r.addressOrigin || null,
    stayPurpose: r.stayPurpose ?? null,
    hasDrivingLicense: r.hasDrivingLicense ?? null,
    toolsSoftwareNotes: r.toolsSoftwareNotes
      ? (typeof r.toolsSoftwareNotes === 'string'
        ? (r.toolsSoftwareNotes.trim() ? JSON.parse(r.toolsSoftwareNotes) : null)
        : r.toolsSoftwareNotes)
      : null,
    learnedTools: r.learnedTools
      ? (typeof r.learnedTools === 'string' ? JSON.parse(r.learnedTools) : r.learnedTools)
      : null,
    experienceTools: r.experienceTools
      ? (typeof r.experienceTools === 'string' ? JSON.parse(r.experienceTools) : r.experienceTools)
      : null,
    jlptLevel: r.jlptLevel || null,
    jlptAcquiredYear: r.jlptAcquiredYear ?? null,
    jlptAcquiredMonth: r.jlptAcquiredMonth ?? null,
    jpConversationLevel: r.jpConversationLevel ?? null,
    enConversationLevel: r.enConversationLevel ?? null,
    otherConversationLevel: r.otherConversationLevel ?? null,
    toeicScore: r.toeicScore || null,
    toeicYear: r.toeicYear ?? null,
    toeicMonth: r.toeicMonth ?? null,
    ieltsScore: r.ieltsScore || null,
    ieltsYear: r.ieltsYear ?? null,
    ieltsMonth: r.ieltsMonth ?? null,
    drivingLicenseYear: r.drivingLicenseYear ?? null,
    drivingLicenseMonth: r.drivingLicenseMonth ?? null,
    experienceYears: r.experienceYears || null,
    specialization: r.specialization || null,
    qualification: r.qualification || null,
    currentSalary: r.currentSalary || null,
    desiredSalary: r.desiredSalary || null,
    desiredLocation: r.desiredLocation || null,
    desiredStartDate: r.desiredStartDate || null,
    cvTableLayout: parseCvTableLayoutFromRequest(r.cvTableLayout) || {},
  };

  const rawAvatar = r.avatarDataUrl || r.avatarBase64 || '';
  const avatarDataUrl = normalizeAvatarDataUrl(rawAvatar);
  const cvTemplate = (r.cvTemplate && String(r.cvTemplate).trim()) || 'common';
  const tab = (r.tab === 'rirekisho' || r.tab === 'shokumu') ? r.tab : 'all';

  return { cvData, avatarDataUrl, cvTemplate, tab };
}
