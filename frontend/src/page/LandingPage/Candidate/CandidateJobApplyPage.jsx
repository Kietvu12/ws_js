import React, { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import NominationPageContent from '../../../component/Shared/NominationPageContent';
import { useCandidateAuth } from '../../../context/CandidateAuthContext';
import { useLanguage } from '../../../context/LanguageContext';

const seoMeta = {
  vi: { title: 'Ứng tuyển việc làm | Workstation JobShare', description: 'Ứng tuyển việc làm kỹ sư tại Nhật Bản qua nền tảng Workstation JobShare.' },
  en: { title: 'Apply for Jobs | Workstation JobShare', description: 'Apply for engineering jobs in Japan through Workstation JobShare platform.' },
  ja: { title: '求人に応募 | Workstation JobShare', description: 'Workstation JobShareプラットフォームで日本のエンジニア求人に応募しましょう。' },
};

/**
 * Trang chọn hồ sơ để ứng tuyển (ứng viên đã đăng nhập).
 * UI dùng chung NominationPageContent variant applicant.
 */
export default function CandidateJobApplyPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useCandidateAuth();
  const { language } = useLanguage();

  const prefix = useMemo(
    () => (pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate'),
    [pathname]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`${prefix}/login`, { state: { from: pathname }, replace: true });
    }
  }, [isAuthenticated, navigate, pathname, prefix]);

  const seo = seoMeta[language] || seoMeta.vi;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <NominationPageContent variant="applicant" />
    </>
  );
}
