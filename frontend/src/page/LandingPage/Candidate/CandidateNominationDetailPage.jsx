import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import NominationDetailContent from '../../../component/Shared/NominationDetailContent';
import { useLanguage } from '../../../context/LanguageContext';

const seoMeta = {
  vi: { title: 'Chi tiết ứng tuyển | Workstation JobShare' },
  en: { title: 'Application Detail | Workstation JobShare' },
  ja: { title: '応募詳細 | Workstation JobShare' },
};

export default function CandidateNominationDetailPage() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const seo = seoMeta[language] || seoMeta.vi;
  const prefix = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';
  return (
    <div className="mx-auto flex h-[calc(100dvh-72px)] min-h-[520px] w-full max-w-[1600px] flex-col px-3 py-4 sm:px-6">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <NominationDetailContent variant="applicant" embeddedBasePath={prefix} />
    </div>
  );
}
