import React, { useEffect, useState } from 'react';
import { Calendar, Loader2, MapPin, Send } from 'lucide-react';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

function formatEventWhen(startAt, endAt, lang) {
  const locale = lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'vi-VN';
  const opts = { dateStyle: 'medium', timeStyle: 'short' };
  try {
    if (startAt && endAt) {
      const a = new Date(startAt);
      const b = new Date(endAt);
      if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
        return `${a.toLocaleString(locale, opts)} — ${b.toLocaleString(locale, opts)}`;
      }
    }
    if (startAt) {
      const a = new Date(startAt);
      if (!Number.isNaN(a.getTime())) return a.toLocaleString(locale, opts);
    }
  } catch {
    /* ignore */
  }
  return '';
}

export default function BlogEventRegistrationSidebar({ event, initialName = '', initialEmail = '' }) {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setName(initialName || '');
    setEmail(initialEmail || '');
  }, [initialName, initialEmail, event?.id]);

  const whenStr = formatEventWhen(event?.startAt, event?.endAt, language);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);
    try {
      const res = await apiService.registerPublicEvent(event.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (res?.code === 'ALREADY_REGISTERED') {
        setMessage({ type: 'ok', text: t.publicBlogEventRegAlready });
      } else if (res?.success) {
        setMessage({ type: 'ok', text: t.publicBlogEventRegSuccess });
        setPhone('');
      } else {
        setMessage({ type: 'err', text: t.publicBlogEventRegError });
      }
    } catch (err) {
      const code = err?.data?.code;
      if (code === 'EVENT_ENDED') {
        setMessage({ type: 'err', text: t.publicBlogEventEnded });
      } else if (code === 'EMAIL_INVALID' || code === 'NAME_REQUIRED') {
        setMessage({ type: 'err', text: t.publicBlogEventRegInvalid });
      } else {
        setMessage({ type: 'err', text: err?.message || t.publicBlogEventRegError });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!event?.id) return null;

  return (
    <aside
      className="lg:sticky lg:top-24 lg:self-start"
      aria-label={t.publicBlogEventRegTitle}
    >
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            {t.publicBlogEventLinkedLabel}
          </p>
          <h2 className="mt-1 text-base font-semibold leading-snug text-neutral-900">{event.title}</h2>
        </div>
        <div className="space-y-2 border-b border-neutral-100 px-4 py-3 text-sm text-neutral-700">
          {whenStr ? (
            <div className="flex gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
              <span>{whenStr}</span>
            </div>
          ) : null}
          {event.location ? (
            <div className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
              <span>{event.location}</span>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="px-4 pb-4 pt-3">
          <p className="mb-3 text-sm font-semibold text-neutral-900">{t.publicBlogEventRegTitle}</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="event-reg-name" className="mb-1 block text-xs font-medium text-neutral-600">
                {t.publicBlogEventRegName}
              </label>
              <input
                id="event-reg-name"
                type="text"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                required
                autoComplete="name"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-neutral-900/10 focus:border-neutral-400 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="event-reg-email" className="mb-1 block text-xs font-medium text-neutral-600">
                {t.publicBlogEventRegEmail}
              </label>
              <input
                id="event-reg-email"
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-neutral-900/10 focus:border-neutral-400 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="event-reg-phone" className="mb-1 block text-xs font-medium text-neutral-600">
                {t.publicBlogEventRegPhone}
              </label>
              <input
                id="event-reg-phone"
                type="tel"
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                autoComplete="tel"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-neutral-900/10 focus:border-neutral-400 focus:ring-2"
              />
            </div>
          </div>

          {message.text ? (
            <p
              className={`mt-3 text-xs ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}
              role="status"
            >
              {message.text}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED212F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d41f2b] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {t.publicBlogEventRegSubmit}
          </button>
        </form>
      </div>
    </aside>
  );
}
