/**
 * Dashboard Actions
 */
export const FETCH_DASHBOARD_REQUEST = 'FETCH_DASHBOARD_REQUEST';
export const FETCH_DASHBOARD_SUCCESS = 'FETCH_DASHBOARD_SUCCESS';
export const FETCH_DASHBOARD_FAILURE = 'FETCH_DASHBOARD_FAILURE';

export const FETCH_DASHBOARD_CHART_REQUEST = 'FETCH_DASHBOARD_CHART_REQUEST';
export const FETCH_DASHBOARD_CHART_SUCCESS = 'FETCH_DASHBOARD_CHART_SUCCESS';
export const FETCH_DASHBOARD_CHART_FAILURE = 'FETCH_DASHBOARD_CHART_FAILURE';

/**
 * Fetch dashboard data
 */
export const fetchDashboard = () => ({
  type: FETCH_DASHBOARD_REQUEST,
});

/**
 * Fetch dashboard chart data
 */
export const fetchDashboardChart = (params = {}) => ({
  type: FETCH_DASHBOARD_CHART_REQUEST,
  payload: params,
});

