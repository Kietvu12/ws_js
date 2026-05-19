import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService, { normalizePostImageUrl } from '../../services/api';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, CheckCircle2 } from 'lucide-react';

const formatDateTime = (dateStr, locale = 'vi-VN') => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const posts = useMemo(() => Array.isArray(event?.Posts) ? event.Posts : Array.isArray(event?.posts) ? event.posts : [], [event]);
  const isRegistered = !!(event?.is_registered || event?.isRegistered);

  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [evtRes, meRes] = await Promise.all([
          apiService.getCTVEventById(eventId),
          apiService.getCTVProfile(),
        ]);

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
        setEvent(null);
        setError(e.message || 'Không tải được sự kiện');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || isRegistered) return;
    try {
      setSubmitting(true);
      setToast('');
      const res = await apiService.registerCTVEvent(eventId, form);
      if (res.success) {
        setToast(res.message || 'Đăng ký thành công');
        // reload event to get is_registered true
        const evtRes = await apiService.getCTVEventById(eventId);
        if (evtRes.success) setEvent(evtRes.data?.event || null);
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-500">
        Đang tải...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
        <div className="text-sm font-semibold text-gray-800">Không tìm thấy sự kiện</div>
        {error && <div className="text-xs text-gray-500">{error}</div>}
        <button
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
          onClick={() => navigate('/agent/events')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b bg-white" style={{ borderColor: '#e5e7eb' }}>
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 py-3">
          <button
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold mb-2"
            style={{ color: '#2563eb' }}
            onClick={() => navigate('/agent/events')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Danh sách sự kiện
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">{event.title || 'Sự kiện'}</h1>
          {event.description && (
            <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{event.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
            <div className="inline-flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
              <span>{formatDateTime(event.start_at || event.startAt)} → {formatDateTime(event.end_at || event.endAt)}</span>
            </div>
            {event.location && (
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate max-w-[320px]">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto w-full max-w-5xl p-3 sm:p-4 space-y-3">
        {/* Registration form */}
        <div className="bg-white rounded-xl border p-3 sm:p-4" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Đăng ký tham gia</h2>
              <p className="mt-1 text-xs text-gray-500">
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

          <form onSubmit={submit} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-gray-700">Họ tên</span>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ borderColor: '#e5e7eb' }}
                placeholder="Tên của bạn"
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
                placeholder="email@example.com"
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
                placeholder="09xxxxxxxx"
                disabled={submitting || isRegistered}
              />
            </label>
            <div className="sm:col-span-3 flex items-center justify-between gap-2">
              <div className="text-[11px] text-gray-500">
                {profile?.code ? `Mã CTV: ${profile.code}` : ''}
              </div>
              <button
                type="submit"
                disabled={submitting || isRegistered}
                className="px-4 py-2 rounded-full text-xs font-semibold text-white"
                style={{
                  backgroundColor: (submitting || isRegistered) ? '#9ca3af' : '#2563eb',
                  cursor: (submitting || isRegistered) ? 'not-allowed' : 'pointer',
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

        {/* Related posts */}
        <div className="bg-white rounded-xl border p-3 sm:p-4" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Bài viết liên quan</h2>
            <span className="text-[11px] text-gray-500">{posts.length} bài</span>
          </div>

          {posts.length === 0 ? (
            <div className="mt-3 text-xs text-gray-500">Chưa có bài viết gắn với sự kiện này.</div>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {posts.map((p) => {
                const thumb = normalizePostImageUrl(p.thumbnail || p.image || '');
                return (
                  <div key={p.id} className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: '#e5e7eb' }}>
                    {thumb ? (
                      <div className="h-28 bg-gray-50">
                        <img src={thumb} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-28 bg-gray-50" />
                    )}
                    <div className="p-3">
                      <div className="text-xs font-semibold text-gray-900 line-clamp-2">{p.title}</div>
                      <div className="mt-1 text-[11px] text-gray-500">ID: {p.id}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;

