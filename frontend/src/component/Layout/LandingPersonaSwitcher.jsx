import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { hrefForLandingPersona } from '../../utils/landingPersonaSwitch';

const I18N = {
  vi: {
    viewAs: 'Xem với tư cách',
    collaborator: 'Cộng tác viên',
    candidate: 'Ứng viên',
  },
  en: {
    viewAs: 'View as',
    collaborator: 'Collaborator',
    candidate: 'Candidate',
  },
  ja: {
    viewAs: '表示',
    collaborator: 'コラボレーター',
    candidate: '応募者',
  },
};

/**
 * @param {{ variant: 'collaborator' | 'candidate' }} props
 */
export default function LandingPersonaSwitcher({ variant }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = I18N[language] || I18N.vi;

  const hrefCtv = hrefForLandingPersona(pathname, 'collaborator');
  const hrefCandidate = hrefForLandingPersona(pathname, 'candidate');

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const isCtv = variant === 'collaborator';
  const labelClass = isCtv ? 'text-neutral-500' : 'text-neutral-500';
  const triggerTextClass = isCtv ? 'text-neutral-900' : 'text-neutral-900';
  const triggerChevronClass = isCtv ? 'text-neutral-600' : 'text-neutral-600';

  const labelFor = (roleId) => (roleId === 'collaborator' ? t.collaborator : t.candidate);

  const pick = (roleId) => {
    setOpen(false);
    navigate(roleId === 'collaborator' ? hrefCtv : hrefCandidate);
  };

  return (
    <div ref={rootRef} className="relative inline-flex h-8 flex-shrink-0 items-end">
      <span className={`absolute left-0 -top-3 whitespace-nowrap text-[10px] leading-none ${labelClass}`}>{t.viewAs}</span>

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.viewAs}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-8 min-w-[8.5rem] max-w-[11rem] items-center justify-between gap-1 rounded-md border border-neutral-200 bg-white px-2 text-left text-xs font-medium leading-none ${triggerTextClass} shadow-sm focus:outline-none`}
      >
        <span className="truncate leading-none">{labelFor(variant)}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${triggerChevronClass}`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-[60] mt-1 min-w-[10.5rem] rounded-md border border-neutral-300 bg-white py-1 shadow-lg"
        >
          {['collaborator', 'candidate'].map((id) => (
            <li key={id} role="option" aria-selected={variant === id}>
              <button
                type="button"
                onClick={() => pick(id)}
                className={`w-full px-3 py-2 text-left text-xs text-neutral-900 hover:bg-neutral-50 ${
                  variant === id ? 'bg-neutral-50 font-semibold' : 'font-medium'
                }`}
              >
                {labelFor(id)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
