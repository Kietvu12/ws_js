import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Flag,
  FileCheck,
  FileText,
  History,
  CalendarDays,
  Mail,
  HelpCircle,
  FileType,
  Phone,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const BottomNavbar = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  
  // Hover states
  const [hoveredNavItemIndex, setHoveredNavItemIndex] = useState(null);

  const fetchUnreadMessageCount = async () => {
    try {
      const count = await apiService.getCTVUnreadMessageCount();
      setUnreadMessageCount(typeof count === 'number' ? count : 0);
    } catch {
      setUnreadMessageCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadMessageCount();
    const interval = setInterval(fetchUnreadMessageCount, 60000);
    const onFocus = () => fetchUnreadMessageCount();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const generalItems = [
    { id: 'thong-tin-chung', label: t.generalInfo, icon: LayoutGrid, path: '/agent' },
    { id: 'danh-sach-viec-lam', label: t.jobList, icon: Flag, path: '/agent/jobs' },
    { id: 'su-kien', label: t.agentEventsMenu, icon: CalendarDays, path: '/agent/events' },
    { id: 'ho-so-ung-vien', label: t.candidateProfile, icon: FileCheck, path: '/agent/candidates' },
    { id: 'quan-ly-tien-cu', label: t.nominationManagement, icon: FileText, path: '/agent/nominations' },
    { id: 'lich-su-thanh-toan', label: t.paymentHistory, icon: History, path: '/agent/payment-history' },
  ];

  const otherItems = [
    { id: 'lien-he', label: t.contact, icon: Mail, path: '/agent/contact' },
    { id: 'cau-hoi-thuong-gap', label: t.faq, icon: HelpCircle, path: '/agent/faq' },
    { id: 'dieu-khoan-su-dung', label: t.terms, icon: FileType, path: '/agent/terms' },
    { id: 'hotline-zalo', label: t.hotline, icon: Phone, path: '/agent/hotline' },
  ];

  const isActive = (path) => {
    if (path === '/agent') {
      return location.pathname === '/agent' || location.pathname === '/agent/';
    }
    return location.pathname.startsWith(path);
  };

  // Trang chính: tối đa 6 mục (gồm Sự kiện)
  const navItems = generalItems.slice(0, 6);

  return (
    <div 
      className="lg:hidden fixed bottom-0 left-0 right-0 border-t shadow-lg z-50 safe-area-bottom" 
      style={{ 
        backgroundColor: 'white', 
        borderColor: '#e5e7eb', 
        boxShadow: '0 -4px 12px -2px rgba(0, 0, 0, 0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex items-center justify-around px-1 sm:px-2 py-1.5 sm:py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.id}
              to={item.path}
              onMouseEnter={() => setHoveredNavItemIndex(item.id)}
              onMouseLeave={() => setHoveredNavItemIndex(null)}
              className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg transition-colors relative min-w-0 flex-1"
              style={{
                backgroundColor: active 
                  ? '#fef2f2' 
                  : (hoveredNavItemIndex === item.id ? '#f9fafb' : 'transparent'),
                color: active ? '#dc2626' : '#6b7280'
              }}
              title={item.label}
            >
              <span className="relative inline-flex">
                <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" style={{ color: active ? '#dc2626' : '#6b7280' }} />
                {item.id === 'quan-ly-tien-cu' && unreadMessageCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ backgroundColor: '#dc2626', color: '#fff', padding: '0 3px' }}
                    title={`${unreadMessageCount} tin nhắn chưa đọc`}
                  >
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </span>
                )}
              </span>
              <span 
                className="text-[8px] sm:text-[9px] mt-0.5 truncate max-w-full text-center font-medium"
                style={{ color: active ? '#dc2626' : '#9ca3af' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavbar;

