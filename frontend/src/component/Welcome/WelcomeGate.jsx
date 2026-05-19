import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo.png';

const WELCOME_KEY = 'welcomeShown_v1';

const i18n = {
  vi: {
    question: 'Bạn là ai?',
    ctv: 'Cộng tác viên',
    applicant: 'Ứng viên',
  },
  en: {
    question: 'Who are you?',
    ctv: 'Collaborator',
    applicant: 'Applicant',
  },
  ja: {
    question: 'あなたはどちらですか？',
    ctv: '協力者',
    applicant: '応募者',
  },
};

export default function WelcomeGate() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const langKey = useMemo(() => (i18n[language] ? language : 'vi'), [language]);

  const t = i18n[langKey];

  const [stage, setStage] = useState(0); // 0: zoom logo, 1: slide + show JobShare, 2: ready popup
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Requirements:
    // 1) Show logo first for ~1s, zoom in.
    // 2) Then slide logo to the right + show JobShare.
    // 3) After ~1s, show popup.
    const t1 = setTimeout(() => setStage(1), 1000);
    // Popup should appear 2s after stage 1 (logo slides + JobShare shown).
    const t2 = setTimeout(() => {
      setStage(2);
      setShowPopup(true);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = prev;
    };
  }, []);

  const chooseRole = (role) => {
    localStorage.setItem(WELCOME_KEY, '1');
    localStorage.setItem('welcomeRole', role);
    if (role === 'ctv') {
      // Navigate to same path (`/`) can be ignored by the router if location
      // doesn't change; forcing a query param ensures RootRoute re-renders.
      navigate('/?role=ctv', { replace: true });
    } else {
      navigate('/applicant', { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-white">
      <style>{`
        @keyframes welcome-zoom-in {
          0% { transform: scale(1); }
          100% { transform: scale(1.35); }
        }
      `}</style>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <div
          className="w-full transition-all duration-700 ease-out max-w-[720px]"
          style={{
            opacity: showPopup ? 0 : 1,
            transition: 'opacity 250ms ease-out',
          }}
        >
          <div
            className={`flex items-center transition-all duration-700 ease-out ${
              stage === 0 ? 'justify-center' : 'justify-between'
            }`}
          >
            <div
              className="text-left font-extrabold text-3xl md:text-4xl text-[#ED212F] overflow-hidden"
              style={{
                maxWidth: stage === 0 ? 0 : 420,
                opacity: stage === 0 ? 0 : 1,
                transform: stage === 0 ? 'translateX(-24px)' : 'translateX(0)',
                transition: 'max-width 700ms ease-out, opacity 500ms ease-out, transform 700ms ease-out',
              }}
              aria-hidden={stage === 0}
            >
              JobShare
            </div>

            <img
              src={logoImg}
              alt="JobShare"
              className="h-[120px] w-auto transition-all duration-700 ease-out opacity-100"
              style={{
                transform: stage === 0 ? 'scale(1)' : 'scale(1.35)',
                animation: stage === 0 ? 'welcome-zoom-in 1s ease-out forwards' : undefined,
              }}
            />
          </div>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-[3200] bg-white flex items-center justify-center px-6">
          <div className="w-full max-w-[460px]">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xl overflow-hidden">
              <div className="p-5 md:p-6">
                <div className="text-center text-[#111827] font-extrabold text-xl md:text-2xl mb-4">
                  {t.question}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => chooseRole('ctv')}
                    className="w-full rounded-xl border border-[#ED212F] bg-white px-4 py-3 text-[#ED212F] font-bold text-left transition-colors hover:bg-[#FFF5F5]"
                  >
                    {t.ctv}
                  </button>

                  <button
                    type="button"
                    onClick={() => chooseRole('applicant')}
                    className="w-full rounded-xl border border-[#1848a0] bg-white px-4 py-3 text-[#1848a0] font-bold text-left transition-colors hover:bg-[#F5FAFF]"
                  >
                    {t.applicant}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
