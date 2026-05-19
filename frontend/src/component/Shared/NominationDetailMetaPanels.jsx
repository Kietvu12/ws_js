import React from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Briefcase,
  Building2,
  DollarSign,
  UserCircle,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { getJobApplicationStatus } from '../../utils/jobApplicationStatus';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return dateString;
  }
};

const StatusIcon = ({ status }) => {
  const info = getJobApplicationStatus(status);
  if (info.category === 'success') return <CheckCircle className="h-4 w-4" />;
  if (info.category === 'rejected' || info.category === 'cancelled') return <XCircle className="h-4 w-4" />;
  if (info.category === 'interview') return <AlertCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

const NominationDetailMetaPanels = ({
  nomination,
  cv,
  job,
  collaborator,
  t,
  language,
  isAdmin,
  isApplicant,
  basePath,
  navigate,
  usedCvKind,
  usedCvFiles,
  matchingLoading,
  matchingScore,
  matchingDetail,
  matchingPercent,
  matchingScoreStyle,
  matchingReason,
  matchingReasonLoading,
  statusLabelText,
  hoveredBackToListButton,
  setHoveredBackToListButton,
  hoveredViewCollaboratorButton,
  setHoveredViewCollaboratorButton,
  onOpenCvModal,
  onOpenChangeStatusModal,
}) => {
  const pickByLanguage = (viText, enText, jpText) => {
    if (language === 'en') return enText || viText || '';
    if (language === 'ja') return jpText || enText || viText || '';
    return viText || enText || jpText || '';
  };

  const candidateName = cv.fullName || cv.name || nomination.name || '—';
  const candidateCode = cv.code || '—';
  const candidateProfilePath = cv?.id ? `${basePath}/candidates/${cv.id}` : '';
  const jobDetailPath = job?.id ? `${basePath}/jobs/${job.id}` : '';
  const candidateEmail = cv.email || nomination.email || '—';
  const candidatePhone = cv.phone || nomination.phone || '—';
  const candidateAddress = cv.addressCurrent || nomination.address || '—';
  const jobTitle = job.id ? pickByLanguage(job.title, job.titleEn || job.title_en, job.titleJp || job.title_jp) : '—';
  const companyName = job.recruitingCompany
    ? pickByLanguage(
        job.recruitingCompany.companyName || job.recruitingCompany.name,
        job.recruitingCompany.companyNameEn || job.recruitingCompany.company_name_en,
        job.recruitingCompany.companyNameJp || job.recruitingCompany.company_name_jp
      )
    : '—';
  const jobWorkLocationText = job.id
    ? pickByLanguage(job.workLocation, job.workLocationEn || job.work_location_en, job.workLocationJp || job.work_location_jp)
    : '—';

  const infoCard = (title, icon, children, contentClassName = 'space-y-2') => (
    <div className="rounded-lg border border-neutral-200/80 p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-1.5 border-b pb-2" style={{ borderColor: '#f3f4f6' }}>
        {icon}
        <h2 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#111827' }}>{title}</h2>
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {isApplicant && (
        <div className="pb-1">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/profile`)}
            onMouseEnter={() => setHoveredBackToListButton(true)}
            onMouseLeave={() => setHoveredBackToListButton(false)}
            className="text-[11px] font-semibold"
            style={{ color: hoveredBackToListButton ? '#1e40af' : '#2563eb' }}
          >
            ← {t.backToProfile}
          </button>
        </div>
      )}

      {infoCard(
        t.nominationInfoBlock,
        <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6b7280' }} />,
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>Tỉ lệ matching</label>
            {matchingLoading ? (
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: '#6b7280' }}>
                <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
              </span>
            ) : matchingScore ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={matchingScoreStyle}>
                <Sparkles className="h-3 w-3" />
                {Math.round(matchingPercent)}%
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: '#9ca3af' }}>—</span>
            )}
            {matchingDetail?.reasoning && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[11px]" style={{ color: '#374151' }}>
                {typeof matchingDetail.reasoning === 'object'
                  ? matchingDetail.reasoning.vi || matchingDetail.reasoning.en || matchingDetail.reasoning.jp || '—'
                  : matchingReason || '—'}
              </p>
            )}
          </div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colId}</label><p className="text-[11px] font-medium" style={{ color: '#111827' }}>{nomination.id}</p></div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.statusLabel}</label><div className="flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }}><StatusIcon status={nomination.status} />{statusLabelText}</span>{isAdmin && <button type="button" onClick={onOpenChangeStatusModal} className="rounded border px-2 py-0.5 text-[10px] font-medium" style={{ color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>{t.changeStatusButton}</button>}</div></div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colNominationDate}</label><p className="flex items-center gap-0.5 text-[11px]" style={{ color: '#111827' }}><Calendar className="h-3 w-3 flex-shrink-0" style={{ color: '#6b7280' }} />{formatDate(nomination.appliedAt)}</p></div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colInterviewDate}</label><p className="flex items-center gap-0.5 text-[11px]" style={{ color: '#111827' }}><Calendar className="h-3 w-3 flex-shrink-0" style={{ color: '#6b7280' }} />{formatDate(nomination.interviewDate)}</p></div>
          {nomination.referralFee && <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colReferralFee}</label><p className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: '#111827' }}><DollarSign className="h-3 w-3 flex-shrink-0" style={{ color: '#6b7280' }} />{nomination.referralFee.toLocaleString('vi-VN')} VNĐ</p></div>}
          {(nomination.annualSalary || nomination.monthlySalary) && <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.salaryLabel}</label><p className="text-[11px]" style={{ color: '#111827' }}>{nomination.annualSalary ? `${nomination.annualSalary.toLocaleString('vi-VN')}万円/năm` : `${nomination.monthlySalary.toLocaleString('vi-VN')}万円/tháng`}</p></div>}
          {nomination.notes && <div className="sm:col-span-2"><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.notesLabel}</label><p className="whitespace-pre-wrap break-words text-[11px]" style={{ color: '#111827' }}>{nomination.notes}</p></div>}
        </div>
      )}

      {infoCard(
        t.candidateSectionTitle || 'Thông tin ứng viên',
        <User className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6b7280' }} />,
        <div className="space-y-2">
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colName || 'Họ tên'}</label><p className="text-[11px] font-semibold" style={{ color: '#111827' }}>{candidateName}</p></div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colCode || 'Mã ứng viên'}</label>
              <p className="text-[11px]" style={{ color: '#111827' }}>{candidateCode}</p>
            </div>
            {candidateProfilePath && (
              <button
                type="button"
                onClick={() => navigate(candidateProfilePath)}
                className="shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium"
                style={{ color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
              >
                Xem hồ sơ
              </button>
            )}
          </div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>Email</label><p className="flex items-center gap-0.5 text-[11px]" style={{ color: '#111827' }}><Mail className="h-3 w-3 flex-shrink-0" style={{ color: '#6b7280' }} />{candidateEmail}</p></div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colPhone || 'Số điện thoại'}</label><p className="flex items-center gap-0.5 text-[11px]" style={{ color: '#111827' }}><Phone className="h-3 w-3 flex-shrink-0" style={{ color: '#6b7280' }} />{candidatePhone}</p></div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.colAddress || 'Địa chỉ'}</label><p className="flex items-start gap-0.5 text-[11px]" style={{ color: '#111827' }}><MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" style={{ color: '#6b7280' }} />{candidateAddress}</p></div>
        </div>
      )}

      {infoCard(
        t.jobSectionTitle || 'Thông tin công việc',
        <Briefcase className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6b7280' }} />,
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.jobTitleLabel || 'Vị trí'}</label>
              <p className="text-[11px] font-semibold" style={{ color: '#111827' }}>{jobTitle}</p>
            </div>
            {jobDetailPath && (
              <button
                type="button"
                onClick={() => navigate(jobDetailPath)}
                className="shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium"
                style={{ color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
              >
                Xem hồ sơ
              </button>
            )}
          </div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.companyLabel || 'Công ty'}</label><p className="flex items-center gap-0.5 text-[11px]" style={{ color: '#111827' }}><Building2 className="h-3 w-3 flex-shrink-0" style={{ color: '#6b7280' }} />{companyName}</p></div>
          <div><label className="mb-0.5 block text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.workLocationLabel || 'Khu vực'}</label><p className="text-[11px]" style={{ color: '#111827' }}>{jobWorkLocationText}</p></div>
        </div>
      )}

      {isAdmin && collaborator.id && infoCard(
        t.collaboratorSectionTitle,
        <UserCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6b7280' }} />,
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold" style={{ color: '#111827' }}>{collaborator.name || '—'}</p>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>{collaborator.code || collaborator.id}</p>
            </div>
            <button type="button" onClick={() => navigate(`${basePath}/collaborators/${collaborator.id}/edit`)} onMouseEnter={() => setHoveredViewCollaboratorButton(true)} onMouseLeave={() => setHoveredViewCollaboratorButton(false)} className="flex-shrink-0 text-[10px] font-medium" style={{ color: hoveredViewCollaboratorButton ? '#1e40af' : '#2563eb' }}>{t.collaboratorsEditTitle}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NominationDetailMetaPanels;
