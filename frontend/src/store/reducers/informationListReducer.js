import {
  FETCH_INFORMATION_LIST_REQUEST,
  FETCH_INFORMATION_LIST_SUCCESS,
  FETCH_INFORMATION_LIST_FAILURE,
  FETCH_INFORMATION_LIST_MORE_REQUEST,
  FETCH_INFORMATION_LIST_MORE_SUCCESS,
  FETCH_INFORMATION_LIST_MORE_FAILURE,
  START_INFORMATION_LIST_POLLING,
  STOP_INFORMATION_LIST_POLLING
} from '../actions/informationListActions';

const initialState = {
  loading: false,
  loadingMore: false,
  data: [],
  pagination: {
    jobPickups: { total: 0, totalPages: 0 },
    campaigns: { total: 0, totalPages: 0 },
    posts: { total: 0, totalPages: 0 }
  },
  error: null,
  isPolling: false,
  pollingInterval: null
};

const informationListReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_INFORMATION_LIST_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case FETCH_INFORMATION_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        data: action.payload.data || [],
        pagination: action.payload.pagination || state.pagination,
        error: null
      };

    case FETCH_INFORMATION_LIST_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case FETCH_INFORMATION_LIST_MORE_REQUEST:
      return {
        ...state,
        loadingMore: true,
        error: null
      };

    case FETCH_INFORMATION_LIST_MORE_SUCCESS:
      return {
        ...state,
        loadingMore: false,
        data: [...state.data, ...(action.payload.data || [])],
        pagination: action.payload.pagination || state.pagination,
        error: null
      };

    case FETCH_INFORMATION_LIST_MORE_FAILURE:
      return {
        ...state,
        loadingMore: false,
        error: action.payload
      };

    case START_INFORMATION_LIST_POLLING:
      return {
        ...state,
        isPolling: true,
        pollingInterval: action.payload.interval
      };

    case STOP_INFORMATION_LIST_POLLING:
      return {
        ...state,
        isPolling: false,
        pollingInterval: null
      };

    default:
      return state;
  }
};

export default informationListReducer;

