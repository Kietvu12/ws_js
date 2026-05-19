import React, { useState, useEffect } from 'react';
import { Trophy, Users, DollarSign, Briefcase, TrendingUp, TrendingDown, Minus, Calendar, Award } from 'lucide-react';


const CollaboratorRankingPage = () => {
  const [timeFilter, setTimeFilter] = useState('month'); // month, quarter, year
  const [rankingType, setRankingType] = useState('earnings'); // earnings, successfulCandidates
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
    totalCollaborators: 0,
    totalPaid: 0,
    totalCandidates: 0,
    totalJobs: 0,
  });
  const [topEarners, setTopEarners] = useState([]);
  const [topByApplications, setTopByApplications] = useState([]);

  useEffect(() => {
    loadData();
  }, [timeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, statsResponse] = await Promise.all([
        api.getAdminDashboard(),
        api.getCollaboratorStatistics({ limit: 10 })
      ]);

      if (dashboardResponse.success && dashboardResponse.data) {
        setSummaryData({
          totalCollaborators: dashboardResponse.data.collaborators?.total || 0,
          totalPaid: 0, // Cần tính từ payment requests
          totalCandidates: dashboardResponse.data.applications?.total || 0,
          totalJobs: dashboardResponse.data.jobs?.total || 0,
        });
      }

      if (statsResponse.success && statsResponse.data) {
        // Top by payments (earnings)
        const topPayments = (statsResponse.data.topByPayments || []).map((item, index) => ({
          id: item.id,
          name: item.name,
          code: `CTV${String(item.id).padStart(3, '0')}`,
          earnings: parseFloat(item.totalPaid || 0),
          candidates: parseInt(item.applicationsCount || 0),
          jobs: 0, // Cần tính từ job applications distinct jobId
        }));
        setTopEarners(topPayments);

        // Top by applications (successful candidates)
        const topApps = (statsResponse.data.topByApplications || []).map((item, index) => ({
          id: item.id,
          name: item.name,
          code: `CTV${String(item.id).padStart(3, '0')}`,
          applicationsCount: parseInt(item.applicationsCount || 0),
          candidates: parseInt(item.applicationsCount || 0),
          jobs: 0,
          earnings: 0,
        }));
        setTopByApplications(topApps);
      }
    } catch (error) {
      console.error('Error loading ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ranking data by earnings
  const rankingByEarnings = topEarners.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    code: item.code,
    candidates: item.candidates,
    successfulCandidates: Math.floor(item.candidates * 0.8), // Ước tính
    jobs: item.jobs,
    earnings: item.earnings,
    change: 0, // Cần tính từ dữ liệu lịch sử
    changeType: 'neutral',
  }));

  // Ranking data by successful candidates
  const rankingBySuccessfulCandidates = topByApplications.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    code: item.code,
    candidates: item.candidates,
    successfulCandidates: item.candidates,
    jobs: item.jobs,
    earnings: item.earnings,
    change: 0,
    changeType: 'neutral',
  }));

  const rankingData = rankingType === 'earnings' ? rankingByEarnings : rankingBySuccessfulCandidates;

  // Top CTV by successful candidates
  const topSuccessfulCandidates = topByApplications.map(item => ({
    id: item.id,
    name: item.name,
    code: item.code,
    successfulCandidates: item.applicationsCount,
    candidates: item.candidates,
    jobs: item.jobs,
  }));

  // Chart data for earnings
  const chartDataEarnings = topEarners.map(ctv => ({
    name: ctv.name.split(' ').pop(), // Last name only
    value: ctv.earnings,
    type: 'earnings',
  }));

  // Chart data for successful candidates
  const chartDataSuccessful = topSuccessfulCandidates.map(ctv => ({
    name: ctv.name.split(' ').pop(), // Last name only
    value: ctv.successfulCandidates,
    type: 'successful',
  }));

  const chartData = rankingType === 'earnings' ? chartDataEarnings : chartDataSuccessful;

  const maxValue = Math.max(...chartData.map(d => d.value));
  const chartHeight = 200;
  const chartWidth = 1000;
  const barWidth = 80;
  const barGap = 40;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-500';
    return 'text-gray-600';
  };

  const getMedalIcon = (rank) => {
    if (rank <= 3) return <Trophy className={`w-4 h-4 ${getMedalColor(rank)}`} />;
    return <span className="text-xs font-bold text-gray-600">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-lg p-8 border border-gray-200 text-center">
          <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bảng xếp hạng CTV</h1>
            <p className="text-xs text-gray-500">Thống kê và xếp hạng cộng tác viên</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setRankingType('earnings')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                rankingType === 'earnings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Theo doanh thu
            </button>
            <button
              onClick={() => setRankingType('successfulCandidates')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                rankingType === 'successfulCandidates'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Theo UV thành công
            </button>
          </div>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="month">Tháng này</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Tổng số CTV</p>
          <p className="text-xl font-bold text-gray-900">{summaryData.totalCollaborators}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Tổng tiền đã trả</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summaryData.totalPaid)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Tổng ứng viên</p>
          <p className="text-xl font-bold text-gray-900">{summaryData.totalCandidates.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Tổng job</p>
          <p className="text-xl font-bold text-gray-900">{summaryData.totalJobs.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Bar Chart - Top CTV */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            {rankingType === 'earnings' ? 'Top CTV theo doanh thu' : 'Top CTV theo số UV thành công'}
          </h3>
          <div className="overflow-x-auto">
            <svg width={chartWidth} height={chartHeight + 60} viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}>
              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const value = Math.round(maxValue * ratio);
                const y = chartHeight - (chartHeight * ratio) + 30;
                return (
                  <g key={i}>
                    <line
                      x1={0}
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={0}
                      y={y + 4}
                      className="text-[10px] fill-gray-500"
                      textAnchor="start"
                    >
                      {rankingType === 'earnings' 
                        ? formatCurrency(value)
                        : value
                      }
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {chartData.map((data, index) => {
                const barHeight = (data.value / maxValue) * chartHeight;
                const x = index * (barWidth + barGap) + 60;
                const y = chartHeight - barHeight + 30;
                return (
                  <g key={index}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={index < 3 ? '#3b82f6' : '#60a5fa'}
                      rx={4}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      className="text-[10px] fill-gray-700 font-semibold"
                      textAnchor="middle"
                    >
                      {rankingType === 'earnings' 
                        ? formatCurrency(data.value)
                        : data.value
                      }
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 50}
                      className="text-[10px] fill-gray-600"
                      textAnchor="middle"
                    >
                      {data.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Line Chart - Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Xu hướng tiến cử
          </h3>
          <div className="h-[260px] flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = 200 * ratio;
                return (
                  <line
                    key={i}
                    x1={0}
                    y1={y}
                    x2={400}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Data points */}
              <polyline
                points="40,160 100,140 160,120 220,100 280,90 340,80"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="40" cy="160" r="4" fill="#3b82f6" />
              <circle cx="100" cy="140" r="4" fill="#3b82f6" />
              <circle cx="160" cy="120" r="4" fill="#3b82f6" />
              <circle cx="220" cy="100" r="4" fill="#3b82f6" />
              <circle cx="280" cy="90" r="4" fill="#3b82f6" />
              <circle cx="340" cy="80" r="4" fill="#3b82f6" />

              {/* Labels */}
              {['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map((label, i) => {
                const x = 40 + i * 60;
                return (
                  <text
                    key={i}
                    x={x}
                    y={195}
                    className="text-[10px] fill-gray-600"
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Bảng xếp hạng chi tiết
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 border-b border-gray-200 w-16">Hạng</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 border-b border-gray-200">CTV</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900 border-b border-gray-200">Mã CTV</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-900 border-b border-gray-200">Tổng ứng viên</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-900 border-b border-gray-200">UV thành công</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-900 border-b border-gray-200">Số job</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-900 border-b border-gray-200">Tổng tiền</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-900 border-b border-gray-200">Thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rankingData.map((item) => (
                <tr key={item.rank} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {getMedalIcon(item.rank)}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[11px] font-medium text-gray-900">{item.name}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[11px] text-gray-600">{item.code}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-[11px] font-medium text-gray-900">{item.candidates}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-[11px] font-semibold text-blue-600">{item.successfulCandidates}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-[11px] font-medium text-gray-900">{item.jobs}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-[11px] font-medium text-gray-900">{formatCurrency(item.earnings)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {item.changeType === 'up' && (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-[11px] font-medium text-green-600">+{item.change}</span>
                        </>
                      )}
                      {item.changeType === 'down' && (
                        <>
                          <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-[11px] font-medium text-red-600">{item.change}</span>
                        </>
                      )}
                      {item.changeType === 'neutral' && (
                        <>
                          <Minus className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[11px] font-medium text-gray-400">0</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorRankingPage;
