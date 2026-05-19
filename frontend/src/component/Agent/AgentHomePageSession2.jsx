import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const chartHeight = 200;
const chartWidth = 520;
const padding = { left: 28, right: 28, top: 20, bottom: 36 };

const COLORS = {
  lineOffer: '#DC2626',
  lineRejection: '#374151',
  lineStroke: '#FFFFFF',
  cardBg: '#171717',
  cardText: '#FFFFFF',
  axisLabel: '#374151',
};

const DONUT_PALETTE = ['#DC2626', '#171717', '#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];

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

const AgentHomePageSession2 = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [donutData, setDonutData] = useState([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [chartData, setChartData] = useState({
    months: [],
    offerData: [],
    rejectionData: [],
  });

  useEffect(() => {
    loadChartData();
  }, [language]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const dateParams = {};
      if (filterStartDate) dateParams.startDate = filterStartDate;
      if (filterEndDate) dateParams.endDate = filterEndDate;

      const [categoryRes, offerRejectionRes] = await Promise.all([
        apiService.getCategoryDistribution(dateParams),
        apiService.getOfferRejectionStats({ type: 'month', ...dateParams })
      ]);

      let categories = categoryRes?.success && categoryRes?.data?.categories
        ? categoryRes.data.categories
        : [];
      if (!Array.isArray(categories)) {
        if (categories && typeof categories === 'object' && categories.id) {
          categories = [categories];
        } else {
          categories = [];
        }
      }

      if (Array.isArray(categories) && categories.length > 0) {
        const donutItems = categories.map((category, index) => ({
          label: category.name || '',
          value: parseInt(category.count || 0),
          color: DONUT_PALETTE[index % DONUT_PALETTE.length],
        })).filter(item => item.value > 0 && item.label);

        setDonutData(donutItems);
        setTotalApplications(donutItems.reduce((sum, item) => sum + item.value, 0));
      } else {
        setDonutData([]);
        setTotalApplications(0);
      }

      if (offerRejectionRes?.success && offerRejectionRes?.data) {
        const rawOffers = offerRejectionRes.data.offers;
        const rawRejections = offerRejectionRes.data.rejections;
        const offers = Array.isArray(rawOffers) ? rawOffers : (rawOffers ? [rawOffers] : []);
        const rejections = Array.isArray(rawRejections) ? rawRejections : (rawRejections ? [rawRejections] : []);

        const now = new Date();
        const sortedPeriods = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          sortedPeriods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const months = sortedPeriods.map(period => {
          if (period && period.includes('-')) {
            const [y, m] = period.split('-').map(Number);
            const date = new Date(y, m - 1, 1);
            return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : language === 'en' ? 'en-US' : 'ja-JP', { month: 'short' });
          }
          return period || '';
        });

        const offerData = sortedPeriods.map(period => {
          const offer = offers.find(o => o && o.period === period);
          return offer ? (parseInt(offer.count, 10) || 0) : 0;
        });
        const rejectionData = sortedPeriods.map(period => {
          const rejection = rejections.find(r => r && r.period === period);
          return rejection ? (parseInt(rejection.count, 10) || 0) : 0;
        });

        setChartData({ months, offerData, rejectionData });
      } else {
        setChartData({ months: [], offerData: [], rejectionData: [] });
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      setDonutData([]);
      setTotalApplications(0);
      setChartData({ months: [], offerData: [], rejectionData: [] });
    } finally {
      setLoading(false);
    }
  };

  const calculateArcSegments = (data, gapDegrees = 24) => {
    if (!data || data.length === 0) return [];
    const radius = 70;
    const centerX = 100;
    const centerY = 100;
    const strokeWidth = 20;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];
    const totalGaps = gapDegrees * data.length;
    const availableDegrees = 360 - totalGaps;
    let currentAngle = -90;
    const arcs = [];
    data.forEach((item) => {
      const sweepAngle = (item.value / total) * availableDegrees;
      const startAngleRad = (currentAngle * Math.PI) / 180;
      const endAngleRad = ((currentAngle + sweepAngle) * Math.PI) / 180;
      const largeArcFlag = sweepAngle > 180 ? 1 : 0;
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      arcs.push({
        path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        color: item.color,
        label: item.label,
        value: item.value,
        strokeWidth,
      });
      currentAngle += sweepAngle + gapDegrees;
    });
    return arcs;
  };

  const arcSegments = calculateArcSegments(donutData, 30);
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 mt-2 sm:mt-3 md:mt-4">
        <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 border border-gray-100">
          <div className="animate-pulse rounded-lg bg-gray-50 min-h-[200px]" />
        </div>
        <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 border border-gray-100">
          <div className="animate-pulse rounded-lg bg-gray-50 min-h-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 mt-2 sm:mt-3 md:mt-4">
      {/* Card 1: Phân bố theo nhóm ngành nghề */}
      <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 flex flex-col border border-gray-100 overflow-visible">
        <div className="mb-2 sm:mb-2.5">
          <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
            {t.agentHomeDistributionByCategory}
          </h3>
          <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
            {t.agentHomeDistributionByCategoryDesc}
          </p>
        </div>

        {donutData.length > 0 ? (
          <div className="flex flex-col items-center flex-1">
            <div className="relative mb-3 flex-shrink-0" style={{ padding: '8px', overflow: 'visible' }}>
              <svg width="200" height="200" viewBox="-20 -20 240 240" className="overflow-visible">
                {arcSegments.map((arc, index) => {
                  const isHovered = hoveredIndex === index;
                  return (
                    <g
                      key={index}
                      style={{
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: '100px 100px',
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <path
                        d={arc.path}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={isHovered ? arc.strokeWidth + 2 : arc.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-base sm:text-lg font-bold text-gray-900">{totalApplications}</p>
                <p className="text-[8px] sm:text-[9px] text-gray-500">{t.agentHomeApplications}</p>
              </div>
              {hoveredIndex !== null && hoveredIndex < donutData.length && (
                <div
                  className="absolute rounded-md shadow-lg z-10 pointer-events-none px-2.5 py-1.5"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -130%)',
                    minWidth: '100px',
                    backgroundColor: COLORS.cardBg,
                    color: COLORS.cardText,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: donutData[hoveredIndex].color }}
                    />
                    <span className="text-[9px] sm:text-[10px] font-medium">{donutData[hoveredIndex].label}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs font-bold">{donutData[hoveredIndex].value}</span>
                    <span className="text-[9px] text-gray-300">
                      {totalApplications > 0 ? ((donutData[hoveredIndex].value / totalApplications) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 w-full mt-auto">
              {donutData.slice(0, 3).map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[9px] font-medium text-gray-900">{item.value}</span>
                  </div>
                  <span className="text-[8px] text-center leading-tight text-gray-500 truncate w-full">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 min-h-[200px] text-gray-500 text-[11px] sm:text-xs">
            {t.noData}
          </div>
        )}
      </div>

      {/* Card 2: Offer & Rejection */}
      <div className="bg-white rounded sm:rounded-lg p-2 sm:p-2.5 md:p-3 lg:p-4 flex flex-col border border-gray-100 overflow-visible">
        <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
          <div className="min-w-0">
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-900">
              {t.agentHomeOffersRejections}
            </h3>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500">
              {t.agentHomeOffered} / {t.agentHomeRejected}
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterPanel((v) => !v)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium rounded-2xl border border-red-200 bg-white hover:border-red-400 hover:bg-red-50 transition-colors"
            >
              <Filter className="w-3 h-3 text-red-500" />
              {t.filters || 'Bộ lọc'}
            </button>
            {showFilterPanel && (
              <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-gray-200 shadow-lg p-3 min-w-[220px] bg-white">
                <p className="text-[9px] font-semibold text-gray-700 mb-2">{t.agentHomeFilterByDate}</p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[8px] mb-0.5 text-gray-500">{t.agentHomeStartDate}</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-[10px] border border-gray-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] mb-0.5 text-gray-500">{t.agentHomeEndDate}</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-[10px] border border-gray-200 rounded"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setShowFilterPanel(false);
                        loadChartData();
                      }}
                      className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded border border-gray-200 text-gray-600"
                    >
                      {t.agentHomeClear}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFilterPanel(false);
                        loadChartData();
                      }}
                      className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      {t.agentHomeApply}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: COLORS.lineOffer }} />
            <span className="text-[9px] text-gray-500">{t.agentHomeOffered}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: COLORS.lineRejection }} />
            <span className="text-[9px] text-gray-500">{t.agentHomeRejected}</span>
          </div>
        </div>

        {chartData.months.length > 0 ? (
          <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[160px] lg:min-h-[200px]">
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
                  {(() => {
                    const maxValue = Math.max(...chartData.offerData, ...chartData.rejectionData, 1);
                    const n = chartData.months.length;
                    const step = n > 1 ? innerWidth / (n - 1) : innerWidth;
                    const getX = (index) => padding.left + index * step;
                    const getY = (value) => padding.top + innerHeight - (maxValue > 0 ? (value / maxValue) * innerHeight : 0);

                    const offerPoints = chartData.months.map((_, i) => [getX(i), getY(chartData.offerData[i] || 0)]);
                    const rejectionPoints = chartData.months.map((_, i) => [getX(i), getY(chartData.rejectionData[i] || 0)]);
                    const offerPath = buildSmoothPath(offerPoints);
                    const rejectionPath = buildSmoothPath(rejectionPoints);

                    return (
                      <>
                        <path d={offerPath} fill="none" stroke={COLORS.lineOffer} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={rejectionPath} fill="none" stroke={COLORS.lineRejection} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {chartData.months.map((_, index) => {
                          const x = getX(index);
                          const offerY = getY(chartData.offerData[index] || 0);
                          const isHovered = hoveredPointIndex === index;
                          const cardW = 120;
                          const cardH = 44;
                          const showAbove = offerY > padding.top + innerHeight / 2;
                          const tooltipY = showAbove ? offerY - cardH - 8 : offerY + 12;
                          return (
                            <g key={`point-${index}`}>
                              <circle
                                cx={x}
                                cy={offerY}
                                r={10}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredPointIndex(index)}
                                onMouseLeave={() => setHoveredPointIndex(null)}
                              />
                              {isHovered && (
                                <>
                                  <circle cx={x} cy={offerY} r={4} fill={COLORS.lineOffer} stroke={COLORS.lineStroke} strokeWidth={1.5} />
                                  <circle cx={x} cy={getY(chartData.rejectionData[index] || 0)} r={4} fill={COLORS.lineRejection} stroke={COLORS.lineStroke} strokeWidth={1.5} />
                                  <g>
                                    <rect x={x - cardW / 2} y={tooltipY} width={cardW} height={cardH} fill={COLORS.cardBg} rx="6" ry="6" />
                                    <text x={x} y={tooltipY + 14} fill={COLORS.cardText} fontSize="10" fontWeight="600" textAnchor="middle">
                                      {chartData.months[index]}
                                    </text>
                                    <text x={x} y={tooltipY + 26} fill={COLORS.cardText} fontSize="9" textAnchor="middle">
                                      {t.agentHomeOfferLabel} {chartData.offerData[index]}
                                    </text>
                                    <text x={x} y={tooltipY + 36} fill={COLORS.cardText} fontSize="9" textAnchor="middle">
                                      {t.agentHomeRejectLabel} {chartData.rejectionData[index]}
                                    </text>
                                  </g>
                                </>
                              )}
                            </g>
                          );
                        })}
                        {chartData.months.map((month, index) => (
                          <text
                            key={`label-${index}`}
                            x={getX(index)}
                            y={chartHeight - 12}
                            textAnchor="middle"
                            fill={COLORS.axisLabel}
                            fontSize="10"
                          >
                            {month}
                          </text>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-[160px] text-gray-500 text-[11px] sm:text-xs rounded-lg bg-gray-50">
            {t.noData}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentHomePageSession2;
