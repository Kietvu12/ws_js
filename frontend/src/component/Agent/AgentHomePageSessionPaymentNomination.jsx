import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const chartHeight = 200;
const chartWidth = 520;
const padding = { left: 28, right: 28, top: 20, bottom: 36 };

const COLORS = {
  linePrimary: '#DC2626',
  lineStroke: '#FFFFFF',
  cardBg: '#171717',
  cardText: '#FFFFFF',
  axisLabel: '#374151',
};

function buildSmoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return d;
}

const AgentHomePageSessionPaymentNomination = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loadingPayment, setLoadingPayment] = useState(true);

  const { chartData } = useSelector((state) => state.dashboard || {});
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPayment(true);
        const res = await apiService.getPaymentRequests({ limit: 100 });
        const rows = res?.data?.rows ?? res?.data?.paymentRequests ?? (Array.isArray(res?.data) ? res.data : []);
        setPaymentRequests(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error('Error loading payment requests:', err);
        setPaymentRequests([]);
      } finally {
        setLoadingPayment(false);
      }
    };
    load();
  }, []);

  const paymentSummary = useMemo(() => {
    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    paymentRequests.forEach((req) => {
      total += 1;
      const s = req.status;
      if (s === 0) pending += 1;
      else if (s === 1) approved += 1;
      else if (s === 2) rejected += 1;
    });
    return { total, pending, approved, rejected };
  }, [paymentRequests]);

  const dailyPaidData = useMemo(() => {
    const map = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { label: key.slice(5).replace('-', '/'), amount: 0 });
    }
    paymentRequests.forEach((req) => {
      if (req.status !== 1 || !req.paidAt || !req.amount) return;
      const d = new Date(req.paidAt);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      if (map.has(key)) {
        const cur = map.get(key);
        cur.amount += Number(req.amount) || 0;
      }
    });
    return Array.from(map.values());
  }, [paymentRequests]);

  const applicationChartData = useMemo(() => {
    const apps = chartData?.applications;
    if (!apps || !apps.length) return { labels: [], data: [] };
    const last7 = apps.slice(-7);
    const labels = last7.map((item) => {
      const period = item.period || item.month;
      if (period && typeof period === 'string' && period.includes('-')) {
        const [y, m] = period.split('-').map(Number);
        const date = new Date(y, (m || 1) - 1, 1);
        return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : language === 'en' ? 'en-US' : 'ja-JP', { month: 'short' });
      }
      return period || '';
    });
    const data = last7.map((item) => item.count ?? 0);
    return { labels, data };
  }, [chartData?.applications, language]);

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const n = applicationChartData.labels.length;
  const maxApp = Math.max(...applicationChartData.data, 1);
  const step = n > 1 ? innerWidth / (n - 1) : innerWidth;
  const getX = (index) => padding.left + index * step;
  const getY = (value) => padding.top + innerHeight - (maxApp > 0 ? (value / maxApp) * innerHeight : 0);
  const linePoints = applicationChartData.labels.map((_, i) => [getX(i), getY(applicationChartData.data[i] || 0)]);
  const linePath = buildSmoothPath(linePoints);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 mt-2 sm:mt-3 md:mt-4">
      {/* Card 1: Yêu cầu thanh toán */}
      <div className="bg-white rounded-sm sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 border border-gray-100 flex flex-col">
        <div className="mb-2 sm:mb-2.5 flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {language === 'vi' ? 'Yêu cầu thanh toán của tôi' : language === 'en' ? 'My payment requests' : '支払いリクエスト'}
            </h3>
            <p className="text-[8px] sm:text-[9px] text-gray-500">
              {language === 'vi' ? 'Tổng quan và số tiền đã thanh toán' : language === 'en' ? 'Overview and paid amount' : '概要と支払済み金額'}
            </p>
          </div>
          <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
        </div>

        {loadingPayment ? (
          <div className="flex-1 flex items-center justify-center rounded-lg animate-pulse bg-gray-50 min-h-[140px]" />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3">
              {[
                { key: 'total', value: paymentSummary.total, label: language === 'vi' ? 'Tổng' : language === 'en' ? 'Total' : '合計' },
                { key: 'pending', value: paymentSummary.pending, label: language === 'vi' ? 'Chờ duyệt' : language === 'en' ? 'Pending' : '保留' },
                { key: 'approved', value: paymentSummary.approved, label: language === 'vi' ? 'Đã duyệt' : language === 'en' ? 'Approved' : '承認' },
                { key: 'rejected', value: paymentSummary.rejected, label: language === 'vi' ? 'Từ chối' : language === 'en' ? 'Rejected' : '拒否' },
              ].map(({ key, value, label }) => (
                <div key={key} className="bg-slate-50 rounded-lg p-1.5 sm:p-2 border border-slate-100">
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-900 truncate">{value}</p>
                  <p className="text-[7px] sm:text-[8px] text-gray-500 truncate">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex-1 flex flex-col min-h-[100px]">
              <p className="text-[8px] sm:text-[9px] text-gray-500 mb-1.5">
                {language === 'vi' ? 'Số tiền đã thanh toán (7 ngày gần nhất)' : language === 'en' ? 'Paid amount (last 7 days)' : '支払済み（過去7日間）'}
              </p>
              {dailyPaidData.every((d) => d.amount === 0) ? (
                <p className="text-[10px] sm:text-[11px] text-gray-500 text-center py-4">
                  {language === 'vi' ? 'Chưa có giao dịch đã thanh toán' : language === 'en' ? 'No paid transactions yet' : '支払い済み取引はありません'}
                </p>
              ) : (
                <div className="w-full flex items-end gap-1.5 sm:gap-2 h-28 sm:h-32">
                  {dailyPaidData.map((d) => {
                    const max = Math.max(...dailyPaidData.map((x) => x.amount), 1);
                    const h = (d.amount / max) * 100;
                    return (
                      <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div className="w-full bg-indigo-50 rounded-t-full flex items-end justify-center overflow-hidden">
                          <div
                            className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-full transition-all duration-300"
                            style={{ height: `${Math.max(h, 6)}%` }}
                          />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-gray-500">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Card 2: Đơn tiến cử theo tháng */}
      <div className="bg-white rounded-sm sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 border border-gray-100 flex flex-col overflow-visible">
        <div className="mb-2 sm:mb-2.5">
          <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
            {language === 'vi' ? 'Đơn tiến cử theo tháng' : language === 'en' ? 'Nominations by month' : '月別推薦'}
          </h3>
          <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
            {language === 'vi' ? 'Số đơn ứng tuyển 7 tháng gần nhất' : language === 'en' ? 'Applications in the last 7 months' : '過去7ヶ月の応募数'}
          </p>
        </div>
        <div className="mb-1.5 sm:mb-2">
          <p className="text-base sm:text-lg font-bold text-gray-900">
            {applicationChartData.data.reduce((a, b) => a + b, 0).toLocaleString('en-US')}
          </p>
          <p className="text-[10px] sm:text-[11px] text-gray-500">
            {language === 'vi' ? 'Tổng đơn' : language === 'en' ? 'Total' : '合計'}
          </p>
        </div>
        <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[160px] lg:min-h-[200px]">
          {applicationChartData.labels.length > 0 ? (
            <div className="w-full overflow-visible pt-6 sm:pt-8 md:pt-10 -mt-6 sm:-mt-8 md:-mt-10 flex-1">
              <div className="h-[120px] sm:h-[160px] lg:h-[180px] min-h-[120px]">
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="block overflow-visible"
                  style={{ minHeight: 120 }}
                >
                  <path
                    d={linePath}
                    fill="none"
                    stroke={COLORS.linePrimary}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {applicationChartData.labels.map((_, index) => {
                    const x = getX(index);
                    const y = getY(applicationChartData.data[index] || 0);
                    const isHovered = hoveredPointIndex === index;
                    const count = applicationChartData.data[index] ?? 0;
                    const cardW = 120;
                    const cardH = 36;
                    const showAbove = y > padding.top + innerHeight / 2;
                    const tooltipY = showAbove ? y - cardH - 8 : y + 12;
                    return (
                      <g key={`point-${index}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r={10}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredPointIndex(index)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                        />
                        {isHovered && (
                          <>
                            <circle cx={x} cy={y} r={4} fill={COLORS.linePrimary} stroke={COLORS.lineStroke} strokeWidth={1.5} />
                            <g>
                              <rect x={x - cardW / 2} y={tooltipY} width={cardW} height={cardH} fill={COLORS.cardBg} rx="6" ry="6" />
                              <text x={x} y={tooltipY + (showAbove ? cardH / 2 + 4 : 14)} fill={COLORS.cardText} fontSize="11" fontWeight="500" textAnchor="middle">
                                {applicationChartData.labels[index]}: {count}
                              </text>
                            </g>
                          </>
                        )}
                      </g>
                    );
                  })}
                  {applicationChartData.labels.map((label, index) => (
                    <text
                      key={`label-${index}`}
                      x={getX(index)}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      fill={COLORS.axisLabel}
                      fontSize="10"
                    >
                      {label}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-[11px] sm:text-xs rounded-lg bg-gray-50 min-h-[140px]">
              {language === 'vi' ? 'Chưa có dữ liệu đơn tiến cử' : language === 'en' ? 'No nomination data yet' : '推薦データがありません'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentHomePageSessionPaymentNomination;
