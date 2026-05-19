import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LEGAL_TABS, getSectionsForTab } from '../../data/legalPoliciesContent';

/**
 * Slide-in panel từ bên phải: chính sách (tab) hoặc chỉ bảo vệ dữ liệu.
 * @param {{ open: boolean; onClose: () => void; mode?: 'threeTabs' | 'privacyOnly'; initialTab?: 'privacy' | 'commission' | 'terms' }} props
 */
export default function LegalPoliciesSlidePanel({
  open,
  onClose,
  mode = 'threeTabs',
  initialTab = 'privacy',
}) {
  const { language } = useLanguage();
  const lang = language === 'en' || language === 'ja' ? language : 'vi';

  const [activeTab, setActiveTab] = useState(initialTab);
  /** Kích hoạt transition slide sau khi mount (không phụ thuộc tailwind-animate). */
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(mode === 'privacyOnly' ? 'privacy' : initialTab);
    setSlideIn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSlideIn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [open, mode, initialTab]);

  useEffect(() => {
    if (open && mode === 'threeTabs') setActiveTab(initialTab);
  }, [initialTab, open, mode]);

  const tabKeys = mode === 'privacyOnly' ? ['privacy'] : ['privacy', 'commission', 'terms'];

  const panelTitle = () => {
    if (mode === 'privacyOnly') {
      return lang === 'en'
        ? LEGAL_TABS.privacy.titleEn
        : lang === 'ja'
          ? LEGAL_TABS.privacy.titleJa
          : LEGAL_TABS.privacy.titleVi;
    }
    return lang === 'en'
      ? 'Policies & terms'
      : lang === 'ja'
        ? 'ポリシー・規約'
        : 'Chính sách & điều khoản';
  };

  const labelFor = (key) => {
    const t = LEGAL_TABS[key];
    if (!t) return key;
    return lang === 'en' ? t.labelEn : lang === 'ja' ? t.labelJa : t.labelVi;
  };

  const docTitleFor = (key) => {
    const t = LEGAL_TABS[key];
    if (!t) return '';
    return lang === 'en' ? t.titleEn : lang === 'ja' ? t.titleJa : t.titleVi;
  };

  if (!open) return null;

  const sections = getSectionsForTab(activeTab, lang);

  /** Portal + pointer-events-auto: tránh bị tổ tiên `pointer-events-none` (chatbot) chặn click. */
  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[200] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-panel-title"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${slideIn ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className={`relative z-[1] flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:max-w-xl ${
          slideIn ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3">
          <h2 id="legal-panel-title" className="text-base font-bold text-neutral-900">
            {panelTitle()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {mode === 'threeTabs' && (
          <div className="flex shrink-0 border-b border-neutral-200 bg-neutral-50 px-2">
            {tabKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`min-w-0 flex-1 border-b-2 py-2.5 text-center text-xs font-semibold transition sm:text-sm ${
                  activeTab === key
                    ? 'border-[#ED212F] text-[#ED212F]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {labelFor(key)}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <h3 className="mb-4 text-sm font-bold text-neutral-900 sm:text-base">{docTitleFor(activeTab)}</h3>
          <div className="space-y-5 text-sm leading-relaxed text-neutral-700">
            {sections.map((sec, i) => (
              <section key={`${activeTab}-${i}`}>
                <h4 className="mb-2 font-semibold text-neutral-900">{sec.heading}</h4>
                {sec.paragraphs.map((p, j) => (
                  <p key={j} className="mb-2 last:mb-0">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {lang === 'en' ? 'Close' : lang === 'ja' ? '閉じる' : 'Đóng'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
