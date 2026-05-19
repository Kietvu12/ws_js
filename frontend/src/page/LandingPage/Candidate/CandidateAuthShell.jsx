import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';

const COPY = {
  vi: {
    marketingTitle: 'Nhanh chóng, hiệu quả và tiện lợi',
    marketingBody:
      'JobShare giúp bạn tiếp cận hàng trăm cơ hội việc làm tại Nhật Bản, quản lý hồ sơ và theo dõi ứng tuyển tập trung trên một nền tảng.',
    terms: 'Điều khoản',
    plans: 'Gói dịch vụ',
    contact: 'Liên hệ',
  },
  en: {
    marketingTitle: 'Fast, efficient and productive',
    marketingBody:
      'JobShare helps you discover hundreds of opportunities in Japan, manage your profile, and track applications in one place.',
    terms: 'Terms',
    plans: 'Plans',
    contact: 'Contact us',
  },
  ja: {
    marketingTitle: '迅速・効率的・使いやすい',
    marketingBody:
      'JobShare は日本の求人情報の発見、プロフィール管理、応募状況の一元管理をサポートします。',
    terms: '利用規約',
    plans: 'プラン',
    contact: 'お問い合わせ',
  },
};

/**
 * Khung 2 cột: trái giới thiệu, phải form — theo phong cách thẻ trắng bo góc trên nền gradient.
 */
export default function CandidateAuthShell({ formTitle, formSubtitle, children }) {
  const { pathname } = useLocation();
  const prefix = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';
  const { language } = useLanguage();
  const t = COPY[language] || COPY.vi;

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100 px-3 py-8 sm:px-4 sm:py-10 md:px-6">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/60 md:grid md:min-h-[520px] md:grid-cols-2">
          <div className="flex flex-col justify-between gap-8 border-b border-slate-100 p-8 sm:p-10 md:border-b-0 md:border-r md:border-slate-100">
            <div>
              <Link
                to={prefix}
                className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <span aria-hidden>←</span> JobShare
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t.marketingTitle}</h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">{t.marketingBody}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium sm:text-sm">
              <a href="#" className="text-blue-600 hover:text-blue-800">
                {t.terms}
              </a>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <a href="#" className="text-blue-600 hover:text-blue-800">
                {t.plans}
              </a>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <a href="#" className="text-blue-600 hover:text-blue-800">
                {t.contact}
              </a>
            </div>
          </div>

          <div className="flex flex-col bg-slate-50/90 p-8 sm:p-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{formTitle}</h2>
              {formSubtitle ? <p className="mt-1 text-sm text-slate-500">{formSubtitle}</p> : null}
            </div>
            <div className="flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
