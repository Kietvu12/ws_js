import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Archive,
  ChevronDown,
  X,
} from 'lucide-react';
import apiService from '../../services/api';
import NominationChat from '../Chat/NominationChat';
import NominationTimeline from '../Chat/NominationTimeline';
import NominationDetailMetaPanels from './NominationDetailMetaPanels';
import { getJobApplicationStatusOptionsByLanguage, getJobApplicationStatusLabelByLanguage } from '../../utils/jobApplicationStatus';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

/** Đồng bộ với NominationChat.jsx */
const STATUSES_REQUIRE_REJECTION = [4, 6, 10, 13, 16];
const STATUSES_REQUIRE_INTERVIEW_SCHEDULE = [7, 8];

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en') return enText || viText || '';
  if (lang === 'ja') return jpText || enText || viText || '';
  return viText || enText || jpText || '';
};

const NominationDetailContent = ({ variant, embeddedBasePath = '/candidate' }) => {
  const { nominationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const isAdmin = variant === 'admin';
  const isApplicant = variant === 'applicant';
  const basePath = isAdmin ? '/admin' : isApplicant ? embeddedBasePath : '/agent';
  const nominationsListPath = `${basePath}/nominations${!isApplicant ? (location.search || '') : ''}`;

  const [nomination, setNomination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusModalAttachReason, setStatusModalAttachReason] = useState(false);
  const [statusPaymentAmount, setStatusPaymentAmount] = useState('');
  const [statusInterviewDate, setStatusInterviewDate] = useState('');
  const [statusInterviewTime, setStatusInterviewTime] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cvFileList, setCvFileList] = useState({ originals: [], templates: [] });
  const [loadingUsedCv, setLoadingUsedCv] = useState(false);
  const [downloadingUsedCvZip, setDownloadingUsedCvZip] = useState(false);
  const [showCvModal, setShowCvModal] = useState(false);
  const [activeCvTab, setActiveCvTab] = useState(0);
  const [mobileNominationInfoOpen, setMobileNominationInfoOpen] = useState(false);

  const STATUS_PAID = 15;

  const [hoveredBackToListButton, setHoveredBackToListButton] = useState(false);
  const [hoveredViewCandidateButton, setHoveredViewCandidateButton] = useState(false);
  const [hoveredViewJobButton, setHoveredViewJobButton] = useState(false);
  const [hoveredViewCollaboratorButton, setHoveredViewCollaboratorButton] = useState(false);
  const [hoveredDownloadCVButton, setHoveredDownloadCVButton] = useState(false);
  const [matchingScore, setMatchingScore] = useState(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingReason, setMatchingReason] = useState('');
  const [matchingReasonLoading, setMatchingReasonLoading] = useState(false);
  const [matchingDetail, setMatchingDetail] = useState(null);
  const [timelineMessages, setTimelineMessages] = useState([]);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);

  useEffect(() => {
    loadNominationDetail();
  }, [nominationId]);

  useEffect(() => {
    if (!mobileNominationInfoOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileNominationInfoOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNominationInfoOpen]);

  const loadNominationDetail = async () => {
    if (!nominationId) {
      setError(t.invalidNominationId);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = isAdmin
        ? await apiService.getAdminJobApplicationById(nominationId)
        : isApplicant
          ? await apiService.getApplicantJobApplicationById(nominationId)
          : await apiService.getJobApplicationById(nominationId);

      if (response.success && response.data?.jobApplication) {
        setNomination(response.data.jobApplication);
        try {
          const msgRes = isAdmin
            ? await apiService.getAdminMessagesByJobApplication(nominationId)
            : isApplicant
              ? await apiService.getApplicantMessagesByJobApplication(nominationId)
              : await apiService.getCTVMessagesByJobApplication(nominationId);
          if (msgRes.success && msgRes.data?.messages) {
            setTimelineMessages(msgRes.data.messages);
          }
        } catch (_) { /* timeline messages are optional */ }
      } else {
        setError(response.message || t.nominationNotFound);
      }
    } catch (err) {
      console.error('Error loading nomination detail:', err);
      setError(err.message || t.errorLoadNominationDetail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isApplicant) {
      setCvFileList({ originals: [], templates: [] });
      setLoadingUsedCv(false);
      return;
    }
    if (!nomination || !nomination.cv || !nomination.cv.id) {
      setCvFileList({ originals: [], templates: [] });
      return;
    }
    const cvId = nomination.cv.id;
    setLoadingUsedCv(true);
    let cancelled = false;
    (async () => {
      try {
        const data = isAdmin
          ? await apiService.getAdminCVFileList(cvId)
          : await apiService.getCtvCVFileList(cvId);
        if (!cancelled) {
          setCvFileList(data || { originals: [], templates: [] });
        }
      } catch {
        if (!cancelled) {
          setCvFileList({ originals: [], templates: [] });
        }
      } finally {
        if (!cancelled) {
          setLoadingUsedCv(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nomination, isAdmin, isApplicant]);

  useEffect(() => {
    if (isApplicant) {
      setMatchingScore(null);
      setMatchingReason('');
      setMatchingDetail(null);
      setMatchingLoading(false);
      setMatchingReasonLoading(false);
      return;
    }
    if (!nomination?.jobId || !nomination?.cv?.id) {
      setMatchingScore(null);
      setMatchingReason('');
      setMatchingDetail(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setMatchingLoading(true);
      setMatchingReasonLoading(true);
      try {
        const scoreRes = await apiService.getAiMatchScoreForJobCv({
          job_id: nomination.jobId,
          top_k: 20,
          cv_ids: [String(nomination.cv.id)],
        });
        if (cancelled) return;
        const rows = Array.isArray(scoreRes)
          ? scoreRes
          : Array.isArray(scoreRes?.items)
            ? scoreRes.items
            : Array.isArray(scoreRes?.data?.items)
              ? scoreRes.data.items
              : [];
        const row = rows.find((r) => String(r?.id) === String(nomination.cv.id)) || rows[0] || null;
        setMatchingScore(row || null);
        setMatchingDetail(row || null);
        const reasoning = row?.reasoning ?? row?.reason ?? row?.matching_reason ?? null;
        const reason = typeof reasoning === 'object'
          ? reasoning?.vi || reasoning?.en || reasoning?.jp || ''
          : reasoning;
        setMatchingReason(reason && String(reason).trim() ? String(reason).trim() : 'Không lấy được lý do.');
      } catch (e) {
        if (!cancelled) {
          setMatchingScore(null);
          setMatchingReason(e?.message || 'Không lấy được lý do.');
        }
      } finally {
        if (!cancelled) {
          setMatchingLoading(false);
          setMatchingReasonLoading(false);
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [nomination?.jobId, nomination?.cv?.id, isApplicant]);

  const downloadUsedCvZip = async () => {
    if (!nomination?.cv?.id) return;
    const usedCvPath = nomination.cvPath || nomination.cv_path || '';
    let usedCvKind = null;
    let usedTemplateName = null;
    if (usedCvPath) {
      const lower = String(usedCvPath).toLowerCase();
      if (lower.includes('cv_original') || lower.includes('original')) {
        usedCvKind = 'original';
      } else if (lower.includes('cv_template') || lower.includes('template')) {
        usedCvKind = 'template';
        if (lower.includes('common')) usedTemplateName = 'Common';
        else if (lower.includes('/it') || lower.includes('\\it') || /it$/i.test(lower)) usedTemplateName = 'IT';
        else if (lower.includes('technical')) usedTemplateName = 'Technical';
      }
    }
    const scope = usedCvKind === 'original' ? 'original' : 'template';
    const template = usedCvKind === 'original' ? 'all' : (usedTemplateName || 'all');
    setDownloadingUsedCvZip(true);
    try {
      const { blob, filename } = isAdmin
        ? await apiService.downloadAdminCVZip(nomination.cv.id, scope, template)
        : await apiService.downloadCtvCVZip(nomination.cv.id, scope, template);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'cv-folder.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(t.errorDownloadZip || 'Không thể tải ZIP.');
    } finally {
      setDownloadingUsedCvZip(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t.confirmDeleteNominationDetail)) {
      return;
    }
    try {
      setDeleting(true);
      const response = await apiService.deleteAdminJobApplication(nominationId);
      if (response.success) {
        alert(t.deleteNominationSuccess);
        navigate(nominationsListPath);
      } else {
        alert(response.message || t.errorDeleteNomination);
      }
    } catch (err) {
      console.error('Error deleting nomination:', err);
      alert(err.message || t.errorDeleteNomination);
    } finally {
      setDeleting(false);
    }
  };

  const resetStatusModal = () => {
    setShowStatusModal(false);
    setNewStatus(null);
    setStatusReason('');
    setStatusModalAttachReason(false);
    setStatusPaymentAmount('');
    setStatusInterviewDate('');
    setStatusInterviewTime('');
  };

  const handleUpdateStatus = async () => {
    if (!nomination?.id) return;
    const statusNum = newStatus != null ? parseInt(newStatus, 10) : nomination.status;
    const effectiveReason = statusModalAttachReason ? statusReason.trim() : null;
    if (Number.isNaN(statusNum) || statusNum < 1 || statusNum > 16) {
      alert(t.selectValidStatus);
      return;
    }

    if (STATUSES_REQUIRE_INTERVIEW_SCHEDULE.includes(statusNum)) {
      if (!statusInterviewDate || !statusInterviewTime) {
        alert(t.chatErrorInterviewRequired);
        return;
      }
    }
    if (statusNum === STATUS_PAID) {
      const amount = parseFloat(statusPaymentAmount);
      if (Number.isNaN(amount) || amount < 0) {
        alert(t.chatErrorPaymentAmountRequired || t.enterValidPayment);
        return;
      }
    }

    if (
      statusNum === nomination.status &&
      !effectiveReason &&
      statusNum !== STATUS_PAID &&
      !STATUSES_REQUIRE_INTERVIEW_SCHEDULE.includes(statusNum)
    ) {
      resetStatusModal();
      return;
    }
    if (statusModalAttachReason && !statusReason.trim()) {
      alert(t.chatReasonRequired || 'Vui lòng nhập lý do.');
      return;
    }

    try {
      setUpdatingStatus(true);

      if (STATUSES_REQUIRE_INTERVIEW_SCHEDULE.includes(statusNum)) {
        const dateTime = new Date(`${statusInterviewDate}T${statusInterviewTime}`);
        const calendarData = {
          jobApplicationId: parseInt(nomination.id, 10),
          eventType: 1,
          startAt: dateTime.toISOString(),
          title: 'Phỏng vấn ứng viên',
          description: `Lịch phỏng vấn cho đơn ứng tuyển #${nomination.id}`,
          ...(nomination.collaboratorId && { collaboratorId: parseInt(nomination.collaboratorId, 10) })
        };
        const calendarResponse = await apiService.createAdminCalendar(calendarData);
        if (!calendarResponse?.success) {
          alert(calendarResponse?.message || t.chatErrorCreateSchedule);
          return;
        }
        const updateResponse = await apiService.updateAdminJobApplication(nomination.id, {
          interviewDate: dateTime.toISOString(),
          status: statusNum
        });
        if (!updateResponse.success) {
          alert(updateResponse.message || t.chatErrorUpdateApplication);
          return;
        }
        await apiService.createAdminMessage({
          jobApplicationId: parseInt(nomination.id, 10),
          content: `Đã đặt lịch phỏng vấn: ${statusInterviewDate} ${statusInterviewTime}`,
          type: 'system'
        });
        loadNominationDetail();
        resetStatusModal();
        alert(t.chatSuccessInterviewScheduled);
        return;
      }

      if (statusNum === nomination.status && statusNum !== STATUS_PAID) {
        const response = await apiService.updateAdminJobApplication(nomination.id, {
          status: nomination.status,
          rejectNote: effectiveReason
        });
        if (response.success) {
          loadNominationDetail();
          resetStatusModal();
        } else {
          alert(response.message || t.updateFailed);
        }
        return;
      }

      // Backend lưu lý do vào `rejectNote` và dùng để render nội dung tin nhắn trạng thái.
      const rejectNote = effectiveReason;
      const paymentAmount = statusNum === STATUS_PAID ? parseFloat(statusPaymentAmount) : null;
      const response = await apiService.updateJobApplicationStatus(
        nomination.id,
        statusNum,
        rejectNote,
        paymentAmount
      );
      if (response.success) {
        loadNominationDetail();
        resetStatusModal();
        alert(response.message || (t.updateSuccess || ''));
      } else {
        alert(response.message || t.changeStatusFailed);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      const msg = err?.data?.message || err?.message || t.changeStatusFailed;
      alert(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full min-w-0 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-gray-400" style={{ borderTopColor: '#6b7280' }}></div>
      </div>
    );
  }

  if (error || !nomination) {
    return (
      <div className="mx-auto w-full max-w-full min-w-0 overflow-x-hidden rounded-lg border p-8 text-center shadow-sm" style={{ backgroundColor: 'white', borderColor: '#f3f4f6' }}>
        <p className="text-sm" style={{ color: '#dc2626' }}>{error || t.nominationNotFound}</p>
        <button
          onClick={() => navigate(isApplicant ? `${basePath}/profile` : nominationsListPath)}
          onMouseEnter={() => setHoveredBackToListButton(true)}
          onMouseLeave={() => setHoveredBackToListButton(false)}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{
            backgroundColor: hoveredBackToListButton ? '#1d4ed8' : '#2563eb',
            color: 'white'
          }}
        >
          {isApplicant ? t.backToProfile : t.backToList}
        </button>
      </div>
    );
  }

  const statusLabelText = getJobApplicationStatusLabelByLanguage(nomination.status, language);
  const cv = nomination.cv || {};
  const job = nomination.job || {};
  const collaborator = nomination.collaborator || {};

  const usedCvPath = nomination.cvPath || nomination.cv_path || '';
  let usedCvKind = null;
  let usedTemplateName = null;
  if (usedCvPath) {
    const lower = String(usedCvPath).toLowerCase();
    if (lower.includes('original')) {
      usedCvKind = 'original';
    } else if (lower.includes('template')) {
      usedCvKind = 'template';
      if (lower.includes('common')) {
        usedTemplateName = 'Common';
      } else if (lower.includes('/it') || lower.includes('\\it') || /it$/i.test(lower)) {
        usedTemplateName = 'IT';
      } else if (lower.includes('technical')) {
        usedTemplateName = 'Technical';
      }
    }
  }

  const originalsForUsedCv = cvFileList.originals || [];
  const templatesForUsedCv = cvFileList.templates || [];
  const templatesByNameForUsedCv = { Common: [], IT: [], Technical: [] };
  templatesForUsedCv.forEach((tpl) => {
    if (tpl?.template && templatesByNameForUsedCv[tpl.template]) {
      templatesByNameForUsedCv[tpl.template].push(tpl);
    }
  });
  const usedCvFiles =
    usedCvKind === 'original'
      ? originalsForUsedCv
      : (usedTemplateName && templatesByNameForUsedCv[usedTemplateName]) || [];

  const selectedStatusForModal = newStatus ?? nomination.status;
  const reasonMissing = statusModalAttachReason && !statusReason.trim();
  const statusModalSubmitDisabled =
    updatingStatus ||
    reasonMissing ||
    (STATUSES_REQUIRE_INTERVIEW_SCHEDULE.includes(selectedStatusForModal) && (!statusInterviewDate || !statusInterviewTime)) ||
    (selectedStatusForModal === STATUS_PAID &&
      (Number.isNaN(parseFloat(statusPaymentAmount)) || parseFloat(statusPaymentAmount) < 0));
  const rawMatchingScore = Number(matchingScore?.similarity_score ?? 0);
  const matchingPercent = Math.max(0, Math.min(100, rawMatchingScore <= 1 ? rawMatchingScore * 100 : rawMatchingScore));
  const matchingScoreStyle = matchingPercent < 60
    ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
    : matchingPercent <= 80
      ? { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }
      : { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };

  const nominationMetaPanelProps = {
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
    hoveredViewCandidateButton,
    setHoveredViewCandidateButton,
    hoveredViewJobButton,
    setHoveredViewJobButton,
    hoveredViewCollaboratorButton,
    setHoveredViewCollaboratorButton,
    hoveredDownloadCVButton,
    setHoveredDownloadCVButton,
    onOpenCvModal: () => {
      setActiveCvTab(0);
      setShowCvModal(true);
      setMobileNominationInfoOpen(false);
    },
    onOpenChangeStatusModal: () => {
      setNewStatus(null);
      setStatusReason('');
      setStatusModalAttachReason(false);
      setStatusPaymentAmount('');
      setStatusInterviewDate('');
      setStatusInterviewTime('');
      setShowStatusModal(true);
      setMobileNominationInfoOpen(false);
    },
  };

  const chatEl = (
    <NominationChat
      jobApplicationId={nomination.id}
      userType={isAdmin ? 'admin' : isApplicant ? 'applicant' : 'ctv'}
      chatWithApplicant={isAdmin && !!nomination.applicantId}
      introCandidateName={cv.fullName || cv.name || nomination.name || '—'}
      introJobTitle={
        job.id
          ? pickByLanguage(job.title, job.titleEn || job.title_en, job.titleJp || job.title_jp, language)
          : '—'
      }
      cvStorageId={cv.id || null}
      cvPath={nomination.cvPath || nomination.cv_path || ''}
      candidateEditPath={cv.id ? `${basePath}/candidates/${cv.id}/edit` : ''}
      mobileHeaderName={isAdmin ? (collaborator.fullName || collaborator.name || t.chatTitle) : (isApplicant ? (collaborator.fullName || collaborator.name || t.chatTitle) : 'Admin')}
      mobileHeaderAvatar={isAdmin ? ((collaborator.fullName || collaborator.name || 'C').slice(0, 1).toUpperCase()) : (isApplicant ? ((collaborator.fullName || collaborator.name || 'C').slice(0, 1).toUpperCase()) : 'A')}
      onOpenInfoPanel={() => setMobileNominationInfoOpen(true)}
      {...(isAdmin && {
        collaboratorId: nomination.collaboratorId,
        currentStatus: nomination.status,
        onStatusUpdated: () => loadNominationDetail()
      })}
      onScheduleInterview={() => loadNominationDetail()}
      onScheduleNyusha={() => loadNominationDetail()}
    />
  );

  const folderGroups = [
    { key: 'original', label: 'CV gốc', files: originalsForUsedCv },
    ...Object.entries(templatesByNameForUsedCv)
      .filter(([, files]) => files.length > 0)
      .map(([key, files]) => ({ key: `template-${key}`, label: `Template / ${key}`, files })),
  ];

  const candidateName = cv.fullName || cv.name || nomination.name || '—';
  const candidateCode = cv.code || '—';
  const candidateEmail = cv.email || nomination.email || '—';
  const candidatePhone = cv.phone || nomination.phone || '—';
  const candidateAddress = cv.addressCurrent || nomination.address || '—';
  const jobTitle = job.id
    ? pickByLanguage(job.title, job.titleEn || job.title_en, job.titleJp || job.title_jp, language)
    : '—';
  const companyName = job.recruitingCompany
    ? pickByLanguage(
        job.recruitingCompany.companyName || job.recruitingCompany.name,
        job.recruitingCompany.companyNameEn || job.recruitingCompany.company_name_en,
        job.recruitingCompany.companyNameJp || job.recruitingCompany.company_name_jp,
        language
      )
    : '—';
  const jobWorkLocationText = job.id
    ? pickByLanguage(job.workLocation, job.workLocationEn || job.work_location_en, job.workLocationJp || job.work_location_jp, language)
    : '—';

  return (
    <div className="flex h-full min-w-0 max-w-full flex-col overflow-hidden lg:min-h-[calc(100vh-6rem)]">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:h-full lg:flex-row lg:gap-4">
        <div className="hidden min-h-0 w-full shrink-0 lg:block lg:h-full lg:w-[20%] lg:min-w-[180px] overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm">
          <NominationTimeline nomination={nomination} messages={timelineMessages} />
        </div>
        <div className="shrink-0 lg:hidden">
          <div className="overflow-hidden rounded-lg border shadow-sm" style={{ backgroundColor: 'white', borderColor: '#f3f4f6' }}>
            <button
              type="button"
              onClick={() => setMobileTimelineOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              aria-expanded={mobileTimelineOpen}
              aria-label={t.timelineToggle || 'Hiển thị timeline'}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#6b7280' }}>
                  {t.currentStatus || 'Trạng thái hiện tại'}
                </p>
                <p className="truncate text-xs font-semibold" style={{ color: '#111827' }}>
                  {statusLabelText || '—'}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${mobileTimelineOpen ? 'rotate-180' : ''}`} style={{ color: '#6b7280' }} aria-hidden />
            </button>
            {mobileTimelineOpen && (
              <div className="border-t px-2 py-2" style={{ borderColor: '#f3f4f6' }}>
                <NominationTimeline nomination={nomination} messages={timelineMessages} layout="horizontal" />
              </div>
            )}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm lg:h-full lg:min-h-0">
          {chatEl}
        </div>
        <div className="hidden min-h-0 w-full shrink-0 lg:block lg:h-full lg:w-[22%] lg:min-w-[240px] xl:w-[24%] xl:min-w-[280px]">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white p-2 shadow-sm">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <NominationDetailMetaPanels {...nominationMetaPanelProps} />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[70] lg:hidden ${mobileNominationInfoOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileNominationInfoOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${mobileNominationInfoOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileNominationInfoOpen(false)}
          aria-label={t.closeButton}
        />
        <div className={`absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col border-l border-neutral-200 bg-stone-50 shadow-2xl transition-transform duration-300 ease-out ${mobileNominationInfoOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900">{t.nominationInfoBlock}</p>
              <p className="truncate text-[10px] text-neutral-500">#{nomination.id}</p>
            </div>
            <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700" onClick={() => setMobileNominationInfoOpen(false)} aria-label={t.closeButton}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <NominationDetailMetaPanels {...nominationMetaPanelProps} />
          </div>
        </div>
      </div>

      {showCvModal && usedCvFiles.length > 0 && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-2 sm:p-4" style={{ backgroundColor: 'rgba(15,23,42,0.2)' }}>
          <div className="mx-auto flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border bg-white shadow-xl" style={{ borderColor: '#f3f4f6' }}>
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: '#f3f4f6' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>
                  CV ứng tuyển - {usedCvKind === 'original' ? 'CV_original' : `CV_Template / ${usedTemplateName || '—'}`}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                  Mỗi tab là một file trong folder này.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadUsedCvZip}
                  disabled={downloadingUsedCvZip}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: 'white' }}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {downloadingUsedCvZip ? 'Đang nén…' : 'Tải ZIP'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCvModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border"
                  style={{ borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }}
                >
                  Đóng
                </button>
              </div>
            </div>
            <div className="px-4 pt-3 border-b overflow-x-auto" style={{ borderColor: '#f3f4f6' }}>
              <div className="flex gap-2">
                {usedCvFiles.map((file, idx) => {
                  const title = file.name || file.label || `File ${idx + 1}`;
                  const isActive = idx === activeCvTab;
                  return (
                    <button
                      key={`cv-tab-${idx}`}
                      type="button"
                      onClick={() => setActiveCvTab(idx)}
                      className="px-3 py-1.5 text-xs border-b-2 transition-colors"
                      style={{
                        color: isActive ? '#2563eb' : '#6b7280',
                        borderColor: isActive ? '#2563eb' : 'transparent'
                      }}
                    >
                      {title}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4">
              {usedCvFiles[activeCvTab] && (
                <div className="h-full flex flex-col gap-2">
                  <div className="text-xs" style={{ color: '#6b7280' }}>
                    Đang xem:&nbsp;
                    <span className="font-medium" style={{ color: '#111827' }}>
                      {usedCvFiles[activeCvTab].name || usedCvFiles[activeCvTab].label || `File ${activeCvTab + 1}`}
                    </span>
                  </div>
                  <div className="flex-1 border rounded-lg" style={{ borderColor: '#f3f4f6' }}>
                    <iframe
                      title="CV preview"
                      src={usedCvFiles[activeCvTab].viewUrl}
                      className="h-full w-full"
                      style={{ minHeight: 'min(55vh, 480px)', border: 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && showStatusModal && nomination && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ backgroundColor: 'rgba(15,23,42,0.2)' }}>
          <div className="rounded-xl shadow-lg border w-full max-w-md mx-4 p-5 bg-white" style={{ borderColor: '#f3f4f6' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>{t.changeStatusModalTitle}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.newStatusLabel}</label>
                <select
                  value={newStatus ?? nomination.status}
                  onChange={(e) => {
                    setNewStatus(parseInt(e.target.value, 10));
                    setStatusReason('');
                    setStatusModalAttachReason(false);
                    setStatusPaymentAmount('');
                    setStatusInterviewDate('');
                    setStatusInterviewTime('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  {getJobApplicationStatusOptionsByLanguage(language).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-start gap-2 text-sm font-medium" style={{ color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={statusModalAttachReason}
                    onChange={(e) => {
                      const checked = !!e.target.checked;
                      setStatusModalAttachReason(checked);
                      if (!checked) setStatusReason('');
                    }}
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: '#2563eb', flexShrink: 0 }}
                  />
                  <span>{t.reasonNoteOptional || 'Lý do / Ghi chú (tùy chọn)'}</span>
                </label>
                {statusModalAttachReason && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                      Lý do:
                    </label>
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder={t.placeholderReasonStatus || 'Nhập lý do...'}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </div>
                )}
              </div>
              {STATUSES_REQUIRE_INTERVIEW_SCHEDULE.includes(selectedStatusForModal) && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.chatDate || 'Ngày'}</label>
                    <input
                      type="date"
                      value={statusInterviewDate}
                      onChange={(e) => setStatusInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.chatTime || 'Giờ'}</label>
                    <input
                      type="time"
                      value={statusInterviewTime}
                      onChange={(e) => setStatusInterviewTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </div>
                </>
              )}
              {selectedStatusForModal === STATUS_PAID && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                    {t.chatPaymentAmount || t.paymentAmountLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={statusPaymentAmount}
                    onChange={(e) => setStatusPaymentAmount(e.target.value)}
                    placeholder={t.chatPaymentAmountPlaceholder || t.placeholderPaymentAmount}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={{ borderColor: '#e5e7eb' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    {t.chatPaymentRequestCreatedPaid || ''}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                type="button"
                onClick={resetStatusModal}
                className="px-4 py-2 rounded-lg border text-sm font-medium"
                style={{ borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={statusModalSubmitDisabled}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {updatingStatus ? t.updating : t.updateButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NominationDetailContent;
