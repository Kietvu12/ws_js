import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, MapPin, CheckCircle2 } from 'lucide-react';
import apiService, { normalizePostImageUrl } from '../../services/api';

const formatDateTime = (dateStr, locale = 'vi-VN') => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/**
 * Chi tiết sự kiện CTV — panel trượt từ phải (dùng trên /agent/events).
 */
const SLIDE_MS = 320;

const AgentEventSlideOver = ({ open, eventId, onClose, onRegistered }) => {
  /** Giữ portal khi đang trượt ra; entered kích hoạt transition từ translate-x-full → 0 */
  const [shouldRender, setShouldRender] = useState(false);
  const [entered, setEntered] = useState(false);

  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const posts = useMemo(
    () =>
      Array.isArray(event?.Posts) ? event.Posts : Array.isArray(event?.posts) ? event.posts : [],
    [event]
  );
  const isRegistered = !!(event?.is_registered || event?.isRegistered);

  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    let cancelled = false;
    let closeTimer;
    if (open) {
      setShouldRender(true);
      setEntered(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setEntered(true);
        });
      });
    } else {
      setEntered(false);
      closeTimer = setTimeout(() => {
        if (!cancelled) setShouldRender(false);
      }, SLIDE_MS);
    }
    return () => {
      cancelled = true;
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !eventId) {
      setEvent(null);
      setError('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [evtRes, meRes] = await Promise.all([
          apiService.getCTVEventById(eventId),
          apiService.getCTVProfile(),
        ]);
        if (cancelled) return;
        if (evtRes.success) {
          setEvent(evtRes.data?.event || null);
        } else {
          setEvent(null);
          setError(evtRes.message || 'Không tải được sự kiện');
        }
        if (meRes.success) {
          const ctv = meRes.data?.collaborator || meRes.data?.user || meRes.data?.ctv || meRes.data || null;
          setProfile(ctv);
          setForm({
            name: ctv?.name || '',
            email: ctv?.email || '',
            phone: ctv?.phone || '',
          });
        }
      } catch (e) {
        if (!cancelled) {
          setEvent(null);
          setError(e.message || 'Không tải được sự kiện');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  useEffect(() => {
    if (!shouldRender) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [shouldRender, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || isRegistered || !eventId) return;
    try {
      setSubmitting(true);
      setToast('');
      const res = await apiService.registerCTVEvent(eventId, form);
      if (res.success) {
        setToast(res.message || 'Đăng ký thành công');
        const evtRes = await apiService.getCTVEventById(eventId);
        if (evtRes.success) setEvent(evtRes.data?.event || null);
        onRegistered?.();
      } else {
        setToast(res.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setToast(err.message || 'Đăng ký thất bại');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const panel = (
    <div
      className="fixed inset-0 z-[100] flex justify-end overflow-x-hidden overflow-y-hidden pointer-events-none"
      aria-hidden={false}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black transition-opacity ease-out pointer-events-auto ${
          entered ? 'opacity-40' : 'opacity-0'
        }`}
        style={{ transitionDuration: `${SLIDE_MS}ms` }}
        onClick={onClose}
        aria-label="Đóng"
      />
      <aside
        className={`relative h-full w-full max-w-lg sm:max-w-xl bg-white shadow-[0_0_40px_rgba(0,0,0,0.12)] flex flex-col border-l rounded-l-2xl sm:rounded-l-3xl pointer-events-auto will-change-transform ease-out ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          borderColor: '#e5e7eb',
          transitionProperty: 'transform',
          transitionDuration: `${SLIDE_MS}ms`,
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <span className="text-xs font-semibold text-gray-800 truncate pr-2">
            {event?.title || 'Sự kiện'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3">
          {loading && (
            <div className="text-xs text-gray-500 py-6 text-center">Đang tải...</div>
          )}
          {!loading && !event && (
            <div className="text-sm text-gray-600 text-center py-6">{error || 'Không tìm thấy sự kiện'}</div>
          )}
          {!loading && event && (
            <>
              {event.description && (
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{event.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                <div className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    {formatDateTime(event.start_at || event.startAt)} → {formatDateTime(event.end_at || event.endAt)}
                  </span>
                </div>
                {event.location && (
                  <div className="inline-flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border p-3" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Đăng ký tham gia</h2>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Thông tin sẽ được tự động điền từ tài khoản CTV đang đăng nhập.
                    </p>
                  </div>
                  {isRegistered && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Đã đăng ký
                    </div>
                  )}
                </div>

                <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-2.5">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-gray-700">Họ tên</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="px-3 py-2 rounded-lg border text-xs outline-none"
                      style={{ borderColor: '#e5e7eb' }}
                      disabled={submitting || isRegistered}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-gray-700">Email</span>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="px-3 py-2 rounded-lg border text-xs outline-none"
                      style={{ borderColor: '#e5e7eb' }}
                      disabled={submitting || isRegistered}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-gray-700">Số điện thoại</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="px-3 py-2 rounded-lg border text-xs outline-none"
                      style={{ borderColor: '#e5e7eb' }}
                      disabled={submitting || isRegistered}
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-gray-500">{profile?.code ? `Mã CTV: ${profile.code}` : ''}</div>
                    <button
                      type="submit"
                      disabled={submitting || isRegistered}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-white"
                      style={{
                        backgroundColor: submitting || isRegistered ? '#9ca3af' : '#2563eb',
                        cursor: submitting || isRegistered ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isRegistered ? 'Đã đăng ký' : submitting ? 'Đang gửi...' : 'Đăng ký'}
                    </button>
                  </div>
                </form>
                {toast && (
                  <div className="mt-3 text-xs font-semibold" style={{ color: '#2563eb' }}>
                    {toast}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border p-3" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Bài viết liên quan</h2>
                  <span className="text-[11px] text-gray-500">{posts.length} bài</span>
                </div>
                {posts.length === 0 ? (
                  <div className="mt-3 text-xs text-gray-500">Chưa có bài viết gắn với sự kiện này.</div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2.5">
                    {posts.map((p) => {
                      const thumb = normalizePostImageUrl(p.thumbnail || p.image || '');
                      return (
                        <div key={p.id} className="rounded-lg border overflow-hidden bg-white" style={{ borderColor: '#e5e7eb' }}>
                          {thumb ? (
                            <div className="h-24 bg-gray-50">
                              <img src={thumb} alt={p.title} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-24 bg-gray-50" />
                          )}
                          <div className="p-2.5">
                            <div className="text-xs font-semibold text-gray-900 line-clamp-2">{p.title}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return shouldRender ? createPortal(panel, document.body) : null;
};

export default AgentEventSlideOver;
