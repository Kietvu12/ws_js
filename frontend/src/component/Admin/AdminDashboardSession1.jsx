import React, { useState, useEffect } from 'react';
import { Users, Building2, Briefcase, FileText, ClipboardList, DollarSign } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api.js';

const VALUE_COLOR = '#ffffff';
const ICON_COLOR = '#ffffff';
const LABEL_COLOR = '#ffffff';

const AdminDashboardSession1 = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdminDashboard();
      if (response.success) setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num == null) return '0';
    return Number(num).toLocaleString('en-US');
  };

  const cards = [
    {
      key: 'ctv',
      title: t.adminDashboardCardTotalCtv,
      value: formatNumber(data?.collaborators?.total),
      icon: Users,
    },
    {
      key: 'companies',
      title: t.adminDashboardCardTotalCompanies,
      value: formatNumber(data?.companies?.total),
      icon: Building2,
    },
    {
      key: 'jobs',
      title: t.adminDashboardCardTotalJobs,
      value: formatNumber(data?.jobs?.total),
      icon: Briefcase,
    },
    {
      key: 'candidates',
      title: t.adminDashboardCardTotalCandidates,
      value: formatNumber(data?.candidates?.total),
      icon: FileText,
    },
    {
      key: 'nominations',
      title: t.adminDashboardCardTotalNominations,
      value: formatNumber(data?.applications?.total),
      icon: ClipboardList,
    },
    {
      key: 'paymentRequests',
      title: t.adminDashboardCardTotalPaymentRequests,
      value: formatNumber(data?.paymentRequests?.total),
      icon: DollarSign,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2">
        {cards.map((_, i) => (
          <div key={i} className="bg-white rounded sm:rounded-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 animate-pulse min-h-[40px] sm:min-h-[44px] md:min-h-[50px] lg:min-h-[58px]">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="bg-[#B91C1C] rounded sm:rounded-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 flex items-start gap-1 sm:gap-1.5 md:gap-2 min-h-[40px] sm:min-h-[44px] md:min-h-[50px] lg:min-h-[58px]"
            style={{ boxShadow: 'none', border: 'none' }}
          >
            <div
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#B91C1C' }}
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

export default AdminDashboardSession1;
