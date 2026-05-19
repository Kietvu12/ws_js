import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService, { normalizePostImageUrl } from '../../services/api';
import { ArrowLeft, Calendar as CalendarIcon, MapPin } from 'lucide-react';

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
  const [error, setError] = useState('');

  const posts = useMemo(() => Array.isArray(event?.Posts) ? event.Posts : Array.isArray(event?.posts) ? event.posts : [], [event]);
  const participants = useMemo(() => Array.isArray(event?.participants) ? event.participants : [], [event]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiService.getAdminEventById(eventId);
        if (res.success) {
          setEvent(res.data?.event || null);
        } else {
          setEvent(null);
          setError(res.message || 'Không tải được sự kiện');
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
          onClick={() => navigate('/admin/events')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 border-b bg-white" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold mb-2"
              style={{ color: '#2563eb' }}
              onClick={() => navigate('/admin/events')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Danh sách sự kiện
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {event.title || 'Sự kiện'}
            </h1>
            {event.description && (
              <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                {event.description}
              </p>
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

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
              onClick={() => navigate(`/admin/events/${eventId}/edit`)}
            >
              Sửa
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4">
        <div className="space-y-3">
          {/* Participants */}
          <div className="bg-white rounded-xl border p-3 sm:p-4" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Người tham gia</h2>
              <span className="text-[11px] text-gray-500">{participants.length} người</span>
            </div>

            {participants.length === 0 ? (
              <div className="mt-3 text-xs text-gray-500">Chưa có ai đăng ký tham gia sự kiện này.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-[12px]">
                  <thead>
                    <tr className="text-[11px] text-gray-500 border-b" style={{ borderColor: '#f3f4f6' }}>
                      <th className="py-2 pr-3 font-semibold">Họ tên</th>
                      <th className="py-2 pr-3 font-semibold">Email</th>
                      <th className="py-2 pr-3 font-semibold">SĐT</th>
                      <th className="py-2 pr-3 font-semibold">Loại</th>
                      <th className="py-2 pr-0 font-semibold">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const ctv = p?.collaborator || null;
                      const name = ctv?.name || p?.name || '-';
                      const email = ctv?.email || p?.email || '-';
                      const phone = ctv?.phone || p?.phone || '-';
                      const typeLabel = p?.is_internal === false || p?.isInternal === false ? 'Bên ngoài' : 'CTV';
                      const createdAt = p?.created_at || p?.createdAt;
                      return (
                        <tr key={p.id} className="border-b" style={{ borderColor: '#f3f4f6' }}>
                          <td className="py-2 pr-3 font-semibold text-gray-900">{name}</td>
                          <td className="py-2 pr-3 text-gray-700">{email}</td>
                          <td className="py-2 pr-3 text-gray-700">{phone}</td>
                          <td className="py-2 pr-3 text-gray-700">{typeLabel}</td>
                          <td className="py-2 pr-0 text-gray-700">{formatDateTime(createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/admin/posts/${p.id}/edit`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/admin/posts/${p.id}/edit`);
                        }
                      }}
                      className="rounded-xl border overflow-hidden hover:shadow-sm transition-shadow bg-white"
                      style={{ borderColor: '#e5e7eb' }}
                    >
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

