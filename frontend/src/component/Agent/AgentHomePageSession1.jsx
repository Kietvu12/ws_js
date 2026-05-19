import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { UserPlus, Users, Briefcase } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import { fetchDashboard, fetchDashboardChart } from '../../store/actions/dashboardActions';

const VALUE_COLOR = '#1e3a5f';
const ICON_COLOR = '#b91c1c';
const LABEL_COLOR = '#94a3b8';

const AgentHomePageSession1 = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const dispatch = useDispatch();

  const { loading, overview, chartData } = useSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchDashboardChart({ type: 'month' }));
  }, [dispatch]);

  const cards = useMemo(() => {
    const totalApplications = overview?.totalApplications ?? 0;
    const interviewedCount = overview?.interviewedCount ?? 0;
    const hiredCount = overview?.nyushaCount ?? 0;
    return [
      { key: 'applicant', title: t.applicant, value: String(totalApplications), icon: UserPlus },
      { key: 'interviewed', title: t.interviewed, value: String(interviewedCount), icon: Users },
      { key: 'hired', title: t.hired, value: String(hiredCount), icon: Briefcase },
    ];
  }, [overview, language, t]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="min-h-[40px] animate-pulse rounded-md border border-red-100/60 bg-white p-1.5 sm:min-h-[44px] sm:p-2 md:min-h-[50px] md:p-2.5 lg:min-h-[58px] lg:p-3"
          >
            <div className="flex items-start gap-1 sm:gap-1.5 md:gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-1.5 sm:h-2 md:h-2.5 bg-gray-100 rounded w-3/4 mb-0.5 sm:mb-1" />
                <div className="h-2.5 sm:h-3 md:h-4 lg:h-5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="flex min-h-[40px] items-start gap-1 rounded-md border border-red-100/80 bg-white p-1.5 shadow-sm shadow-red-900/5 sm:min-h-[44px] sm:gap-1.5 sm:p-2 md:min-h-[50px] md:gap-2 md:p-2.5 lg:min-h-[58px] lg:p-3"
          >
            <div
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-50 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
            >
              <Icon className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" style={{ color: ICON_COLOR }} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] truncate leading-tight" style={{ color: LABEL_COLOR }}>
                {card.title}
              </p>
              <p className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm font-bold mt-0.5 truncate leading-tight" style={{ color: VALUE_COLOR }}>
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgentHomePageSession1;
