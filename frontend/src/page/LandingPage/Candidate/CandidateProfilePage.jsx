import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useCandidateAuth } from '../../../context/CandidateAuthContext';
import { useNotification } from '../../../context/NotificationContext';
import AddCandidateForm from '../../../component/Shared/AddCandidateForm';
import CandidateDetailPage from '../../../component/Shared/CandidateDetailPage';
import NominationsPageContent from '../../../component/Shared/NominationsPageContent';
import CandidateProfileGuestWizard from './CandidateProfileGuestWizard';
import apiService from '../../../services/api';

const seoMeta = {
  vi: { title: 'Hồ sơ ứng viên | Tạo CV bằng AI | Workstation JobShare', description: 'Quản lý hồ sơ ứng viên, tạo CV chuẩn Nhật bằng AI. Chỉ mất 3 phút với Workstation JobShare.' },
  en: { title: 'Candidate Profile | AI CV Builder | Workstation JobShare', description: 'Manage your candidate profile and create Japan-standard CVs with AI. Only 3 minutes with Workstation JobShare.' },
  ja: { title: '応募者プロフィール | AI履歴書作成 | Workstation JobShare', description: '応募者プロフィールを管理し、AIで日本基準の履歴書を作成。Workstation JobShareならわずか3分。' },
};

