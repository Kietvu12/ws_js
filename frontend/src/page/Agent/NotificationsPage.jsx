import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';
import { Search, ChevronDown } from 'lucide-react';
import { localizeNotification } from '../../utils/notificationI18n';

function normalizeNotificationUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Backend stream uses /ctv/job-applications/:id (chat domain)
  // Frontend agent route uses /agent/nominations/:id (nomination detail)
  const m = trimmed.match(/^\/ctv\/job-applications\/(\d+)\b/);
  if (m) return `/agent/nominations/${m[1]}`;

  return trimmed;
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { info } = useNotification();
  const { language } = useLanguage();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [hoveredResetButton, setHoveredResetButton] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [listRes, unreadRes] = await Promise.all([
        apiService.getCTVNotifications({ page: 1, limit: 50, sortBy: 'created_at', sortOrder: 'DESC' }),
        apiService.getCTVNotificationUnreadCount()
      ]);

      const items = listRes?.data?.notifications || [];
      setNotifications(items);
      setUnreadCount(unreadRes || 0);
    } catch (err) {
      console.error('[NotificationsPage] loadAll error:', err);
    } finally {
      setLoading(false);
    }
  };

  const patchLocalOnIncoming = (payload) => {
    // payload shape = { id,title,content,jobId,url,isRead,createdAt }
    setNotifications((prev) => {
      if (!prev || !Array.isArray(prev)) return [payload];
      // Avoid duplicate insert
      const exists = prev.some((n) => String(n.id) === String(payload.id));
      if (exists) {
        return prev.map((n) => (String(n.id) === String(payload.id) ? { ...n, ...payload } : n));
      }
      return [payload, ...(prev || [])];
    });
    setUnreadCount((c) => (typeof c === 'number' ? c + 1 : 1));
  };

  useEffect(() => {
    loadAll();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const getNotificationTs = (n) => n?.createdAt || n?.created_at || null;

  const filteredNotifications = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const hasQ = q.length > 0;

    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return (notifications || []).filter((n) => {
      if (!n) return false;
      const ts = getNotificationTs(n);
      const dt = ts ? new Date(ts) : null;

      if (fromDate && (!dt || Number.isNaN(dt.getTime()) || dt.getTime() < fromDate.getTime())) {
        return false;
      }
      if (toDate && (!dt || Number.isNaN(dt.getTime()) || dt.getTime() > toDate.getTime())) {
        return false;
      }

      if (hasQ) {
        const localized = localizeNotification(n, language);
        const hay = `${localized.title || ''} ${localized.content || ''} ${n.title || ''} ${n.content || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, searchQuery, dateFrom, dateTo, language]);

  // Realtime: đọc SSE-like stream bằng fetch để truyền Authorization header.
  useEffect(() => {
    const start = async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      let response = null;
      try {
        response = await apiService.streamCTVNotifications();
      } catch (err) {
        return;
      }

      if (!response || !response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processEventBlock = (block) => {
        // block like:
        // event: notification
        // data: {...}
        const lines = block.split('\n').map((l) => l.trimEnd());
        let eventName = null;
        let dataStr = null;
        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim();
          if (line.startsWith('data:')) dataStr = line.slice('data:'.length).trim();
        }
        if (eventName === 'notification' && dataStr) {
          try {
            const payload = JSON.parse(dataStr);
            patchLocalOnIncoming(payload);
            info?.(payload.title ? `${payload.title}` : 'Có thông báo mới');
          } catch (e) {
            // ignore parse error
          }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE delimiter = double newline
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            processEventBlock(trimmed);
          }
        }
      } catch (err) {
        // connection closed/aborted
      }
    };

    start();
  }, [info]);

  const markAsRead = async (id) => {
    try {
      const res = await apiService.markCTVNotificationRead(id);
      if (!res?.success) {
        // keep going if backend returns success=false
      }
      setNotifications((prev) =>
        (prev || []).map((n) => (String(n.id) === String(id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, (typeof c === 'number' ? c - 1 : 0)));
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error('[NotificationsPage] markAsRead error:', err);
    }
  };

  const handleClickNotification = async (n) => {
    if (!n) return;
    if (!n.isRead) {
      await markAsRead(n.id);
    }

    const nextUrl = normalizeNotificationUrl(n.url);
    if (nextUrl) navigate(nextUrl);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="w-full flex-shrink-0 px-0 py-1.5 mb-1.5">
        <div className="flex items-center gap-2.5 flex-wrap justify-between w-full">
          <div className="flex items-center px-3 py-1.5 rounded-full bg-white text-[12px] sm:text-[13px] min-w-[220px] flex-1" style={{ boxShadow: 'none' }}>
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Tìm theo nội dung thông báo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full bg-transparent outline-none text-[12px] sm:text-[13px]"
              style={{ border: 'none' }}
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            <button
              onMouseEnter={() => setHoveredResetButton(true)}
              onMouseLeave={() => setHoveredResetButton(false)}
              onClick={() => {
                setSearchQuery('');
                setDateFrom('');
                setDateTo('');
                setIsDateFilterOpen(false);
              }}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors"
              style={{ backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}
            >
              Xóa lọc
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold"
                style={{ color: '#374151' }}
              >
                Lọc theo ngày
                <ChevronDown className="w-3 h-3" />
              </button>
              {isDateFilterOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: '#374151' }}>Từ ngày</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: '#374151' }}>Đến ngày</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                        setIsDateFilterOpen(false);
                      }}
                      className="self-end text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                    >
                      Xóa ngày
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={async () => {
                try {
                  await apiService.markAllCTVNotificationsRead();
                  setNotifications((prev) => (prev || []).map((n) => ({ ...n, isRead: true })));
                  setUnreadCount(0);
                window.dispatchEvent(new Event('notifications:updated'));
                } catch (e) {
                  console.error('[NotificationsPage] markAllRead error:', e);
                }
              }}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold disabled:opacity-50"
              style={{ backgroundColor: unreadCount === 0 ? '#f3f4f6' : '#dc2626', color: 'white' }}
            >
              Đã đọc tất cả
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border p-3" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-red-600" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: '#6b7280' }}>
            Chưa có thông báo.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredNotifications.map((n) => {
              const localized = localizeNotification(n, language);
              return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleClickNotification(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClickNotification(n);
                }}
                className="w-full rounded-lg px-2 py-2 cursor-pointer transition-colors hover:bg-gray-100"
                style={{
                  borderLeft: n.isRead ? '4px solid transparent' : '4px solid #dc2626'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold truncate text-left" style={{ color: n.isRead ? '#111827' : '#b91c1c' }}>
                      {localized.title}
                    </p>
                    <p className="text-[12px] mt-1 whitespace-pre-wrap text-left" style={{ color: '#374151' }}>
                      {localized.content}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-[10px] text-gray-500">
                    {(() => {
                      const ts = getNotificationTs(n);
                      if (!ts) return '';
                      const d = new Date(ts);
                      if (Number.isNaN(d.getTime())) return '';
                      const locale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
                      return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
                    })()}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

