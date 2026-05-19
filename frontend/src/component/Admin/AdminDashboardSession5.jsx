import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Briefcase,
  User,
  MoreVertical,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const AdminDashboardSession5 = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarEvents, setCalendarEvents] = useState({});
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [showDayPanel, setShowDayPanel] = useState(false);

  const dateLocale =
    language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoadingCampaigns(true);
        const response = await apiService.getAdminCampaigns({
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        });
        const rows =
          response?.data?.rows ||
          response?.data?.campaigns ||
          response?.data ||
          [];
        setCampaigns(Array.isArray(rows) ? rows : []);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        setCampaigns([]);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, []);

  useEffect(() => {
    const fetchCalendars = async () => {
      try {
        setLoadingCalendar(true);
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

        const startFrom = monthStart.toISOString().slice(0, 10);
        const startTo = monthEnd.toISOString().slice(0, 10);

        const response = await apiService.getAdminCalendars({
          startFrom,
          startTo,
          limit: 200,
        });

        const calendars =
          response?.data?.calendars || response?.data || [];

        const map = {};

        (Array.isArray(calendars) ? calendars : []).forEach((item) => {
          const rawStart = item.startAt || item.start_at;
          if (!rawStart) return;
          const d = new Date(rawStart);
          if (Number.isNaN(d.getTime())) return;
          const dateKey = d.toISOString().slice(0, 10);
          const time = d.toTimeString().slice(0, 5);

          if (!map[dateKey]) map[dateKey] = [];

          const eventType = item.eventType || item.event_type || 1;

          map[dateKey].push({
            id: item.id,
            dateKey,
            time,
            type: eventType === 1 ? 'interview' : eventType === 2 ? 'nyusha' : 'meeting',
            title:
              item.title
              || (eventType === 1
                ? t.adminDashboardInterviewCandidate || 'Phỏng vấn ứng viên'
                : eventType === 2
                  ? t.adminDashboardNyushaEvent || 'Sự kiện Nyusha'
                  : t.adminDashboardMeetingEvent || 'Lịch họp'),
            candidate:
              item.jobApplication?.name
              || item.jobApplication?.cv?.name
              || item.jobApplication?.cv?.fullName
              || '',
            job: item.jobApplication?.job?.title || '',
            location: item.description || '',
          });
        });

        setCalendarEvents(map);

        const today = new Date();
        const twoWeeksAhead = new Date();
        twoWeeksAhead.setDate(today.getDate() + 14);

        const upcoming = [];
        Object.values(map).forEach((items) => {
          items.forEach((ev) => {
            const d = new Date(ev.dateKey);
            if (d < today || d > twoWeeksAhead) return;
            const diffDays = Math.round(
              (d - today) / (1000 * 60 * 60 * 24),
            );
            upcoming.push({
              ...ev,
              daysUntil: diffDays,
            });
          });
        });

        upcoming.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
          return a.time.localeCompare(b.time);
        });

        setUpcomingEvents(upcoming.slice(0, 8));
      } catch (error) {
        console.error('Error fetching admin calendars:', error);
        setCalendarEvents({});
        setUpcomingEvents([]);
      } finally {
        setLoadingCalendar(false);
      }
    };

    fetchCalendars();
  }, [calendarMonth, t, language]);

  const monthNamesShort =
    t.calendarMonthNames ||
    ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const weekdayShort =
    t.calendarDayNames ||
    ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const calendarDays = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);

    const offset = (first.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < offset; i += 1) {
      days.push(null);
    }
    for (let d = 1; d <= last.getDate(); d += 1) {
      days.push(d);
    }

    return days;
  }, [calendarMonth]);

  const getDateKey = (day) => {
    if (!day) return null;
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handlePrevMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const selectedDayEvents = useMemo(
    () => (selectedDateKey && calendarEvents[selectedDateKey]) || [],
    [selectedDateKey, calendarEvents],
  );

  return (
    <div className="mt-2 sm:mt-3 md:mt-4 grid grid-cols-1 lg:grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-3">
      {/* Campaign list (span 2) */}
      <div className="lg:col-span-2 bg-white rounded-sm sm:rounded-md p-1.5 sm:p-2.5 md:p-3 border border-gray-100 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <div className="mb-1.5 sm:mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-gray-900">
              {t.adminDashboardCampaignListTitle || 'Danh sách campaign'}
            </h3>
            <p className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500">
              {t.adminDashboardCampaignListDesc
                || 'Theo dõi trạng thái và thời gian chạy campaign.'}
            </p>
          </div>
        </div>

        <div className="rounded-[10px] border border-gray-100 overflow-hidden">
          <div className="bg-slate-50 px-2 sm:px-2.5 py-1.5 border-b border-gray-100 grid grid-cols-12 gap-1 items-center">
            <span className="col-span-4 text-[8px] sm:text-[9px] font-semibold text-slate-500">
              {t.colName || 'Tên campaign'}
            </span>
            <span className="col-span-2 text-[8px] sm:text-[9px] font-semibold text-slate-500">
              {t.colStatus || 'Trạng thái'}
            </span>
            <span className="col-span-3 text-[8px] sm:text-[9px] font-semibold text-slate-500">
              {t.colDate || 'Thời gian'}
            </span>
            <span className="col-span-3 text-[8px] sm:text-[9px] font-semibold text-slate-500 text-right pr-1">
              {t.colProgress || 'Tiến độ'}
            </span>
          </div>

          <div className="divide-y divide-gray-50 max-h-[220px] overflow-y-auto">
            {loadingCampaigns ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  className="px-2 sm:px-2.5 py-1.5 animate-pulse grid grid-cols-12 gap-1 items-center"
                >
                  <div className="col-span-4 h-3.5 rounded bg-slate-100" />
                  <div className="col-span-2 h-3 rounded-full bg-slate-100" />
                  <div className="col-span-3 h-3 rounded bg-slate-100" />
                  <div className="col-span-3 h-2 rounded-full bg-slate-100 ml-auto w-16" />
                </div>
              ))
            ) : campaigns.length === 0 ? (
              <div className="px-2.5 py-2.5 text-[9px] sm:text-[10px] text-center text-gray-500">
                {t.adminDashboardNoCampaign || 'Chưa có campaign nào.'}
              </div>
            ) : (
              campaigns.map((c) => {
                const start = c.startDate || c.start_date;
                const end = c.endDate || c.end_date;
                const status = c.status;

                let statusLabel = t.statusDraft || 'Nháp';
                let statusColor =
                  'bg-slate-100 text-slate-600 border border-slate-200';

                if (status === 1 || status === 'active') {
                  statusLabel = t.statusActive || 'Đang chạy';
                  statusColor =
                    'bg-blue-50 text-blue-700 border border-blue-200';
                } else if (status === 2 || status === 'completed') {
                  statusLabel = t.statusCompleted || 'Hoàn thành';
                  statusColor =
                    'bg-emerald-50 text-emerald-700 border border-emerald-200';
                } else if (status === 3 || status === 'stopped') {
                  statusLabel = t.statusStopped || 'Dừng';
                  statusColor =
                    'bg-red-50 text-red-600 border border-red-200';
                }

                const progress =
                  typeof c.progress === 'number'
                    ? Math.min(100, Math.max(0, c.progress))
                    : undefined;

                return (
                  <div
                    key={c.id}
                    className="px-2 sm:px-2.5 py-1.5 grid grid-cols-12 gap-1 items-center hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="col-span-4 min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-semibold text-slate-900 truncate">
                        {c.name}
                      </p>
                      {c.description && (
                        <p className="text-[7px] sm:text-[8px] text-slate-500 truncate">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center px-1 py-0.5 rounded-full text-[8px] font-medium ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <p className="text-[8px] sm:text-[9px] text-slate-700">
                        {start
                          ? new Date(start).toLocaleDateString(dateLocale, {
                              day: '2-digit',
                              month: 'short',
                            })
                          : '--'}
                        {' '}
                        –
                        {' '}
                        {end
                          ? new Date(end).toLocaleDateString(dateLocale, {
                              day: '2-digit',
                              month: 'short',
                            })
                          : '--'}
                      </p>
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <div className="w-14 sm:w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                          style={{
                            width: `${
                              progress != null
                                ? progress
                                : (status === 1 || status === 'active')
                                  ? 60
                                  : status === 2 || status === 'completed'
                                    ? 100
                                    : 20
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Upcoming events */}
      <div className="bg-white rounded-sm sm:rounded-md p-2 sm:p-3 md:p-4 border border-gray-100 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {t.adminDashboardUpcomingEventsTitle || 'Sự kiện sắp diễn ra'}
            </h3>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.adminDashboardUpcomingEventsDesc
                || 'Các lịch hẹn trong 14 ngày tới.'}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
          {loadingCalendar ? (
            Array.from({ length: 4 }).map((_, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={idx} className="flex gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 rounded bg-slate-100 w-1/2" />
                  <div className="h-2.5 rounded bg-slate-100 w-3/4" />
                </div>
              </div>
            ))
          ) : upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CalendarIcon className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-[10px] sm:text-xs text-slate-500">
                {t.adminDashboardNoUpcomingEvents || 'Không có sự kiện nào sắp diễn ra.'}
              </p>
            </div>
          ) : (
            upcomingEvents.map((ev) => {
              const dateObj = new Date(ev.dateKey);
              const isToday = ev.daysUntil === 0;
              const isTomorrow = ev.daysUntil === 1;

              let typeColor = 'bg-slate-100 text-slate-700';
              if (ev.type === 'interview') {
                typeColor = 'bg-blue-100 text-blue-700';
              } else if (ev.type === 'nyusha') {
                typeColor = 'bg-emerald-100 text-emerald-700';
              } else {
                typeColor = 'bg-indigo-100 text-indigo-700';
              }

              return (
                <div
                  key={`${ev.dateKey}-${ev.id}`}
                  className="flex gap-2.5 items-start rounded-lg border border-slate-100 px-2.5 py-2 hover:border-blue-200 hover:shadow-sm transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold ${typeColor}`}
                  >
                    {ev.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-900 truncate">
                      {ev.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon className="w-2.5 h-2.5" />
                        {dateObj.toLocaleDateString(dateLocale, {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                      {isToday && (
                        <span className="text-blue-600 font-medium">
                          {t.adminDashboardToday || 'Hôm nay'}
                        </span>
                      )}
                      {isTomorrow && !isToday && (
                        <span className="text-blue-600 font-medium">
                          {t.adminDashboardTomorrow || 'Ngày mai'}
                        </span>
                      )}
                      {!isToday && !isTomorrow && (
                        <span>
                          {(t.adminDashboardDaysFromNow || 'Còn {n} ngày')
                            .replace('{n}', String(ev.daysUntil))}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px] text-slate-500">
                      {ev.candidate && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          {ev.candidate}
                        </span>
                      )}
                      {ev.job && (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="w-2.5 h-2.5" />
                          {ev.job}
                        </span>
                      )}
                      {ev.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Calendar + day detail slide-in */}
      <div className="bg-white rounded-sm sm:rounded-md p-2 sm:p-3 md:p-4 border border-gray-100 shadow-[0_4px_18px_rgba(15,23,42,0.04)] flex flex-col relative overflow-hidden">
        <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {t.adminDashboardCalendarTitle || 'Lịch hẹn'}
            </h3>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.adminDashboardCalendarDesc
                || 'Nhấp vào ngày để xem các lịch hẹn chi tiết.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <div className="text-[9px] sm:text-[10px] font-semibold text-slate-800">
              {monthNamesShort[calendarMonth.getMonth()]}
              {' '}
              {calendarMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 text-[8px] sm:text-[9px] text-slate-500 mb-1">
          {weekdayShort.map((d) => (
            <div
              key={d}
              className="text-center font-medium py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1">
          {calendarDays.map((day, idx) => {
            if (!day) {
              // eslint-disable-next-line react/no-array-index-key
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const key = getDateKey(day);
            const events = (key && calendarEvents[key]) || [];
            const isToday = (() => {
              const now = new Date();
              return (
                key
                && now.toISOString().slice(0, 10) === key
              );
            })();

            const ringClass = isToday
              ? 'border-blue-500 bg-blue-50'
              : events.length > 0
                ? 'border-indigo-500/40 bg-indigo-50'
                : 'border-slate-100 bg-white';

            return (
              <button
                // eslint-disable-next-line react/no-array-index-key
                key={`day-${idx}`}
                type="button"
                className="aspect-square"
                onClick={() => {
                  if (events.length === 0) {
                    setSelectedDateKey(null);
                    setShowDayPanel(false);
                  } else {
                    setSelectedDateKey(key);
                    setShowDayPanel(true);
                  }
                }}
              >
                <div
                  className={`h-full rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors hover:border-blue-400 hover:bg-blue-50/40 ${ringClass}`}
                >
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-900">
                    {day}
                  </span>
                  {events.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {events.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            ev.type === 'interview'
                              ? 'bg-blue-600'
                              : ev.type === 'nyusha'
                                ? 'bg-emerald-600'
                                : 'bg-indigo-600'
                          }`}
                        />
                      ))}
                      {events.length > 3 && (
                        <span className="text-[7px] text-slate-500">
                          +
                          {events.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Slide-in day detail panel */}
        {selectedDayEvents.length > 0 && (
          <>
            {/* Backdrop only inside this card */}
            <div
              className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-200 ${
                showDayPanel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setShowDayPanel(false)}
            />

            <div
              className="absolute top-0 right-0 h-full w-full max-w-xs sm:max-w-sm bg-white shadow-2xl border-l border-slate-100 rounded-l-md flex flex-col"
              style={{
                transform: showDayPanel ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.25s ease-in-out',
              }}
            >
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-100">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold text-slate-900">
                    {selectedDateKey
                      && new Date(selectedDateKey).toLocaleDateString(dateLocale, {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                  </p>
                  <p className="text-[8px] sm:text-[9px] text-slate-500">
                    {(t.adminDashboardAppointmentsCount || '{count} lịch hẹn')
                      .replace('{count}', String(selectedDayEvents.length))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDayPanel(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                  aria-label={t.close || 'Đóng'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2.5 space-y-2.5">
                {selectedDayEvents.map((ev) => {
                  const dotColor = ev.type === 'interview'
                    ? 'bg-blue-600'
                    : ev.type === 'nyusha'
                      ? 'bg-emerald-600'
                      : 'bg-indigo-600';

                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 px-2.5 sm:px-3 py-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="text-[8px] sm:text-[9px] text-slate-500">
                            {selectedDateKey
                              && new Date(selectedDateKey).toLocaleDateString(dateLocale, {
                                month: 'short',
                                day: '2-digit',
                              })}
                            {' • '}
                            {ev.time}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="mt-1.5">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-900">
                          {ev.title}
                        </p>
                        {(ev.job || ev.candidate) && (
                          <p className="mt-0.5 text-[8px] sm:text-[9px] text-slate-500">
                            {ev.job}
                            {ev.job && ev.candidate && ' • '}
                            {ev.candidate}
                          </p>
                        )}
                        {ev.location && (
                          <p className="mt-0.5 text-[8px] sm:text-[9px] text-slate-400">
                            {ev.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardSession5;