const STR = {
  vi: {
    pageTitle: 'Hồ sơ của tôi',
    breadcrumbHome: 'Trang chủ',
    guestHeroBefore: 'Chỉ mất 3 phút để có CV chuẩn Nhật với công nghệ ',
    guestHeroAi: 'AI',
    guestHeroMid: ' của ',
    guestHeroBrand: 'Workstation JobShare',
    guestHeroEnd: '.',
    guestLoginBannerBefore: 'Lưu ý: Hãy ',
    guestLoginLink: 'ĐĂNG NHẬP',
    guestLoginBannerAfter: ' để tạo và tải CV về nhé.',
    guestQHasCv: 'Bạn có CV gốc chưa?',
    guestYes: 'Có',
    guestNo: 'Chưa',
    guestUploadCv: 'Upload CV gốc',
    guestUploadHint: 'Upload lên AI sẽ đọc và bóc tách',
    guestQTemplate: 'Bạn đang muốn tạo CV theo mẫu nào?',
    tplStandard: 'Tiêu chuẩn',
    tplTechnical: 'Nhóm kỹ thuật',
    tplIt: 'Nhóm IT',
    guestStep1: 'Step 1',
    guestStep2: 'Step 2',
    guestStep3: 'Step 3',
    guestStep4: 'Step 4',
    guestStep4Hint: 'Sau khi chọn xong loại thì nó sẽ hiện ra form CV theo loại đó',
    guestGuideAria: 'Hướng dẫn quy trình tạo CV (chỉ xem)',
    emptyProfileLine: 'Bạn chưa có hồ sơ với JobShare? Tạo mới ngay với AI.',
    emptyProfileCta: 'Tạo mới hồ sơ',
    pickTemplateTitle: 'Chọn mẫu CV',
    pickTemplateHint: 'Chọn một mẫu để điền thông tin. Bạn sẽ tạo một hồ sơ theo đúng mẫu đã chọn.',
    pickTemplateBack: 'Quay lại',
    pickTemplatePreview: 'Xem trước mẫu',
    pickTemplateSelect: 'Chọn mẫu này',
    previewModalTitle: 'Xem trước CV (履歴書 + 職務経歴書)',
    previewLoadingLabel: 'Đang tạo bản xem…',
    guestEmptyProfileLine: 'Hãy đăng nhập để tạo và quản lý hồ sơ JobShare với AI.',
    guestLoginNowCta: 'Đăng nhập ngay',
    profileLoading: 'Đang tải…',
    usageGuide: 'Hướng dẫn sử dụng',
    closeGuide: 'Đóng',
    tabProfile: 'Hồ sơ của tôi',
    tabNominations: 'Đơn tiến cử',
  },
  en: {
    pageTitle: 'My profile',
    breadcrumbHome: 'Home',
    guestHeroBefore: 'Only 3 minutes to get a Japan-standard CV with ',
    guestHeroAi: 'AI',
    guestHeroMid: ' from ',
    guestHeroBrand: 'Workstation JobShare',
    guestHeroEnd: '.',
    guestLoginBannerBefore: 'Note: Please ',
    guestLoginLink: 'LOG IN',
    guestLoginBannerAfter: ' to create and download your CV.',
    guestQHasCv: 'Do you already have an original CV file?',
    guestYes: 'Yes',
    guestNo: 'Not yet',
    guestUploadCv: 'Upload original CV',
    guestUploadHint: 'After upload, AI will read and extract your data.',
    guestQTemplate: 'Which CV template do you want to use?',
    tplStandard: 'Standard',
    tplTechnical: 'Technical',
    tplIt: 'IT',
    guestStep1: 'Step 1',
    guestStep2: 'Step 2',
    guestStep3: 'Step 3',
    guestStep4: 'Step 4',
    guestStep4Hint: 'After you pick a type, the matching CV form will appear.',
    guestGuideAria: 'CV creation flow guide (view only)',
    emptyProfileLine: "You don't have a profile on JobShare yet. Create one now with AI.",
    emptyProfileCta: 'Create profile',
    pickTemplateTitle: 'Choose a CV template',
    pickTemplateHint: 'Pick one template to fill in. Your profile will use only that template.',
    pickTemplateBack: 'Back',
    pickTemplatePreview: 'Preview template',
    pickTemplateSelect: 'Use this template',
    previewModalTitle: 'Preview (résumé + work history)',
    previewLoadingLabel: 'Generating preview…',
    guestEmptyProfileLine: 'Sign in to create and manage your JobShare profile with AI.',
    guestLoginNowCta: 'Sign in now',
    profileLoading: 'Loading…',
    usageGuide: 'Usage guide',
    closeGuide: 'Close',
    tabProfile: 'My profile',
    tabNominations: 'Applications',
  },
  ja: {
    pageTitle: 'マイプロフィール',
    breadcrumbHome: 'ホーム',
    guestHeroBefore: 'Workstation JobShare の ',
    guestHeroAi: 'AI',
    guestHeroMid: ' で、最短3分で日本基準の履歴書を作成できます',
    guestHeroBrand: '',
    guestHeroEnd: '。',
    guestLoginBannerBefore: 'ご注意：',
    guestLoginLink: 'ログイン',
    guestLoginBannerAfter: 'してから履歴書の作成・ダウンロードを行ってください。',
    guestQHasCv: '元の履歴書（ファイル）はお持ちですか？',
    guestYes: 'はい',
    guestNo: 'いいえ',
    guestUploadCv: '元の履歴書をアップロード',
    guestUploadHint: 'アップロード後、AIが読み取り・抽出します。',
    guestQTemplate: 'どのテンプレートで作成しますか？',
    tplStandard: '標準',
    tplTechnical: '理系・技術',
    tplIt: 'IT',
    guestStep1: 'Step 1',
    guestStep2: 'Step 2',
    guestStep3: 'Step 3',
    guestStep4: 'Step 4',
    guestStep4Hint: '種類を選ぶと、そのタイプに合った入力フォームが表示されます。',
    guestGuideAria: '履歴書作成の流れ（閲覧のみ）',
    emptyProfileLine: 'JobShare にまだプロフィールがありません。AI で今すぐ作成しましょう。',
    emptyProfileCta: 'プロフィールを作成',
    pickTemplateTitle: '履歴書テンプレートを選ぶ',
    pickTemplateHint: '1つ選んで入力します。選んだテンプレートのみでプロフィールを作成します。',
    pickTemplateBack: '戻る',
    pickTemplatePreview: 'プレビュー',
    pickTemplateSelect: 'このテンプレートを選ぶ',
    previewModalTitle: 'プレビュー（履歴書＋職務経歴書）',
    previewLoadingLabel: 'プレビューを作成中…',
    guestEmptyProfileLine: 'ログインして、AI で JobShare のプロフィールを作成・管理しましょう。',
    guestLoginNowCta: '今すぐログイン',
    profileLoading: '読み込み中…',
    usageGuide: '使い方ガイド',
    closeGuide: '閉じる',
    tabProfile: 'マイプロフィール',
    tabNominations: '推薦状況',
  },
};

