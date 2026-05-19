import { call, put, takeEvery } from 'redux-saga/effects';
import apiService from '../../services/api';
import {
  FETCH_DASHBOARD_REQUEST,
  FETCH_DASHBOARD_SUCCESS,
  FETCH_DASHBOARD_FAILURE,
  FETCH_DASHBOARD_CHART_REQUEST,
  FETCH_DASHBOARD_CHART_SUCCESS,
  FETCH_DASHBOARD_CHART_FAILURE,
} from '../actions/dashboardActions';

/**
 * Fetch dashboard data saga
 */
function* fetchDashboardSaga() {
  try {
    const response = yield call(apiService.getDashboard);
    
    if (response.success && response.data) {
      yield put({
        type: FETCH_DASHBOARD_SUCCESS,
        payload: response.data,
      });
    } else {
      yield put({
        type: FETCH_DASHBOARD_FAILURE,
        payload: response.message || 'Failed to fetch dashboard data',
      });
    }
  } catch (error) {
    yield put({
      type: FETCH_DASHBOARD_FAILURE,
      payload: error.message || 'An error occurred while fetching dashboard data',
    });
  }
}

/**
 * Fetch dashboard chart data saga
 */
function* fetchDashboardChartSaga(action) {
  try {
    const response = yield call(apiService.getDashboardChart, action.payload);
    
    if (response.success && response.data) {
      yield put({
        type: FETCH_DASHBOARD_CHART_SUCCESS,
        payload: response.data,
      });
    } else {
      yield put({
        type: FETCH_DASHBOARD_CHART_FAILURE,
        payload: response.message || 'Failed to fetch chart data',
      });
    }
  } catch (error) {
    yield put({
      type: FETCH_DASHBOARD_CHART_FAILURE,
      payload: error.message || 'An error occurred while fetching chart data',
    });
  }
}

/**
 * Dashboard watcher saga
 */
export function* dashboardSaga() {
  yield takeEvery(FETCH_DASHBOARD_REQUEST, fetchDashboardSaga);
  yield takeEvery(FETCH_DASHBOARD_CHART_REQUEST, fetchDashboardChartSaga);
}

