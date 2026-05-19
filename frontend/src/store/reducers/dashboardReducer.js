import {
  FETCH_DASHBOARD_REQUEST,
  FETCH_DASHBOARD_SUCCESS,
  FETCH_DASHBOARD_FAILURE,
  FETCH_DASHBOARD_CHART_REQUEST,
  FETCH_DASHBOARD_CHART_SUCCESS,
  FETCH_DASHBOARD_CHART_FAILURE,
} from '../actions/dashboardActions';

const initialState = {
  loading: false,
  error: null,
  overview: {},
  applicationsByStatus: {},
  chartData: {
    applications: [],
    loading: false,
    error: null,
  },
};

const dashboardReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_DASHBOARD_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_DASHBOARD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        overview: action.payload.overview || {},
        applicationsByStatus: action.payload.applicationsByStatus || {},
      };

    case FETCH_DASHBOARD_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case FETCH_DASHBOARD_CHART_REQUEST:
      return {
        ...state,
        chartData: {
          ...state.chartData,
          loading: true,
          error: null,
        },
      };

    case FETCH_DASHBOARD_CHART_SUCCESS:
      return {
        ...state,
        chartData: {
          ...state.chartData,
          loading: false,
          error: null,
          applications: action.payload.applications || [],
        },
      };

    case FETCH_DASHBOARD_CHART_FAILURE:
      return {
        ...state,
        chartData: {
          ...state.chartData,
          loading: false,
          error: action.payload,
        },
      };

    default:
      return state;
  }
};

export default dashboardReducer;

