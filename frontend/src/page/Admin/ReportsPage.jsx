import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  ChevronDown,
  Download,
} from 'lucide-react';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const VALUE_COLOR = '#1e3a5f';
const ICON_COLOR = '#6366f1';
const LABEL_COLOR = '#94a3b8';

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const ReportsPage = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';

  const [month, setMonth] = useState(getCurrentMonth());
  const [overview, setOverview] = useState(null);
  const [topCollaborators, setTopCollaborators] = useState([]);
  const [adminPerformance, setAdminPerformance] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingHr, setLoadingHr] = useState(true);
  const [sortBy, setSortBy] = useState('conversionRate');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    if (!sortDropdownOpen) return;
    const close = () => setSortDropdownOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [sortDropdownOpen]);

  const monthStart = month ? `${month}-01` : null;
  const [y, m] = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = month ? `${month}-${String(lastDay).padStart(2, '0')}` : null;

  useEffect(() => {
    if (!month) return;
    const load = async () => {
      setLoadingOverview(true);
      try {
        const res = await apiService.getReportsOverview({ month });
        if (res.success && res.data) setOverview(res.data);
        else setOverview(null);
      } catch (e) {
        setOverview(null);
      } finally {
        setLoadingOverview(false);
      }
    };
    load();
  }, [month]);

  useEffect(() => {
    if (!month) return;
    const load = async () => {
      setLoadingTop(true);
      try {
        const res = await apiService.getReportsTopCollaborators({ limit: 10, sortBy, month });
        if (res.success && res.data?.list) setTopCollaborators(res.data.list);
        else setTopCollaborators([]);
      } catch (e) {
        setTopCollaborators([]);
      } finally {
        setLoadingTop(false);
      }
    };
    load();
  }, [month, sortBy]);

  useEffect(() => {
    if (!monthStart || !monthEnd) return;
    const load = async () => {
      setLoadingHr(true);
      try {
        const res = await apiService.getHREffectiveness({ startDate: monthStart, endDate: monthEnd });
        if (res.success && res.data?.adminPerformance) setAdminPerformance(res.data.adminPerformance);
        else setAdminPerformance([]);
      } catch (e) {
        setAdminPerformance([]);
      } finally {
        setLoadingHr(false);
      }
    };
    load();
  }, [monthStart, monthEnd]);

  const formatMoney = (num) => {
    if (num == null) return '0';
    return Number(num).toLocaleString(dateLocale);
  };

  const handleExportExcel = async () => {
    if (!month || exportingExcel) return;
    setExportingExcel(true);
    try {
      const response = await apiService.getReportsExportExcel({ month });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao-cao-${month}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(t.reportsExportError || 'Xuất Excel thất bại. Vui lòng thử lại.');
    } finally {
      setExportingExcel(false);
    }
  };

  const overviewCards = [
    {
      key: 'totalNewCandidates',
      title: t.reportsOverviewTotalNewCandidates || 'Tổng ứng viên mới',
      value: overview ? String(overview.totalNewCandidates ?? 0) : '—',
      subtitle: overview != null && overview.previousMonthPercent != null
        ? (t.reportsVsPreviousMonth || 'So với tháng trước:') + ' ' + (overview.previousMonthPercent >= 0 ? '+' : '') + overview.previousMonthPercent + '%'
        : null,
      icon: Users,
    },
    {
      key: 'newNaitei',
      title: t.reportsOverviewNewNaitei || 'Số Naitei mới (tháng)',
      value: overview ? String(overview.newNaiteiCount ?? 0) : '—',
      subtitle: null,
      icon: FileText,
    },
    {
      key: 'projectedRevenue',
      title: t.reportsOverviewProjectedRevenue || 'Doanh thu dự kiến (Từ Naitei)',
      value: overview ? formatMoney(overview.projectedRevenueFromNaitei) + 'đ' : '—',
      subtitle: t.reportsOverviewProjectedRevenueDesc || '(Tính trên ứng viên đã Naitei chưa Nyusha)',
      icon: DollarSign,
    },
    {
      key: 'nyushaCount',
      title: t.reportsOverviewNyushaThisMonth || 'Số Nyusha (Tháng này)',
      value: overview ? String(overview.nyushaCountThisMonth ?? 0) : '—',
      subtitle: null,
      icon: TrendingUp,
    },
    {
      key: 'actualRevenue',
      title: t.reportsOverviewActualRevenue || 'Doanh thu thực nhận (Cuối tháng sau)',
      value: overview ? formatMoney(overview.actualRevenueNextMonth) + 'đ' : '—',
      subtitle: t.reportsOverviewActualRevenueDesc || '(Tính trên ứng viên đã Nyusha tháng này)',
      icon: Calendar,
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-3 space-y-6">
        {/* Month picker + Export Excel */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: LABEL_COLOR }}>
            {t.reportsSelectMonth || 'Chọn tháng'}:
          </span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border text-xs font-medium"
            style={{ borderColor: '#fecaca', backgroundColor: 'white' }}
          />
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-50"
            style={{ borderColor: '#e5e7eb', backgroundColor: 'white' }}
          >
            <Download className="w-3.5 h-3.5" style={{ color: ICON_COLOR }} />
            {exportingExcel ? (t.loading || 'Đang tải...') : (t.reportsExportExcel || 'Xuất Excel')}
          </button>
        </div>

        {/* A. Chỉ số tổng quan */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold" style={{ color: VALUE_COLOR }}>
            {t.reportsOverviewTitle || 'A. Chỉ số tổng quan'}
          </h3>
          {loadingOverview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-md p-2.5 animate-pulse min-h-[52px] flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-3 bg-gray-100 rounded w-3/4 mb-1" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-1.5 sm:gap-2">
              {overviewCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="bg-white rounded sm:rounded-md p-2 sm:p-2.5 flex items-start gap-2 min-h-[52px]"
                    style={{ boxShadow: 'none', border: 'none' }}
                  >
                    <div
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#f1f5f9' }}
                    >
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: ICON_COLOR }} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[9px] sm:text-[10px] truncate leading-tight" style={{ color: LABEL_COLOR }}>
                        {card.title}
                      </p>
                      <p className="text-[11px] sm:text-xs font-bold mt-0.5 leading-tight" style={{ color: VALUE_COLOR }}>
                        {card.value}
                      </p>
                      {card.subtitle && (
                        <p className="text-[9px] mt-0.5" style={{ color: '#6b7280' }}>
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* B. Bảng xếp hạng CTV (Top 10) */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold" style={{ color: VALUE_COLOR }}>
            {t.reportsTopCollaboratorsTitle || 'B. Bảng xếp hạng Cộng tác viên (Top 10 CTV)'}
          </h3>
          <div className="rounded-lg border overflow-hidden bg-white" style={{ borderColor: '#e5e7eb' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs">
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold" style={{ color: VALUE_COLOR }}>
                      {t.reportsColNo || 'STT'}
                    </th>
                    <th className="px-2 py-1.5 text-left font-semibold" style={{ color: VALUE_COLOR }}>
                      {t.reportsColCollaboratorName || 'Tên CTV'}
                    </th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>
                      {t.reportsColNominations || 'Số đơn tiến cử'}
                    </th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>
                      {t.reportsColNaitei || 'Số Naitei'}
                    </th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>
                      <div className="relative inline-flex items-center gap-0.5">
                        {t.reportsColConversionRate || 'Tỷ lệ chuyển đổi'}
                        <button
                          type="button"
                          onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                          className="p-0.5 rounded hover:bg-gray-100"
                        >
                          <ChevronDown className="w-3.5 h-3.5" style={{ color: LABEL_COLOR }} />
                        </button>
                        {sortDropdownOpen && (
                          <div
                            className="absolute right-0 top-full mt-1 w-40 rounded-lg border bg-white py-1 z-10 shadow"
                            style={{ borderColor: '#e5e7eb' }}
                          >
                            <button
                              type="button"
                              onClick={() => { setSortBy('conversionRate'); setSortDropdownOpen(false); }}
                              className="block w-full text-left px-3 py-1.5 text-[10px] hover:bg-gray-50"
                            >
                              {t.reportsSortByConversion || 'Theo tỷ lệ chuyển đổi'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSortBy('nominations'); setSortDropdownOpen(false); }}
                              className="block w-full text-left px-3 py-1.5 text-[10px] hover:bg-gray-50"
                            >
                              {t.reportsSortByNominations || 'Theo số đơn tiến cử'}
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                  {loadingTop ? (
                    <tr><td colSpan={5} className="px-2 py-4 text-center" style={{ color: LABEL_COLOR }}>{t.loading || 'Đang tải...'}</td></tr>
                  ) : topCollaborators.length === 0 ? (
                    <tr><td colSpan={5} className="px-2 py-4 text-center" style={{ color: LABEL_COLOR }}>{t.reportsNoData || 'Chưa có dữ liệu'}</td></tr>
                  ) : (
                    topCollaborators.map((row, idx) => (
                      <tr key={row.collaboratorId || idx}>
                        <td className="px-2 py-1.5" style={{ color: VALUE_COLOR }}>{idx + 1}</td>
                        <td className="px-2 py-1.5" style={{ color: VALUE_COLOR }}>{row.collaboratorName || '—'}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{row.nominations ?? 0}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{row.naiteiCount ?? 0}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{row.conversionRate != null ? row.conversionRate + '%' : '0%'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* C. Hiệu suất Admin Backoffice */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold" style={{ color: VALUE_COLOR }}>
            {t.reportsAdminBackofficeTitle || 'C. Hiệu suất Admin Backoffice'}
          </h3>
          <div className="rounded-lg border overflow-hidden bg-white" style={{ borderColor: '#e5e7eb' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs">
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold" style={{ color: VALUE_COLOR }}>{t.reportsColAdminName || 'Tên Admin'}</th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>{t.reportsColFilesInProcess || 'Hồ sơ đang xử lý'}</th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>{t.reportsColInterviews || 'Số buổi Phỏng vấn'}</th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>{t.reportsColNaitei || 'Số Naitei'}</th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>{t.reportsColNyusha || 'Số Nyusha'}</th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: VALUE_COLOR }}>{t.reportsColRevenue || 'Doanh thu mang về'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                  {loadingHr ? (
                    <tr><td colSpan={6} className="px-2 py-4 text-center" style={{ color: LABEL_COLOR }}>{t.loading || 'Đang tải...'}</td></tr>
                  ) : adminPerformance.length === 0 ? (
                    <tr><td colSpan={6} className="px-2 py-4 text-center" style={{ color: LABEL_COLOR }}>{t.reportsNoData || 'Chưa có dữ liệu'}</td></tr>
                  ) : (
                    adminPerformance.map((row) => (
                      <tr key={row.id}>
                        <td className="px-2 py-1.5" style={{ color: VALUE_COLOR }}>{row.name || '—'}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{row.filesInProcess ?? 0}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{row.interviewCount ?? 0}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{row.naiteiCount ?? 0}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{row.nyushaCount ?? 0}</td>
                        <td className="px-2 py-1.5 text-right" style={{ color: VALUE_COLOR }}>{formatMoney(row.revenue)}đ</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
