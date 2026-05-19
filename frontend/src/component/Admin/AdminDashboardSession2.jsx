import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, BarChart3, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api.js';

const chartHeight = 200;
const chartWidth = 520;
const padding = { left: 28, right: 28, top: 20, bottom: 36 };

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const COLORS = {
  linePrimary: '#DC2626',
  lineStroke: '#FFFFFF',
  stackedApproved: '#DC2626',
  stackedPending: '#171717',
  stackedRejected: '#F5F5F5',
  stackedRejectedStroke: '#E5E5E5',
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

const MonthPickerInput = forwardRef(({ value, onClick, label }, ref) => (
  <button
    type="button"
    ref={ref}
    onClick={onClick}
    className="flex items-center justify-between w-36 sm:w-40 px-2.5 py-1.5 rounded-2xl border border-red-200 bg-white hover:border-red-400 hover:bg-red-50 transition-colors text-left"
  >
    <div className="flex items-center gap-2 overflow-hidden">
      <div className="w-7 h-7 rounded-full border border-red-200 flex items-center justify-center text-red-500 bg-red-50 flex-shrink-0">
        <Calendar className="w-3.5 h-3.5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-gray-400 truncate">
          {label || 'Select month'}
        </span>
        <span className="text-xs font-medium text-gray-900 truncate">
          {value || '--/----'}
        </span>
      </div>
    </div>
    <ChevronDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
  </button>
));

const AdminDashboardSession2 = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [month, setMonth] = useState(getCurrentMonth());
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [loadingReg, setLoadingReg] = useState(true);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [registrations, setRegistrations] = useState({
    labels: [],
    data: [],
    total: 0,
    month: getCurrentMonth(),
  });
  const [approvals, setApprovals] = useState({
    labels: [],
    approved: [],
    pending: [],
    rejected: [],
    month: getCurrentMonth(),
  });
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  // Cập nhật month (YYYY-MM) mỗi khi chọn tháng mới
  useEffect(() => {
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = selectedDate.getMonth() + 1;
      setMonth(`${y}-${String(m).padStart(2, '0')}`);
    }
  }, [selectedDate]);

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoadingReg(true);
      const response = await apiService.getAdminDashboardRegistrationsOverTime(month);
      if (response.success && response.data) {
        setRegistrations({
          labels: response.data.labels || [],
          data: response.data.data || [],
          total: response.data.total ?? 0,
          month: response.data.month || month,
        });
      } else {
        setRegistrations({ labels: [], data: [], total: 0, month });
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setRegistrations({ labels: [], data: [], total: 0, month });
    } finally {
      setLoadingReg(false);
    }
  }, [month]);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoadingApprovals(true);
      const response = await apiService.getAdminDashboardApprovalsByDay(month);
      if (response.success && response.data) {
        setApprovals({
          labels: response.data.labels || [],
          approved: response.data.approved || [],
          pending: response.data.pending || [],
          rejected: response.data.rejected || [],
          month: response.data.month || month,
        });
      } else {
        setApprovals({
          labels: [], approved: [], pending: [], rejected: [], month,
        });
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
      setApprovals({
        labels: [], approved: [], pending: [], rejected: [], month,
      });
    } finally {
      setLoadingApprovals(false);
    }
  }, [month]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const { labels: regLabels, data: regData, total: regTotal } = registrations;
  const n = regLabels.length;
  const maxReg = Math.max(...regData, 1);
  const step = n > 1 ? innerWidth / (n - 1) : innerWidth;
  const getX = (index) => padding.left + index * step;
  const getRegY = (value) =>
    padding.top + innerHeight - (maxReg > 0 ? (value / maxReg) * innerHeight : 0);

  const linePoints = regLabels.map((_, i) => [getX(i), getRegY(regData[i] || 0)]);
  const linePath = buildSmoothPath(linePoints);

  const {
    labels: appLabels,
    approved: appApproved,
    pending: appPending,
    rejected: appRejected,
  } = approvals;
  const appN = appLabels.length;
  const appStep = appN > 0 ? innerWidth / appN : 0;
  const appMax = Math.max(
    ...appApproved.map((a, i) => (a || 0) + (appPending[i] || 0) + (appRejected[i] || 0)),
    1
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 mt-2 sm:mt-3 md:mt-4 items-stretch">
      {/* Panel 1: Số lượt đăng ký hệ thống – Line chart cong, lọc theo tháng */}
      <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 flex flex-col overflow-visible">
        <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
          <div className="min-w-0">
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {t.adminDashboardSystemRegistrations}
            </h3>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.adminDashboardSystemRegistrationsDesc}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => {
                if (date) {
                  const d = new Date(date.getFullYear(), date.getMonth(), 1);
                  setSelectedDate(d);
                }
              }}
              dateFormat="MM.yyyy"
              showMonthYearPicker
              showPopperArrow={false}
              calendarClassName="react-datepicker-admin-dashboard"
              customInput={(
                <MonthPickerInput label="Select month" />
              )}
            />
            <button type="button" className="text-gray-400 hover:text-gray-600 p-0.5 shrink-0">
              <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
        <div className="mb-1.5 sm:mb-2">
          <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
            {regTotal.toLocaleString('en-US')}
          </p>
          <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-500">
            {t.adminDashboardTotalRegistrations}
          </p>
        </div>

        <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[200px]">
          {loadingReg ? (
            <div className="flex-1 flex items-center justify-center rounded-lg animate-pulse bg-gray-50 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]" />
          ) : regLabels.length > 0 ? (
            <div className="w-full overflow-visible pt-6 sm:pt-8 md:pt-10 -mt-6 sm:-mt-8 md:-mt-10 flex-1 flex flex-col min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
              <div className="flex-1 h-[120px] sm:h-[140px] md:h-[160px] lg:h-[180px] min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="block overflow-visible"
                  style={{ overflow: 'visible', minHeight: 120 }}
                >
                  <path
                    key={registrations.month}
                    d={linePath}
                    fill="none"
                    stroke={COLORS.linePrimary}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="dashboard-line-path"
                  />
                  {regLabels.map((_, index) => {
                    const x = getX(index);
                    const y = getRegY(regData[index] || 0);
                    const isHovered = hoveredPointIndex === index;
                    const count = regData[index] ?? 0;
                    const cardW = 140;
                    const cardH = 36;
                    const showAbove = y > padding.top + innerHeight / 2;
                    const tooltipY = showAbove ? y - cardH - 8 : y + 12;
                    return (
                      <g key={`point-${index}`}>
                        {/* Invisible hit area for hover */}
                        <circle
                          cx={x}
                          cy={y}
                          r={10}
                          fill="transparent"
                          stroke="none"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredPointIndex(index)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                        />
                        {/* Visible dot only when hovered */}
                        {isHovered && (
                          <circle
                            cx={x}
                            cy={y}
                            r={4}
                            fill={COLORS.linePrimary}
                            stroke={COLORS.lineStroke}
                            strokeWidth={1.5}
                          />
                        )}
                        {isHovered && (
                          <g>
                            <rect
                              x={x - cardW / 2}
                              y={tooltipY}
                              width={cardW}
                              height={cardH}
                              fill={COLORS.cardBg}
                              rx="6"
                              ry="6"
                            />
                            <text
                              x={x}
                              y={tooltipY + (showAbove ? cardH / 2 + 4 : 14)}
                              fill={COLORS.cardText}
                              fontSize="12"
                              fontWeight="500"
                              textAnchor="middle"
                            >
                              {t.adminDashboardRegistrationsCountLabel}: {count}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                  {regLabels.map((label, index) => (
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
            <div className="flex-1 flex items-center justify-center text-gray-500 text-[11px] sm:text-xs md:text-sm rounded-lg bg-gray-50 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
              {t.adminDashboardNoRegistrationData}
            </div>
          )}
        </div>
      </div>

      {/* Panel 2: Số lượt phê duyệt đăng ký – Stacked bar theo ngày + hover card */}
      <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 flex flex-col overflow-visible">
        <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
          <div className="min-w-0">
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {t.adminDashboardApprovalsByDay}
            </h3>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.adminDashboardApprovalsByDayDesc}
            </p>
          </div>
          <button type="button" className="text-gray-400 hover:text-gray-600 p-0.5 shrink-0">
            <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
        {/* Spacer để 2 card cùng chiều cao (card trái có filter + total, card phải không) */}
        <div className="min-h-[44px] sm:min-h-[52px] md:min-h-[64px]" aria-hidden="true" />

        <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[200px]">
          {loadingApprovals ? (
            <div className="flex-1 flex items-center justify-center rounded-lg animate-pulse bg-gray-50 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]" />
          ) : appLabels.length > 0 ? (
            <div className="w-full overflow-visible pt-6 sm:pt-8 md:pt-10 -mt-6 sm:-mt-8 md:-mt-10 flex-1 flex flex-col min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
              <div className="flex-1 h-[120px] sm:h-[140px] md:h-[160px] lg:h-[180px] min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="block overflow-visible"
                  style={{ overflow: 'visible', minHeight: 120 }}
                >
                  {/* Bars */}
                  {appLabels.map((label, i) => {
                    const a = appApproved[i] || 0;
                    const p = appPending[i] || 0;
                    const r = appRejected[i] || 0;
                    const barW = Math.max(6, appStep * 0.55);
                    const barX = padding.left + (i + 0.5) * appStep - barW / 2;
                    const hApproved = appMax > 0 ? (a / appMax) * innerHeight : 0;
                    const hPending = appMax > 0 ? (p / appMax) * innerHeight : 0;
                    const hRejected = appMax > 0 ? (r / appMax) * innerHeight : 0;
                    const yApproved = padding.top + innerHeight - hApproved - hPending - hRejected;
                    const yPending = yApproved + hApproved;
                    const yRejected = yPending + hPending;
                    const barCenterX = padding.left + (i + 0.5) * appStep;
                    return (
                      <g
                        key={`bar-${i}`}
                        onMouseEnter={() => setHoveredBarIndex(i)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={barX - 4}
                          y={padding.top}
                          width={barW + 8}
                          height={innerHeight}
                          fill="transparent"
                        />
                        <rect
                          x={barX}
                          y={yApproved}
                          width={barW}
                          height={hApproved}
                          rx="3"
                          ry="3"
                          fill={COLORS.stackedApproved}
                        />
                        <rect
                          x={barX}
                          y={yPending}
                          width={barW}
                          height={hPending}
                          rx="3"
                          ry="3"
                          fill={COLORS.stackedPending}
                        />
                        <rect
                          x={barX}
                          y={yRejected}
                          width={barW}
                          height={hRejected}
                          rx="3"
                          ry="3"
                          fill={COLORS.stackedRejected}
                          stroke={COLORS.stackedRejectedStroke}
                          strokeWidth="1"
                        />
                        <text
                          x={barCenterX}
                          y={chartHeight - 12}
                          textAnchor="middle"
                          fill={COLORS.axisLabel}
                          fontSize="10"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                  {/* Tooltip drawn on top of all bars */}
                  {hoveredBarIndex !== null && hoveredBarIndex >= 0 && hoveredBarIndex < appLabels.length && (() => {
                    const i = hoveredBarIndex;
                    const label = appLabels[i];
                    const a = appApproved[i] || 0;
                    const p = appPending[i] || 0;
                    const r = appRejected[i] || 0;
                    const barCenterX = padding.left + (i + 0.5) * appStep;
                    const cardW = 140;
                    const cardH = 58;
                    const cardX = barCenterX - cardW / 2;
                    const showTooltipAbove = i >= appN / 2;
                    const cardY = showTooltipAbove
                      ? Math.max(8, padding.top - cardH - 10)
                      : chartHeight - cardH - 22;
                    return (
                      <g>
                        <rect
                          x={cardX}
                          y={cardY}
                          width={cardW}
                          height={cardH}
                          fill={COLORS.cardBg}
                          rx="6"
                          ry="6"
                        />
                        <text
                          x={barCenterX}
                          y={cardY + 15}
                          fill={COLORS.cardText}
                          fontSize="11"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {t.adminDashboardApprovalCardDay} {label}
                        </text>
                        <circle
                          cx={cardX + 10}
                          cy={cardY + 27}
                          r={3}
                          fill={COLORS.stackedApproved}
                        />
                        <text
                          x={cardX + 18}
                          y={cardY + 29}
                          fill={COLORS.cardText}
                          fontSize="9"
                          textAnchor="start"
                        >
                          {t.adminDashboardApprovedLabel}: {a}
                        </text>
                        <circle
                          cx={cardX + 10}
                          cy={cardY + 39}
                          r={3}
                          fill={COLORS.stackedPending}
                        />
                        <text
                          x={cardX + 18}
                          y={cardY + 41}
                          fill={COLORS.cardText}
                          fontSize="9"
                          textAnchor="start"
                        >
                          {t.adminDashboardPendingLabel}: {p}
                        </text>
                        <circle
                          cx={cardX + 10}
                          cy={cardY + 51}
                          r={3}
                          fill={COLORS.stackedRejected}
                        />
                        <text
                          x={cardX + 18}
                          y={cardY + 53}
                          fill={COLORS.cardText}
                          fontSize="9"
                          textAnchor="start"
                        >
                          {t.adminDashboardRejectedLabel}: {r}
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-[11px] sm:text-xs md:text-sm rounded-lg bg-gray-50 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
              {t.adminDashboardNoApprovalData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardSession2;