/** Giá trị cvTemplate backend / AddCandidateForm — một mẫu cho lần tạo đầu tiên */
const APPLICANT_CREATE_TEMPLATES = [
  {
    id: 'common',
    gradient: 'from-slate-50 to-sky-50',
    border: 'border-sky-200',
    cardHover: 'hover:border-sky-400 hover:ring-2 hover:ring-sky-300/70',
  },
  {
    id: 'cv_technical',
    gradient: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    cardHover: 'hover:border-emerald-400 hover:ring-2 hover:ring-emerald-300/70',
  },
  {
    id: 'cv_it',
    gradient: 'from-violet-50 to-indigo-50',
    border: 'border-violet-200',
    cardHover: 'hover:border-violet-400 hover:ring-2 hover:ring-violet-300/70',
  },
];

/** Dữ liệu tối thiểu cho API preview — tab `all` = 履歴書 + 職務経歴書 trong một bản xem */
const APPLICANT_TEMPLATE_PREVIEW_MIN = {
  nameKanji: '\u3000',
  nameKana: '\u3000',
  email: '',
  phone: '',
  address: '',
  birthDate: '',
  age: '',
  gender: '',
  postalCode: '',
  educations: [],
  workExperiences: [],
  certificates: [],
  careerSummary: '',
  strengths: '',
  motivation: '',
  hobbiesSpecialSkills: '',
  cvDocumentDate: '',
  jlptLevel: '',
  technicalSkills: '',
  currentSalary: '',
  desiredSalary: '',
  desiredLocation: '',
  desiredPosition: '',
  desiredStartDate: '',
};

