import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const chartHeight = 200;
const chartWidth = 520;
const padding = { left: 28, right: 28, top: 20, bottom: 36 };

const COLORS = {
  lineSuccess: '#2563EB',
  lineFailed: '#DC2626',
  lineStroke: '#FFFFFF',
  barWithNomination: '#2563EB',
  barWithoutNomination: '#E5E7EB',
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

const AdminDashboardSession4 = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const [loadingNomination, setLoadingNomination] = useState(true);
  const [loadingJobNomination, setLoadingJobNomination] = useState(true);

  const [nominationStats, setNominationStats] = useState({
    labels: [],
    success: [],
    failed: [],
    totalSuccess: 0,
    totalFailed: 0,
    year: currentYear,
  });

  const [jobNominationStats, setJobNominationStats] = useState({
    labels: [],
    withNomination: [],
    withoutNomination: [],
    year: currentYear,
  });

  const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);
  const [hoveredJobMonthIndex, setHoveredJobMonthIndex] = useState(null);

  const fetchNominationOverTime = useCallback(async () => {
    try {
      setLoadingNomination(true);
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const response = await apiService.getAdminDashboardNominationOverTime({ startDate, endDate });
      if (response.success && response.data) {
        const {
          labels: apiLabels = [],
          success: apiSuccess = [],
          failed: apiFailed = [],
          totalSuccess = 0,
          totalFailed = 0,
        } = response.data;
        setNominationStats({
          labels: apiLabels,
          success: apiSuccess,
          failed: apiFailed,
          totalSuccess,
          totalFailed,
          year,
        });
      } else {
        setNominationStats({
          labels: [],
          success: [],
          failed: [],
          totalSuccess: 0,
          totalFailed: 0,
          year,
        });
      }
    } catch (error) {
      console.error('Error fetching nomination over time:', error);
      setNominationStats({
        labels: [],
        success: [],
        failed: [],
        totalSuccess: 0,
        totalFailed: 0,
        year,
      });
    } finally {
      setLoadingNomination(false);
    }
  }, [year]);

  const fetchJobNominationByMonth = useCallback(async () => {
    try {
      setLoadingJobNomination(true);
      const response = await apiService.getAdminDashboardJobNominationByMonth({ year });
      if (response.success && response.data) {
        const {
          labels = [],
          withNomination = [],
          withoutNomination = [],
          year: responseYear,
        } = response.data;
        setJobNominationStats({
          labels,
          withNomination,
          withoutNomination,
          year: responseYear || year,
        });
      } else {
        setJobNominationStats({
          labels: [],
          withNomination: [],
          withoutNomination: [],
          year,
        });
      }
    } catch (error) {
      console.error('Error fetching job nomination stats:', error);
      setJobNominationStats({
        labels: [],
        withNomination: [],
        withoutNomination: [],
        year,
      });
    } finally {
      setLoadingJobNomination(false);
    }
  }, [year]);

  useEffect(() => {
    fetchNominationOverTime();
    fetchJobNominationByMonth();
  }, [fetchNominationOverTime, fetchJobNominationByMonth]);

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const nominationMax = Math.max(
    ...(nominationStats.success.length ? nominationStats.success : [0]),
    ...(nominationStats.failed.length ? nominationStats.failed : [0]),
    1,
  );
  const nominationCount = nominationStats.labels.length;
  const nominationStep = nominationCount > 1
    ? innerWidth / (nominationCount - 1)
    : innerWidth;

  const getNominationX = (index) => padding.left + index * nominationStep;
  const getNominationY = (value) =>
    padding.top + innerHeight - (nominationMax > 0 ? (value / nominationMax) * innerHeight : 0);

  const successPoints = nominationStats.labels.map((_, i) => [
    getNominationX(i),
    getNominationY(nominationStats.success[i] || 0),
  ]);
  const failedPoints = nominationStats.labels.map((_, i) => [
    getNominationX(i),
    getNominationY(nominationStats.failed[i] || 0),
  ]);

  const successPath = buildSmoothPath(successPoints);
  const failedPath = buildSmoothPath(failedPoints);

  const jobCount = jobNominationStats.labels.length;
  const jobStep = jobCount > 0 ? innerWidth / jobCount : 0;
  const jobMax = Math.max(
    ...(jobNominationStats.withNomination.length ? jobNominationStats.withNomination : [0]),
    ...(jobNominationStats.withoutNomination.length ? jobNominationStats.withoutNomination : [0]),
    1,
  );

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 mt-2 sm:mt-3 md:mt-4 items-stretch">
      <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 flex flex-col overflow-visible">
        <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
          <div className="min-w-0">
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {t.adminDashboardNominationOverTimeTitle || 'Đơn tiến cử thành công / thất bại theo tháng'}
            </h3>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.adminDashboardNominationOverTimeDesc || 'Thống kê 12 tháng trong năm theo trạng thái đơn tiến cử.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              className="h-8 px-2 rounded-2xl border border-red-200 text-[11px] sm:text-xs text-gray-700 bg-white hover:border-red-400 focus:outline-none focus:ring-0"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" className="text-gray-400 hover:text-gray-600 p-0.5 shrink-0">
              <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        <div className="mb-1.5 sm:mb-2 flex flex-wrap items-center gap-2">
          <div>
            <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
              {nominationStats.totalSuccess.toLocaleString('en-US')}
            </p>
            <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-500">
              {t.adminDashboardNominationSuccessLabel || 'Tổng đơn tiến cử thành công'}
            </p>
          </div>
          <div>
            <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
              {nominationStats.totalFailed.toLocaleString('en-US')}
            </p>
            <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-500">
              {t.adminDashboardNominationFailedLabel || 'Tổng đơn tiến cử thất bại'}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[200px]">
          {loadingNomination ? (
            <div className="flex-1 flex items-center justify-center rounded-lg animate-pulse bg-gray-50 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]" />
          ) : nominationStats.labels.length > 0 ? (
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
                    d={successPath}
                    fill="none"
                    stroke={COLORS.lineSuccess}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={failedPath}
                    fill="none"
                    stroke={COLORS.lineFailed}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {nominationStats.labels.map((_, index) => {
                    const x = getNominationX(index);
                    const successY = getNominationY(nominationStats.success[index] || 0);
                    const failedY = getNominationY(nominationStats.failed[index] || 0);
                    const isHovered = hoveredMonthIndex === index;
                    const successCount = nominationStats.success[index] ?? 0;
                    const failedCount = nominationStats.failed[index] ?? 0;
                    const maxY = Math.min(successY, failedY);
                    const cardW = 170;
                    const cardH = 48;
                    const showAbove = maxY > padding.top + innerHeight / 2;
                    const tooltipY = showAbove ? maxY - cardH - 8 : maxY + 12;

                    return (
                      <g key={`nomination-point-${index}`}>
                        <circle
                          cx={x}
                          cy={successY}
                          r={10}
                          fill="transparent"
                          stroke="none"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredMonthIndex(index)}
                          onMouseLeave={() => setHoveredMonthIndex(null)}
                        />
                        {isHovered && (
                          <>
                            <circle
                              cx={x}
                              cy={successY}
                              r={4}
                              fill={COLORS.lineSuccess}
                              stroke={COLORS.lineStroke}
                              strokeWidth={1.5}
                            />
                            <circle
                              cx={x}
                              cy={failedY}
                              r={4}
                              fill={COLORS.lineFailed}
                              stroke={COLORS.lineStroke}
                              strokeWidth={1.5}
                            />
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
                                y={tooltipY + 15}
                                fill={COLORS.cardText}
                                fontSize="11"
                                fontWeight="600"
                                textAnchor="middle"
                              >
                                {nominationStats.labels[index]}
                              </text>
                              <circle cx={x - cardW / 2 + 10} cy={tooltipY + 27} r={3} fill={COLORS.lineSuccess} />
                              <text
                                x={x - cardW / 2 + 18}
                                y={tooltipY + 29}
                                fill={COLORS.cardText}
                                fontSize="9"
                                textAnchor="start"
                              >
                                {(t.adminDashboardNominationSuccessShort || 'Thành công')}: {successCount}
                              </text>
                              <circle cx={x - cardW / 2 + 10} cy={tooltipY + 39} r={3} fill={COLORS.lineFailed} />
                              <text
                                x={x - cardW / 2 + 18}
                                y={tooltipY + 41}
                                fill={COLORS.cardText}
                                fontSize="9"
                                textAnchor="start"
                              >
                                {(t.adminDashboardNominationFailedShort || 'Thất bại')}: {failedCount}
                              </text>
                            </g>
                          </>
                        )}
                      </g>
                    );
                  })}
                  {nominationStats.labels.map((label, index) => (
                    <text
                      key={`nomination-label-${index}`}
                      x={getNominationX(index)}
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
              {t.adminDashboardNoNominationData || 'Không có dữ liệu đơn tiến cử cho năm này.'}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 flex flex-col overflow-visible">
        <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
          <div className="min-w-0">
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {t.adminDashboardJobNominationByMonthTitle || 'Số lượng job có / không có đơn tiến cử theo tháng'}
            </h3>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.adminDashboardJobNominationByMonthDesc || 'So sánh số lượng job có ít nhất một đơn tiến cử và không có đơn nào.'}
            </p>
          </div>
          <button type="button" className="text-gray-400 hover:text-gray-600 p-0.5 shrink-0">
            <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        <div className="min-h-[44px] sm:min-h-[52px] md:min-h-[64px]" aria-hidden="true" />

        <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[200px]">
          {loadingJobNomination ? (
            <div className="flex-1 flex items-center justify-center rounded-lg animate-pulse bg-gray-50 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]" />
          ) : jobNominationStats.labels.length > 0 ? (
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
                  {jobNominationStats.labels.map((label, i) => {
                    const withValue = jobNominationStats.withNomination[i] || 0;
                    const withoutValue = jobNominationStats.withoutNomination[i] || 0;
                    const groupWidth = jobStep * 0.8;
                    const barWidth = Math.max(6, groupWidth / 2.4);
                    const centerX = padding.left + (i + 0.5) * jobStep;
                    const baseX = centerX - barWidth - 2;
                    const baseX2 = centerX + 2;

                    const hWith = jobMax > 0 ? (withValue / jobMax) * innerHeight : 0;
                    const hWithout = jobMax > 0 ? (withoutValue / jobMax) * innerHeight : 0;

                    const yWith = padding.top + innerHeight - hWith;
                    const yWithout = padding.top + innerHeight - hWithout;

                    return (
                      <g
                        key={`job-bar-${i}`}
                        onMouseEnter={() => setHoveredJobMonthIndex(i)}
                        onMouseLeave={() => setHoveredJobMonthIndex(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={centerX - groupWidth / 2}
                          y={padding.top}
                          width={groupWidth}
                          height={innerHeight}
                          fill="transparent"
                        />
                        <rect
                          x={baseX}
                          y={yWith}
                          width={barWidth}
                          height={hWith}
                          rx="3"
                          ry="3"
                          fill={COLORS.barWithNomination}
                        />
                        <rect
                          x={baseX2}
                          y={yWithout}
                          width={barWidth}
                          height={hWithout}
                          rx="3"
                          ry="3"
                          fill={COLORS.barWithoutNomination}
                        />
                        <text
                          x={centerX}
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

                  {hoveredJobMonthIndex !== null
                    && hoveredJobMonthIndex >= 0
                    && hoveredJobMonthIndex < jobNominationStats.labels.length && (() => {
                      const i = hoveredJobMonthIndex;
                      const label = jobNominationStats.labels[i];
                      const withValue = jobNominationStats.withNomination[i] || 0;
                      const withoutValue = jobNominationStats.withoutNomination[i] || 0;
                      const centerX = padding.left + (i + 0.5) * jobStep;
                      const cardW = 170;
                      const cardH = 48;
                      const showTooltipAbove = i >= jobCount / 2;
                      const cardX = centerX - cardW / 2;
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
                            x={centerX}
                            y={cardY + 15}
                            fill={COLORS.cardText}
                            fontSize="11"
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {label}
                          </text>
                          <circle cx={cardX + 10} cy={cardY + 27} r={3} fill={COLORS.barWithNomination} />
                          <text
                            x={cardX + 18}
                            y={cardY + 29}
                            fill={COLORS.cardText}
                            fontSize="9"
                            textAnchor="start"
                          >
                            {(t.adminDashboardJobWithNominationLabel || 'Job có đơn tiến cử')}: {withValue}
                          </text>
                          <circle cx={cardX + 10} cy={cardY + 39} r={3} fill={COLORS.barWithoutNomination} />
                          <text
                            x={cardX + 18}
                            y={cardY + 41}
                            fill={COLORS.cardText}
                            fontSize="9"
                            textAnchor="start"
                          >
                            {(t.adminDashboardJobWithoutNominationLabel || 'Job chưa có đơn tiến cử')}: {withoutValue}
                          </text>
                        </g>
                      );
                    })()}
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-[11px] sm:text-xs md:text-sm rounded-lg bg-gray-50 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
              {t.adminDashboardNoJobNominationData || 'Không có dữ liệu job theo đơn tiến cử cho năm này.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardSession4;