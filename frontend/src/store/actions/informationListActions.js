/**
 * Information List Actions (Campaigns, Job Pickups, Posts)
 */
export const FETCH_INFORMATION_LIST_REQUEST = 'FETCH_INFORMATION_LIST_REQUEST';
export const FETCH_INFORMATION_LIST_SUCCESS = 'FETCH_INFORMATION_LIST_SUCCESS';
export const FETCH_INFORMATION_LIST_FAILURE = 'FETCH_INFORMATION_LIST_FAILURE';

export const FETCH_INFORMATION_LIST_MORE_REQUEST = 'FETCH_INFORMATION_LIST_MORE_REQUEST';
export const FETCH_INFORMATION_LIST_MORE_SUCCESS = 'FETCH_INFORMATION_LIST_MORE_SUCCESS';
export const FETCH_INFORMATION_LIST_MORE_FAILURE = 'FETCH_INFORMATION_LIST_MORE_FAILURE';

export const START_INFORMATION_LIST_POLLING = 'START_INFORMATION_LIST_POLLING';
export const STOP_INFORMATION_LIST_POLLING = 'STOP_INFORMATION_LIST_POLLING';

/**
 * Fetch information list (campaigns, job pickups, posts)
 */
export const fetchInformationList = (page = 1, append = false) => ({
  type: append ? FETCH_INFORMATION_LIST_MORE_REQUEST : FETCH_INFORMATION_LIST_REQUEST,
  payload: { page, append }
});

/**
 * Start polling for information list updates
 */
export const startInformationListPolling = (interval = 30000) => ({
  type: START_INFORMATION_LIST_POLLING,
  payload: { interval }
});

/**
 * Stop polling for information list updates
 */
export const stopInformationListPolling = () => ({
  type: STOP_INFORMATION_LIST_POLLING
});