function TemplatePreviewFigure({ gradient, border }) {
  return (
    <div
      className={`relative mx-auto aspect-[210/297] w-full max-w-[140px] overflow-hidden rounded-md border-2 bg-gradient-to-br shadow-inner sm:max-w-[168px] ${gradient} ${border}`}
      aria-hidden
    >
      <div className="absolute inset-2 rounded-sm bg-white/90 shadow-sm">
        <div className="mx-auto mt-2 h-1.5 w-2/5 rounded-full bg-neutral-200" />
        <div className="mx-2 mt-2 space-y-1">
          <div className="h-0.5 rounded bg-neutral-200" />
          <div className="h-0.5 w-4/5 rounded bg-neutral-200" />
          <div className="h-0.5 w-3/5 rounded bg-neutral-200" />
        </div>
        <div className="mx-2 mt-3 grid grid-cols-2 gap-1">
          <div className="h-6 rounded bg-neutral-100" />
          <div className="h-6 rounded bg-neutral-100" />
        </div>
        <div className="mx-2 mt-2 space-y-1">
          <div className="h-0.5 rounded bg-neutral-200" />
          <div className="h-0.5 rounded bg-neutral-200" />
          <div className="h-0.5 w-5/6 rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

export default function CandidateProfilePage() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const t = STR[language] || STR.vi;
  const { applicant, isAuthenticated } = useCandidateAuth();

  const [cvCheckLoading, setCvCheckLoading] = useState(true);
  const [hasApplicantCv, setHasApplicantCv] = useState(false);
  /** CV id mới nhất (ứng viên thường chỉ một) — dùng cho tab hồ sơ */
  const [myCvId, setMyCvId] = useState(null);
  const [profileTab, setProfileTab] = useState('profile');
  const [editProfile, setEditProfile] = useState(false);
  /** Khi sửa hồ sơ: chọn mẫu trước rồi mới mở form (giống tạo mới) — null khi không vào flow sửa */
  const [applicantEditStep, setApplicantEditStep] = useState(null);
  /** idle → chọn mẫu → form tạo (khóa 1 template) */
  const [creationStep, setCreationStep] = useState('idle');
  const [selectedApplicantTemplate, setSelectedApplicantTemplate] = useState(null);
  const [usageGuideOpen, setUsageGuideOpen] = useState(false);

  const notify = useNotification();
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [templatePreviewLoading, setTemplatePreviewLoading] = useState(false);
  const [templatePreviewPdfUrl, setTemplatePreviewPdfUrl] = useState(null);
  const [templatePreviewHtml, setTemplatePreviewHtml] = useState('');
  const templatePreviewPdfBlobRef = useRef(null);

  const closeTemplatePreviewModal = useCallback(() => {
    setTemplatePreviewOpen(false);
    setTemplatePreviewHtml('');
    setTemplatePreviewPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    templatePreviewPdfBlobRef.current = null;
  }, []);

  const openTemplatePreview = useCallback(
    async (templateId) => {
      try {
        setTemplatePreviewLoading(true);
        setTemplatePreviewOpen(true);
        setTemplatePreviewPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setTemplatePreviewHtml('');
        templatePreviewPdfBlobRef.current = null;

        const payload = {
          ...APPLICANT_TEMPLATE_PREVIEW_MIN,
          cvTemplate: templateId,
          tab: 'all',
        };

        const pdfRes = await apiService.previewApplicantCVTemplatePdf(payload);
        if (pdfRes.ok && pdfRes.blob && pdfRes.blob.size > 0) {
          templatePreviewPdfBlobRef.current = pdfRes.blob;
          setTemplatePreviewPdfUrl(URL.createObjectURL(pdfRes.blob));
          return;
        }

        const htmlRes = await apiService.previewApplicantCVTemplate(payload);
        if (!htmlRes.ok) {
          notify.error(
            htmlRes.status === 401 || htmlRes.status === 403
              ? 'Phiên đăng nhập hết hạn hoặc không có quyền xem trước.'
              : `Xem trước thất bại (HTTP ${htmlRes.status}).`
          );
          closeTemplatePreviewModal();
          return;
        }
        setTemplatePreviewHtml(htmlRes.html || '');
        notify.warning(
          pdfRes.message ||
            'Không tạo được PDF (cần Chrome/Chromium trên server). Đang hiển thị bản HTML.'
        );
      } catch (e) {
        console.error(e);
        notify.error('Có lỗi khi tạo bản xem trước CV.');
        closeTemplatePreviewModal();
      } finally {
        setTemplatePreviewLoading(false);
      }
    },
    [notify, closeTemplatePreviewModal]
  );

  useEffect(() => {
    if (!isAuthenticated || !applicant) {
      setCvCheckLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setCvCheckLoading(true);
      try {
        const res = await apiService.getApplicantMyCVs();
        const cvs = res?.data?.cvs || [];
        if (cancelled) return;
        const ok = Array.isArray(cvs) && cvs.length > 0;
        setHasApplicantCv(ok);
        if (ok) {
          const sorted = [...cvs].sort((a, b) => Number(b.id) - Number(a.id));
          setMyCvId(sorted[0]?.id ?? null);
        } else {
          setMyCvId(null);
        }
      } catch {
        if (!cancelled) {
          setHasApplicantCv(false);
          setMyCvId(null);
        }
      } finally {
        if (!cancelled) setCvCheckLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applicant]);

  useEffect(() => {
    if (!usageGuideOpen && !templatePreviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [usageGuideOpen, templatePreviewOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (templatePreviewOpen) closeTemplatePreviewModal();
      else if (usageGuideOpen) setUsageGuideOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [usageGuideOpen, templatePreviewOpen, closeTemplatePreviewModal]);

  const refreshApplicantCvSummary = useCallback(async () => {
    try {
      const res = await apiService.getApplicantMyCVs();
      const cvs = res?.data?.cvs || [];
      const ok = Array.isArray(cvs) && cvs.length > 0;
      setHasApplicantCv(ok);
      if (ok) {
        const sorted = [...cvs].sort((a, b) => Number(b.id) - Number(a.id));
        setMyCvId(sorted[0]?.id ?? null);
      } else {
        setMyCvId(null);
      }
    } catch {
      setHasApplicantCv(false);
      setMyCvId(null);
    }
  }, []);

  const prefix = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';
  const profilePath = `${prefix}/profile`;
  const loginPath = `${prefix}/login`;

  const shellClass =
    'mx-auto w-full max-w-[1400px] px-4 sm:px-6';

  const seo = seoMeta[language] || seoMeta.vi;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white text-[#1a1a1a]">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href="https://ws-jobshare.com/landing/candidate/profile" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content="https://ws-jobshare.com/landing/candidate/profile" />
      </Helmet>
      <nav className="w-full shrink-0 pt-3 pb-2 md:pt-4" aria-label="Breadcrumb">
        <div className={`${shellClass} flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}>
          <ol className="flex min-w-0 flex-wrap items-center justify-start gap-1.5 text-xs text-neutral-600 sm:text-sm">
            <li>
              <Link
                to={prefix}
                className="font-medium text-neutral-500 transition-colors hover:text-[#ED212F]"
              >
                {t.breadcrumbHome}
              </Link>
            </li>
            <li className="text-neutral-400" aria-hidden>
              /
            </li>
            <li className="font-semibold text-neutral-900" aria-current="page">
              {t.pageTitle}
            </li>
          </ol>
          {isAuthenticated && applicant ? (
            <button
              type="button"
              onClick={() => setUsageGuideOpen(true)}
              className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition-colors hover:border-[#ED212F] hover:text-[#ED212F] sm:text-sm"
              aria-expanded={usageGuideOpen}
              aria-controls="candidate-profile-usage-guide-panel"
            >
              {t.usageGuide}
            </button>
          ) : null}
        </div>
      </nav>

      <div className="flex-1 py-8 md:py-12">
        <div className={shellClass}>
          {!isAuthenticated || !applicant ? (
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <img
                src="/assets/freepik__talk__11437-Picsart-BackgroundRemover.png"
                alt=""
                className="mx-auto mb-8 w-44 max-w-full select-none sm:w-52"
                width={208}
                height={208}
                decoding="async"
              />
              <p className="text-base font-medium leading-relaxed text-neutral-800 sm:text-lg">
                {t.guestEmptyProfileLine}
              </p>
              <Link
                to={loginPath}
                state={{ from: profilePath }}
                className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#ED212F] px-8 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c91828] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ED212F] focus-visible:ring-offset-2"
              >
                {t.guestLoginNowCta}
              </Link>
            </div>
          ) : cvCheckLoading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-neutral-600">
              <div
                className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-[#ED212F]"
                aria-hidden
              />
              <p>{t.profileLoading}</p>
            </div>
          ) : hasApplicantCv ? (
            editProfile ? (
              applicantEditStep === 'pickTemplate' ? (
                <div className="mx-auto w-full max-w-3xl">
                  <h2 className="text-center text-lg font-semibold text-neutral-900 sm:text-xl">
                    {t.pickTemplateTitle}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-center text-sm text-neutral-600 sm:text-base">
                    {t.pickTemplateHint}
                  </p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {APPLICANT_CREATE_TEMPLATES.map((item) => {
                      const label =
                        item.id === 'common'
                          ? t.tplStandard
                          : item.id === 'cv_technical'
                            ? t.tplTechnical
                            : t.tplIt;
                      return (
                        <div
                          key={`edit-${item.id}`}
                          className={`flex flex-col items-center rounded-2xl border-2 bg-white p-4 text-center shadow-sm transition-all hover:shadow-md ${item.border} ${item.cardHover}`}
                        >
                          <TemplatePreviewFigure gradient={item.gradient} border={item.border} />
                          <span className="mt-4 text-sm font-semibold text-neutral-900 sm:text-base">{label}</span>
                          <button
                            type="button"
                            onClick={() => openTemplatePreview(item.id)}
                            className="mt-3 inline-flex w-full max-w-[200px] items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition-colors hover:border-[#ED212F] hover:text-[#ED212F] sm:text-sm"
                          >
                            <Eye className="h-4 w-4 shrink-0" aria-hidden />
                            {t.pickTemplatePreview}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApplicantTemplate(item.id);
                              setApplicantEditStep('form');
                            }}
                            className="mt-2 inline-flex w-full max-w-[200px] items-center justify-center rounded-lg bg-[#ED212F] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#c91828] sm:text-sm"
                          >
                            {t.pickTemplateSelect}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEditProfile(false);
                        setApplicantEditStep(null);
                      }}
                      className="text-sm font-medium text-neutral-600 underline-offset-4 transition-colors hover:text-[#ED212F] hover:underline"
                    >
                      {t.pickTemplateBack}
                    </button>
                  </div>
                </div>
              ) : (
                <AddCandidateForm
                  key={`applicant-edit-${myCvId}-${selectedApplicantTemplate || 'cv'}`}
                  isApplicantProfile
                  candidateId={myCvId}
                  applicantLockedCvTemplate={selectedApplicantTemplate}
                  onCancel={() => {
                    setEditProfile(false);
                    setApplicantEditStep(null);
                  }}
                  onSuccess={async () => {
                    setEditProfile(false);
                    setApplicantEditStep(null);
                    await refreshApplicantCvSummary();
                  }}
                />
              )
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex gap-1 border-b border-neutral-200" role="tablist" aria-label={t.pageTitle}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={profileTab === 'profile'}
                    onClick={() => setProfileTab('profile')}
                    className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
                      profileTab === 'profile'
                        ? 'text-[#ED212F] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#ED212F]'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {t.tabProfile}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={profileTab === 'nominations'}
                    onClick={() => setProfileTab('nominations')}
                    className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
                      profileTab === 'nominations'
                        ? 'text-[#ED212F] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#ED212F]'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {t.tabNominations}
                  </button>
                </div>
                {profileTab === 'profile' &&
                  (myCvId ? (
                    <CandidateDetailPage
                      variant="applicant"
                      embeddedCandidateId={String(myCvId)}
                      embeddedPrefix={prefix}
                      onEditProfile={() => {
                        setEditProfile(true);
                        setApplicantEditStep('pickTemplate');
                        setSelectedApplicantTemplate(null);
                      }}
                    />
                  ) : (
                    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-neutral-600">
                      <div
                        className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-[#ED212F]"
                        aria-hidden
                      />
                      <p>{t.profileLoading}</p>
                    </div>
                  ))}
                {profileTab === 'nominations' && (
                  <div className="min-h-[min(70vh,720px)] rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
                    <NominationsPageContent variant="applicant" embeddedPrefix={prefix} />
                  </div>
                )}
              </div>
            )
          ) : creationStep === 'idle' ? (
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <img
                src="/assets/freepik__talk__11437-Picsart-BackgroundRemover.png"
                alt=""
                className="mx-auto mb-8 w-44 max-w-full select-none sm:w-52"
                width={208}
                height={208}
                decoding="async"
              />
              <p className="text-base font-medium leading-relaxed text-neutral-800 sm:text-lg">
                {t.emptyProfileLine}
              </p>
              <button
                type="button"
                onClick={() => setCreationStep('pickTemplate')}
                className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#ED212F] px-8 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c91828] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ED212F] focus-visible:ring-offset-2"
              >
                {t.emptyProfileCta}
              </button>
            </div>
          ) : creationStep === 'pickTemplate' ? (
            <div className="mx-auto w-full max-w-3xl">
              <h2 className="text-center text-lg font-semibold text-neutral-900 sm:text-xl">
                {t.pickTemplateTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-center text-sm text-neutral-600 sm:text-base">
                {t.pickTemplateHint}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {APPLICANT_CREATE_TEMPLATES.map((item) => {
                  const label =
                    item.id === 'common'
                      ? t.tplStandard
                      : item.id === 'cv_technical'
                        ? t.tplTechnical
                        : t.tplIt;
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col items-center rounded-2xl border-2 bg-white p-4 text-center shadow-sm transition-all hover:shadow-md ${item.border} ${item.cardHover}`}
                    >
                      <TemplatePreviewFigure gradient={item.gradient} border={item.border} />
                      <span className="mt-4 text-sm font-semibold text-neutral-900 sm:text-base">{label}</span>
                      <button
                        type="button"
                        onClick={() => openTemplatePreview(item.id)}
                        className="mt-3 inline-flex w-full max-w-[200px] items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition-colors hover:border-[#ED212F] hover:text-[#ED212F] sm:text-sm"
                      >
                        <Eye className="h-4 w-4 shrink-0" aria-hidden />
                        {t.pickTemplatePreview}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApplicantTemplate(item.id);
                          setCreationStep('form');
                        }}
                        className="mt-2 inline-flex w-full max-w-[200px] items-center justify-center rounded-lg bg-[#ED212F] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#c91828] sm:text-sm"
                      >
                        {t.pickTemplateSelect}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setCreationStep('idle');
                    setSelectedApplicantTemplate(null);
                  }}
                  className="text-sm font-medium text-neutral-600 underline-offset-4 transition-colors hover:text-[#ED212F] hover:underline"
                >
                  {t.pickTemplateBack}
                </button>
              </div>
            </div>
          ) : (
            <AddCandidateForm
              key={selectedApplicantTemplate || 'create'}
              isApplicantProfile
              applicantLockedCvTemplate={selectedApplicantTemplate}
              onSuccess={async () => {
                setHasApplicantCv(true);
                await refreshApplicantCvSummary();
              }}
            />
          )}
        </div>
      </div>

      {/* Preview mẫu CV: tab=all → 履歴書 + 職務経歴書 (cùng API như form) */}
      {templatePreviewOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={closeTemplatePreviewModal}
          role="presentation"
        >
          <div
            className="relative flex max-h-[95vh] w-full max-w-[960px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-template-preview-title"
          >
            <div
              className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
              style={{ borderColor: '#e5e7eb' }}
            >
              <span
                id="candidate-template-preview-title"
                className="truncate text-sm font-semibold text-neutral-900 sm:text-base"
              >
                {t.previewModalTitle}
              </span>
              <button
                type="button"
                onClick={closeTemplatePreviewModal}
                className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                aria-label={t.closeGuide}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {templatePreviewLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-16">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-[#ED212F] border-t-transparent"
                  aria-hidden
                />
                <p className="text-sm text-neutral-600">{t.previewLoadingLabel}</p>
              </div>
            ) : (
              <iframe
                key={templatePreviewPdfUrl || 'html'}
                title={t.previewModalTitle}
                src={templatePreviewPdfUrl || undefined}
                srcDoc={templatePreviewPdfUrl ? undefined : templatePreviewHtml}
                className="min-h-[75vh] w-full flex-1 border-0 bg-white"
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Slide-in panel: cùng nội dung hướng dẫn như khi chưa đăng nhập */}
      <div
        className={`fixed inset-0 z-[100] flex justify-end transition-[visibility] duration-300 ${
          usageGuideOpen ? 'visible' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!usageGuideOpen}
      >
        <button
          type="button"
          tabIndex={usageGuideOpen ? 0 : -1}
          className={`absolute inset-0 bg-neutral-900/40 transition-opacity duration-300 ${
            usageGuideOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label={t.closeGuide}
          onClick={() => setUsageGuideOpen(false)}
        />
        <aside
          id="candidate-profile-usage-guide-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="candidate-profile-usage-guide-title"
          className={`relative flex h-full w-full max-w-lg flex-col bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out sm:max-w-xl ${
            usageGuideOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5">
            <h2
              id="candidate-profile-usage-guide-title"
              className="text-sm font-semibold text-neutral-900 sm:text-base"
            >
              {t.usageGuide}
            </h2>
            <button
              type="button"
              onClick={() => setUsageGuideOpen(false)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              aria-label={t.closeGuide}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <CandidateProfileGuestWizard copy={t} prefix={prefix} />
          </div>
        </aside>
      </div>
    </div>
  );
}
