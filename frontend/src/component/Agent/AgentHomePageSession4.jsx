import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, Calendar, MoreVertical, User, Grid3x3, List } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const AgentHomePageSession4 = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [activeTab, setActiveTab] = useState('interview');
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [viewMode, setViewMode] = useState('line'); // 'line' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [interviews, setInterviews] = useState([]);
  const [naitei, setNaitei] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredViewModeButton, setHoveredViewModeButton] = useState(false);
  const [hoveredSeeAllButton, setHoveredSeeAllButton] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingUpcomingEvents, setLoadingUpcomingEvents] = useState(true);
  const [hoveredPrevMonthButton, setHoveredPrevMonthButton] = useState(false);
  const [hoveredNextMonthButton, setHoveredNextMonthButton] = useState(false);
  const [hoveredDatePickerPrevButton, setHoveredDatePickerPrevButton] = useState(false);
  const [hoveredDatePickerNextButton, setHoveredDatePickerNextButton] = useState(false);
  const [hoveredEventCardIndex, setHoveredEventCardIndex] = useState(null);
  const [hoveredMoreButtonIndex, setHoveredMoreButtonIndex] = useState(null);
  const [hoveredGoToMeetingButtonIndex, setHoveredGoToMeetingButtonIndex] = useState(null);
  const [hoveredCalendarDayIndex, setHoveredCalendarDayIndex] = useState(null);

  const pickByLanguage = (viText, enText, jpText) => {
    if (language === 'en') return enText || viText || jpText || '';
    if (language === 'ja') return jpText || enText || viText || '';
    return viText || enText || jpText || '';
  };

  const getLocalizedField = (item, field = 'name') => {
    const baseValue = item?.[field] || '';
    const languageKey = language === 'en' ? 'En' : language === 'ja' ? 'Jp' : '';
    if (!languageKey) return baseValue;
    return item?.[`${field}${languageKey}`] || baseValue;
  };

  const getLocalizedScheduleLabel = (item, field = 'role') => {
    const baseValue = item?.[field] || '';
    const languageKey = language === 'en' ? 'En' : language === 'ja' ? 'Jp' : '';
    if (!languageKey) return baseValue;
    return item?.[`${field}${languageKey}`] || baseValue;
  };

  const getInterviewTitle = () => {
    if (language === 'en') return 'Candidate interview';
    if (language === 'ja') return '候補者面接';
    return 'Phỏng vấn ứng viên';
  };

  const getInterviewDescription = (item) => {
    const applicationId = item?.job?.applicationId || item?.jobApplicationId || item?.applicationId || item?.job?.id;
    if (language === 'en') {
      return applicationId
        ? `Interview schedule for application #${applicationId}`
        : 'Interview schedule for the application';
    }
    if (language === 'ja') {
      return applicationId
        ? `応募 #${applicationId} の面接予定`
        : '応募の面接予定';
    }
    return applicationId
      ? `Lịch phỏng vấn cho đơn ứng tuyển #${applicationId}`
      : 'Lịch phỏng vấn cho đơn ứng tuyển';
  };

  const translateInterviewDisplayText = (text, item) => {
    const applicationId = item?.job?.applicationId || item?.jobApplicationId || item?.applicationId || item?.job?.id;
    const normalized = String(text || '').trim().toLowerCase();

    const viTitleMatches = ['phỏng vấn ứng viên', 'phỏng vấn'].includes(normalized);
    const viDescMatches = normalized.startsWith('lịch phỏng vấn cho đơn ứng tuyển');

    if (language === 'vi') {
      return text || '';
    }

    if (language === 'en') {
      if (viTitleMatches) return 'Candidate interview';
      if (viDescMatches) {
        return applicationId
          ? `Interview schedule for application #${applicationId}`
          : 'Interview schedule for the application';
      }
      return text || '';
    }

    if (language === 'ja') {
      if (viTitleMatches) return '候補者面接';
      if (viDescMatches) {
        return applicationId
          ? `応募 #${applicationId} の面接予定`
          : '応募の面接予定';
      }
      return text || '';
    }

    return text || '';
  };

  // Load schedule data
  useEffect(() => {
    loadSchedule();
  }, [currentMonth]);

  // Listen for calendar created events
  useEffect(() => {
    const handleCalendarCreated = () => {
      loadSchedule(); // Reload schedule when calendar is created
    };
    window.addEventListener('calendarCreated', handleCalendarCreated);
    return () => {
      window.removeEventListener('calendarCreated', handleCalendarCreated);
    };
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const response = await apiService.getSchedule({ month, year });
      
      if (response.success && response.data) {
        // Process interviews
        const processedInterviews = (response.data.interviews || []).map(item => {
          const interviewDate = new Date(item.interviewDate);
          return {
            ...item,
            date: interviewDate.getDate(),
            time: item.interviewTime || '00:00',
            name: getLocalizedField(item, 'name') || getInterviewTitle(),
            description: getInterviewDescription(item),
            role: getLocalizedScheduleLabel(item, 'role') || pickByLanguage(
              item.job?.titleVi || item.job?.title,
              item.job?.titleEn,
              item.job?.titleJp
            ),
            isActive: new Date(item.interviewDate) >= new Date()
          };
        });
        
        // Process naitei
        const processedNaitei = (response.data.naitei || []).map(item => {
          const naiteiDate = new Date(item.naiteiDate || item.interviewDate);
          return {
            ...item,
            date: naiteiDate.getDate(),
            time: item.naiteiTime || item.interviewTime || '00:00',
            name: getLocalizedField(item, 'name') || pickByLanguage(
              item.job?.candidateName,
              item.job?.candidateNameEn,
              item.job?.candidateNameJp
            ),
            description: pickByLanguage(
              item.job?.company?.nameVi || item.job?.company?.name,
              item.job?.company?.nameEn,
              item.job?.company?.nameJp
            ) || getLocalizedScheduleLabel(item, 'description'),
            role: getLocalizedScheduleLabel(item, 'role') || pickByLanguage(
              item.job?.titleVi || item.job?.title,
              item.job?.titleEn,
              item.job?.titleJp
            ),
            isActive: naiteiDate >= new Date()
          };
        });
        
        setInterviews(processedInterviews);
        setNaitei(processedNaitei);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      setInterviews([]);
      setNaitei([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate dates for date picker (next 7 days) - dùng t.calendarDayNames theo ngôn ngữ
  const generateDates = () => {
    const dayNames = t.calendarDayNames || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: dayNames[date.getDay()],
        date: date.getDate()
      });
    }
    return dates;
  };

  const dates = generateDates();
  const monthNames = t.calendarMonthNames || ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const allEvents = activeTab === 'interview' ? interviews : naitei;
  const events = viewMode === 'calendar' 
    ? allEvents.filter(event => event.date === selectedDate)
    : allEvents;

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getDaysWithEvents = () => {
    const eventDates = new Set(allEvents.map(event => event.date));
    return eventDates;
  };

  const daysWithEvents = getDaysWithEvents();
  const calendarDays = getDaysInMonth(currentMonth);

  const handleMonthChange = (direction) => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);
    setCurrentMonth(newMonth);
  };

  useEffect(() => {
    const loadUpcomingEvents = async () => {
      try {
        setLoadingUpcomingEvents(true);
        const upcomingRes = await apiService.getCTVEvents({ upcoming: 1, limit: 5, sortBy: 'start_at', sortOrder: 'ASC' });
        const upcoming = upcomingRes?.success ? (upcomingRes.data?.events || []) : [];
        if (upcoming.length > 0) {
          setUpcomingEvents(upcoming);
          return;
        }
        const allRes = await apiService.getCTVEvents({ upcoming: 0, limit: 5, sortBy: 'start_at', sortOrder: 'DESC' });
        setUpcomingEvents(allRes.success ? (allRes.data?.events || []) : []);
      } catch (error) {
        console.error('Error loading upcoming events:', error);
        setUpcomingEvents([]);
      } finally {
        setLoadingUpcomingEvents(false);
      }
    };
    loadUpcomingEvents();
  }, [language]);

  const pickEventTextByLanguage = (viText, enText, jpText) => {
    if (language === 'en') return enText || viText || jpText || '';
    if (language === 'ja') return jpText || enText || viText || '';
    return viText || enText || jpText || '';
  };

  const formatEventDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="bg-white rounded-sm sm:rounded-md border border-red-100 shadow-[0_10px_28px_rgba(220,38,38,0.08)] ring-1 ring-red-50 h-full flex flex-col max-w-full overflow-hidden">
      {/* Header */}
      <div className="p-2 sm:p-2.5 md:p-3 border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-rose-50">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-red-700">
              {language === 'vi' ? 'Lịch sự kiện' : language === 'en' ? 'Event schedule' : 'イベント予定'}
            </div>
            <h3 className="mt-1 text-[10px] sm:text-xs md:text-sm font-bold text-gray-900">
              {t.schedule}
            </h3>
            <p className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-600">
              {t.interview} / {t.naitei}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode(viewMode === 'line' ? 'calendar' : 'line')}
              onMouseEnter={() => setHoveredViewModeButton(true)}
              onMouseLeave={() => setHoveredViewModeButton(false)}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold text-red-700 shadow-sm transition-all hover:bg-red-50 hover:border-red-300"
              title={viewMode === 'line' ? t.agentHomeSwitchToCalendar : t.agentHomeSwitchToList}
            >
              {viewMode === 'line' ? <Grid3x3 className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> : <List className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />}
            </button>
            <button
              onMouseEnter={() => setHoveredSeeAllButton(true)}
              onMouseLeave={() => setHoveredSeeAllButton(false)}
              className="text-[7px] sm:text-[8px] md:text-[10px] font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
            >
              {t.seeAll}
            </button>
          </div>
        </div>

        {/* Month Navigation - thanh tháng/năm */}
        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
          <button
            onClick={() => handleMonthChange(-1)}
            onMouseEnter={() => setHoveredPrevMonthButton(true)}
            onMouseLeave={() => setHoveredPrevMonthButton(false)}
            className="p-0 rounded hover:bg-slate-100 text-slate-500 touch-manipulation"
          >
            <ChevronLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </button>
          <span className="text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-slate-800 leading-tight">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            onMouseEnter={() => setHoveredNextMonthButton(true)}
            onMouseLeave={() => setHoveredNextMonthButton(false)}
            className="p-0 rounded hover:bg-slate-100 text-slate-500 touch-manipulation"
          >
            <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </button>
        </div>

        {/* Date Picker - thanh 7 ngày */}
        {viewMode === 'line' && (
          <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-0 flex-1 min-w-0">
            <button
              onMouseEnter={() => setHoveredDatePickerPrevButton(true)}
              onMouseLeave={() => setHoveredDatePickerPrevButton(false)}
              className="p-0 flex-shrink-0 rounded hover:bg-slate-100 text-slate-500 touch-manipulation"
            >
              <ChevronLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <div className="flex items-center gap-0.5 flex-1 justify-center overflow-x-auto schedule-date-scroll min-w-0 hide-scrollbar">
              {dates.map((item, index) => {
                const isSelected = selectedDate === item.date;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(item.date)}
                    className={`flex flex-col items-center justify-center px-0.5 sm:px-1 py-0.5 sm:py-1 rounded transition-colors min-w-[28px] sm:min-w-[32px] md:min-w-[36px] flex-shrink-0 touch-manipulation ${
                      isSelected ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[6px] sm:text-[7px] font-medium leading-none">{item.day}</span>
                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold leading-none mt-0.5">{item.date}</span>
                  </button>
                );
              })}
            </div>
            <button
              onMouseEnter={() => setHoveredDatePickerNextButton(true)}
              onMouseLeave={() => setHoveredDatePickerNextButton(false)}
              className="p-0 flex-shrink-0 rounded hover:bg-slate-100 text-slate-500 touch-manipulation"
            >
              <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-0.5 sm:gap-1 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('interview')}
            className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2 py-1 sm:py-1.5 border-b-2 transition-colors text-[7px] sm:text-[8px] md:text-[9px] font-medium whitespace-nowrap ${
              activeTab === 'interview' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 flex-shrink-0 ${activeTab === 'interview' ? 'text-red-600' : 'text-slate-400'}`} />
            {t.interview} {interviews.length}
          </button>
          <button
            onClick={() => setActiveTab('naitei')}
            className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2 py-1 sm:py-1.5 border-b-2 transition-colors text-[7px] sm:text-[8px] md:text-[9px] font-medium whitespace-nowrap ${
              activeTab === 'naitei' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 flex-shrink-0 ${activeTab === 'naitei' ? 'text-red-600' : 'text-slate-400'}`} />
            {t.naitei} {naitei.length}
          </button>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="p-2 sm:p-2.5 md:p-3 border-b border-red-100 bg-white">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-red-700">
              {language === 'vi' ? 'Sự kiện nổi bật' : language === 'en' ? 'Featured events' : '注目イベント'}
            </div>
            <h4 className="mt-1 text-[9px] sm:text-[10px] md:text-[11px] font-bold text-gray-900">
              {language === 'vi' ? 'Sự kiện sắp tới' : language === 'en' ? 'Upcoming events' : '近日開催イベント'}
            </h4>
            <p className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-600">
              {loadingUpcomingEvents
                ? (t.loading || 'Loading...')
                : `${upcomingEvents.length} ${language === 'vi' ? 'sự kiện' : language === 'en' ? 'events' : '件'}`}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[9px] font-semibold text-red-700 ring-1 ring-red-100">
            <Calendar className="h-3.5 w-3.5" />
            <span>{language === 'vi' ? 'Cập nhật liên tục' : language === 'en' ? 'Live updates' : '随時更新'}</span>
          </div>
        </div>
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
          {loadingUpcomingEvents ? (
            <div className="rounded-md border border-dashed border-red-200 bg-red-50/60 p-3 text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.loading || 'Loading...'}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="rounded-md border border-dashed border-red-200 bg-red-50/60 p-3 text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {language === 'vi' ? 'Chưa có sự kiện sắp tới.' : language === 'en' ? 'No upcoming events.' : '近日開催イベントはありません。'}
            </div>
          ) : (
            upcomingEvents.map((evt, index) => (
              <div
                key={evt.id}
                className="rounded-lg border border-red-100 bg-gradient-to-br from-white to-red-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ boxShadow: index === 0 ? '0 10px 24px rgba(220,38,38,0.10)' : undefined }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 ring-1 ring-red-200">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-gray-900 line-clamp-2">
                      {pickEventTextByLanguage(evt.title, evt.titleEn || evt.title_en, evt.titleJp || evt.title_jp) || (language === 'vi' ? 'Sự kiện' : language === 'en' ? 'Event' : 'イベント')}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[7px] sm:text-[8px] md:text-[9px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatEventDate(evt.start_at)}{evt.end_at ? ` → ${formatEventDate(evt.end_at)}` : ''}
                      </span>
                      {evt.location ? (
                        <span className="inline-flex items-center gap-1">
                          {pickEventTextByLanguage(evt.location, evt.locationEn || evt.location_en, evt.locationJp || evt.location_jp)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Schedule Content */}
      <div className="flex-1 overflow-y-auto p-1 sm:p-1.5 md:p-2">
        <div className="space-y-1 sm:space-y-1.5">
          {viewMode === 'calendar' && (
            <div className="mb-1.5 pb-1.5 border-b border-slate-100">
              <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-[6px] sm:text-[7px] md:text-[8px] text-slate-500 font-medium">
                {(t.calendarDayNames || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day) => (
                  <div key={day} className="text-center py-0">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square min-w-0" />;
                  }
                  const hasEvent = daysWithEvents.has(day);
                  const isSelected = selectedDate === day;
                  const today = new Date();
                  const isToday = currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear() && day === today.getDate();
                  const ringClass = isToday ? 'border-blue-500 bg-blue-50' : hasEvent ? 'border-indigo-500/40 bg-indigo-50' : 'border-slate-100 bg-white';
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      onMouseEnter={() => setHoveredCalendarDayIndex(day)}
                      onMouseLeave={() => setHoveredCalendarDayIndex(null)}
                      className={`aspect-square min-w-0 flex flex-col items-center justify-center rounded border transition-colors relative hover:border-blue-400 hover:bg-blue-50/40 ${ringClass} ${
                        hoveredCalendarDayIndex === day && !isSelected ? 'border-slate-200 bg-slate-50' : ''
                      }`}
                    >
                      <span className="text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-slate-900">{day}</span>
                      {hasEvent && (
                        <span className={`absolute bottom-0 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-600'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5 sm:space-y-2">
            {loading ? (
              <div className="text-center py-3 sm:py-4 text-[7px] sm:text-[8px] md:text-[10px] text-gray-500">{t.loading || 'Loading...'}</div>
            ) : events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="flex gap-1 sm:gap-1.5">
                  <div className="text-[7px] sm:text-[8px] md:text-[9px] font-medium pt-0.5 min-w-[28px] sm:min-w-[32px] text-slate-500 flex-shrink-0">{event.time}</div>
                  <div
                    className="flex-1 min-w-0 border border-slate-100 rounded p-1 sm:p-1.5 bg-white hover:border-blue-200 hover:shadow-sm transition-all relative"
                    onMouseEnter={() => setHoveredEventCardIndex(event.id)}
                    onMouseLeave={() => setHoveredEventCardIndex(null)}
                  >
                    <button
                      className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-0.5 rounded hover:bg-slate-100 text-slate-400"
                      onMouseEnter={() => setHoveredMoreButtonIndex(event.id)}
                      onMouseLeave={() => setHoveredMoreButtonIndex(null)}
                    >
                      <MoreVertical className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                    </button>
                    <div className="flex items-start gap-1 sm:gap-1.5 pr-4 sm:pr-5">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-600">
                        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-slate-900 leading-tight">
                          {translateInterviewDisplayText(event.name || event.role || event.description, event)}
                        </h4>
                        <p className="text-[6px] sm:text-[7px] md:text-[8px] text-slate-500 leading-snug">
                          {translateInterviewDisplayText(event.role, event)}
                        </p>
                        <p className="text-[6px] sm:text-[7px] md:text-[8px] text-slate-500 leading-snug line-clamp-2 mt-0.5">
                          {translateInterviewDisplayText(event.description, event)}
                        </p>
                        <button
                          onMouseEnter={() => event.isActive && setHoveredGoToMeetingButtonIndex(event.id)}
                          onMouseLeave={() => setHoveredGoToMeetingButtonIndex(null)}
                          className={`mt-1 sm:mt-1.5 px-1 sm:px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] md:text-[9px] font-medium transition-colors ${
                            event.isActive
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {t.goToMeeting}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-3 sm:py-4 text-[7px] sm:text-[8px] md:text-[10px] text-gray-500">
                {viewMode === 'calendar' ? t.noEventsForDate : t.noEvents}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentHomePageSession4;
