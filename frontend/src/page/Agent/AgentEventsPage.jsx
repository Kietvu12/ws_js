import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Calendar as CalendarIcon, MapPin, ChevronDown } from 'lucide-react';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import AgentEventSlideOver from '../../component/Agent/AgentEventSlideOver';

const TAB_ALL = 'all';
const TAB_UPCOMING = 'upcoming';
const TAB_JOINED = 'joined';

const AgentEventsPage = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const [tab, setTab] = useState(TAB_ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [listVersion, setListVersion] = useState(0);

  const [slideOpen, setSlideOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const dateFilterRef = useRef(null);

  useEffect(() => {
    if (!isDateFilterOpen) return;
    const onDoc = (e) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target)) setIsDateFilterOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isDateFilterOpen]);

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 320);
    return () => clearTimeout(tmr);
  }, [searchQuery]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: 1,
        limit: 200,
        sortBy: 'start_at',
        sortOrder: tab === TAB_UPCOMING ? 'ASC' : 'DESC',
      };
      if (tab === TAB_UPCOMING) params.upcoming = '1';
      if (tab === TAB_JOINED) params.participated = '1';
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFrom) params.startFrom = dateFrom;
      if (dateTo) params.startTo = dateTo;

      const res = await apiService.getCTVEvents(params);
      const raw = res?.data?.events ?? res?.events ?? [];
      const list = Array.isArray(raw) ? raw : [];
      if (res?.success === false) {
        setEvents([]);
        setError(res?.message || translations.vi.agentEventsLoadError);
      } else {
        setEvents(list);
      }
    } catch (e) {
      setEvents([]);
      setError(e.message || translations.vi.agentEventsLoadError);
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, listVersion]);

  const fmt = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    const locale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
    return dt.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const openEvent = (id) => {
    setSelectedEventId(id);
    setSlideOpen(true);
  };

  const tabs = [
    { id: TAB_ALL, label: t.agentEventsTabAll },
    { id: TAB_UPCOMING, label: t.agentEventsTabUpcoming },
    { id: TAB_JOINED, label: t.agentEventsTabJoined },
  ];

  return (
    <div className="w-full max-w-full">
      <div className="border-b bg-white px-3 sm:px-4 py-3 space-y-3" style={{ borderColor: '#e5e7eb' }}>
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((x) => {
            const active = tab === x.id;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: active ? '#eff6ff' : 'white',
                  color: active ? '#1d4ed8' : '#374151',
                  border: `1px solid ${active ? '#bfdbfe' : '#e5e7eb'}`,
                }}
              >
                {x.label}
              </button>
            );
          })}
        </div>

        {/* Search + filter — kiểu NominationsPageContent */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap justify-between">
          <div
            className="flex items-center px-3 py-1.5 rounded-full bg-white text-[12px] sm:text-[13px] min-w-[220px] flex-1 border border-gray-100 transition-[box-shadow,border-color] focus-within:border-blue-200 focus-within:shadow-[0_0_0_2px_rgba(37,99,235,0.12)]"
          >
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.agentEventsSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 bg-transparent border-0 outline-none text-[12px] sm:text-[13px] focus:ring-0 focus:outline-none"
            />
          </div>

          <div ref={dateFilterRef} className="relative flex items-center gap-2.5 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold border"
              style={{ color: '#374151', borderColor: '#e5e7eb' }}
            >
              {t.agentEventsFilterDate}
              <ChevronDown className="w-3 h-3" />
            </button>
            {isDateFilterOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-white p-3 z-30 text-[11px] sm:text-xs shadow-lg"
                style={{ borderColor: '#e5e7eb' }}
              >
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-700">{t.dateFromLabel}</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-2 py-1 border rounded"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-700">{t.dateToLabel}</span>
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
                    }}
                    className="self-end mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                  >
                    {t.agentEventsClearFilter}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 max-h-[calc(100vh-14rem)] overflow-y-auto px-0 sm:px-1 pb-4">
        {loading ? (
          <div className="text-sm text-gray-500 py-8 text-center">{t.agentEventsLoading}</div>
        ) : error ? (
          <div className="rounded-lg border p-4 text-sm text-red-600" style={{ borderColor: '#fecaca' }}>
            {error}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-500 py-6">{t.agentEventsEmptyList}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {events.map((evt) => (
              <button
                key={evt.id}
                type="button"
                onClick={() => openEvent(evt.id)}
                className="text-left rounded-xl border bg-white p-3 sm:p-4 hover:shadow-sm transition-shadow cursor-pointer"
                style={{ borderColor: '#e5e7eb' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 line-clamp-2">{evt.title || t.agentEventsUntitled}</span>
                      {(evt.is_registered || evt.isRegistered) && (
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: '#ecfdf5', color: '#047857' }}
                        >
                          {t.agentEventsBadgeRegistered}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-[12px] text-gray-600">
                      <div className="inline-flex items-center gap-1.5">
                        <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          {fmt(evt.start_at ?? evt.startAt)}
                          {(evt.end_at ?? evt.endAt) ? ` → ${fmt(evt.end_at ?? evt.endAt)}` : ''}
                        </span>
                      </div>
                      {evt.location && (
                        <div className="inline-flex items-start gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{evt.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold flex-shrink-0 pt-0.5" style={{ color: '#2563eb' }}>
                    {t.agentEventsOpenDetail}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AgentEventSlideOver
        open={slideOpen}
        eventId={selectedEventId}
        onClose={() => {
          setSlideOpen(false);
          setSelectedEventId(null);
        }}
        onRegistered={() => setListVersion((v) => v + 1)}
      />
    </div>
  );
};

export default AgentEventsPage;
