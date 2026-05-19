import { call, put, takeEvery, takeLatest, delay, select, fork } from 'redux-saga/effects';
import {
  FETCH_INFORMATION_LIST_REQUEST,
  FETCH_INFORMATION_LIST_MORE_REQUEST,
  FETCH_INFORMATION_LIST_SUCCESS,
  FETCH_INFORMATION_LIST_FAILURE,
  FETCH_INFORMATION_LIST_MORE_SUCCESS,
  FETCH_INFORMATION_LIST_MORE_FAILURE,
  START_INFORMATION_LIST_POLLING,
  STOP_INFORMATION_LIST_POLLING
} from '../actions/informationListActions';
import apiService from '../../services/api';

/**
 * Format date helper
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

/**
 * Check if date is recent (within 7 days)
 */
const isRecent = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const daysDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
};

/**
 * Fetch information list data
 */
function* fetchInformationListSaga(action) {
  const { page = 1, append = false } = action.payload || {};
  console.log('[Saga] Fetching information list:', { page, append });
  const limit = 20;

  let jobPickupsRes, campaignsRes, postsRes;

  try {
    // Fetch all three types in parallel with error handling
    jobPickupsRes = yield call(apiService.getCTVJobPickups, { page, limit, sortBy: 'created_at', sortOrder: 'DESC' });
  } catch (err) {
    console.error('[Saga] Error fetching job pickups:', err);
    jobPickupsRes = { success: false, data: { pickups: [], pagination: {} } };
  }

  try {
    campaignsRes = yield call(apiService.getCTVCampaigns, { page, limit, status: 1, sortBy: 'created_at', sortOrder: 'DESC' });
  } catch (err) {
    console.error('[Saga] Error fetching campaigns:', err);
    campaignsRes = { success: false, data: { campaigns: [], pagination: {} } };
  }

  try {
    postsRes = yield call(apiService.getCTVPosts, { page, limit, status: 2, sortBy: 'published_at', sortOrder: 'DESC' });
  } catch (err) {
    console.error('[Saga] Error fetching posts:', err);
    postsRes = { success: false, data: { posts: [], pagination: {} } };
  }
  
  console.log('[Saga] API Responses:', {
    jobPickups: { success: jobPickupsRes?.success, count: jobPickupsRes?.data?.pickups?.length || 0 },
    campaigns: { success: campaignsRes?.success, count: campaignsRes?.data?.campaigns?.length || 0 },
    posts: { success: postsRes?.success, count: postsRes?.data?.posts?.length || 0 }
  });

  try {

    const newData = [];
    const newPagination = {
      jobPickups: { total: 0, totalPages: 0 },
      campaigns: { total: 0, totalPages: 0 },
      posts: { total: 0, totalPages: 0 }
    };

    // Process job pickups
    if (jobPickupsRes.success && jobPickupsRes.data?.pickups) {
      jobPickupsRes.data.pickups.forEach((pickup) => {
        newData.push({
          id: `pickup-${pickup.id}`,
          type: 'job-pickup',
          originalId: pickup.id,
          tag: 'Job pick-up',
          tagColor: 'bg-yellow-100 text-yellow-700',
          tagIcon: 'Star', // Will be converted to component in component
          title: pickup.name || '',
          titleEn: pickup.nameEn || pickup.name_en || '',
          titleJp: pickup.nameJp || pickup.name_jp || '',
          date: formatDate(pickup.createdAt),
          description: pickup.description || '',
          descriptionEn: pickup.descriptionEn || pickup.description_en || '',
          descriptionJp: pickup.descriptionJp || pickup.description_jp || '',
          coverUrl: pickup.coverUrl || pickup.cover_url || '',
          action: 'Xem chi tiết',
          url: `/agent/jobs?pickupId=${pickup.id}`,
          isNew: isRecent(pickup.createdAt),
        });
      });
      if (jobPickupsRes.data.pagination) {
        newPagination.jobPickups = jobPickupsRes.data.pagination;
      }
    }

    // Process campaigns
    if (campaignsRes.success && campaignsRes.data?.campaigns) {
      campaignsRes.data.campaigns.forEach((campaign) => {
        newData.push({
          id: `campaign-${campaign.id}`,
          type: 'campaign',
          originalId: campaign.id,
          tag: 'Campaign',
          tagColor: 'bg-purple-100 text-purple-700',
          tagIcon: 'Target', // Will be converted to component in component
          title: campaign.name || '',
          titleEn: campaign.nameEn || campaign.name_en || '',
          titleJp: campaign.nameJp || campaign.name_jp || '',
          date: formatDate(campaign.startDate || campaign.createdAt),
          description: campaign.description || '',
          descriptionEn: campaign.descriptionEn || campaign.description_en || '',
          descriptionJp: campaign.descriptionJp || campaign.description_jp || '',
          coverUrl: campaign.coverUrl || campaign.cover_url || '',
          action: 'Xem chi tiết',
          url: `/agent/jobs?campaignId=${campaign.id}`,
          isNew: campaign.status === 1 && isRecent(campaign.startDate || campaign.createdAt),
        });
      });
      if (campaignsRes.data.pagination) {
        newPagination.campaigns = campaignsRes.data.pagination;
      }
    }

    // Process posts
    if (postsRes.success && postsRes.data?.posts) {
      postsRes.data.posts.forEach((post) => {
        newData.push({
          id: `post-${post.id}`,
          type: 'news',
          originalId: post.id,
          tag: 'News',
          tagColor: 'bg-blue-100 text-blue-700',
          tagIcon: 'FileText', // Will be converted to component in component
          title: post.title || '',
          titleEn: post.titleEn || post.title_en || '',
          titleJp: post.titleJp || post.title_jp || '',
          date: formatDate(post.publishedAt || post.createdAt),
          description: post.metaDescription || post.content?.substring(0, 100) || '',
          descriptionEn: post.metaDescriptionEn || post.meta_description_en || post.contentEn || post.content_en || '',
          descriptionJp: post.metaDescriptionJp || post.meta_description_jp || post.contentJp || post.content_jp || '',
          action: 'Xem chi tiết',
          url: `/agent/jobs?postId=${post.id}`,
          isNew: isRecent(post.publishedAt || post.createdAt),
        });
      });
      if (postsRes.data.pagination) {
        newPagination.posts = postsRes.data.pagination;
      }
    }

    // Sort by date (newest first)
    newData.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB - dateA;
    });

    // Remove duplicates
    const uniqueData = [];
    const seenIds = new Set();
    newData.forEach(item => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueData.push(item);
      }
    });

    console.log('[Saga] Processed data:', { 
      totalItems: uniqueData.length, 
      campaigns: uniqueData.filter(item => item.type === 'campaign').length,
      pickups: uniqueData.filter(item => item.type === 'job-pickup').length,
      posts: uniqueData.filter(item => item.type === 'news').length,
      pagination: newPagination
    });

    if (append) {
      yield put({
        type: FETCH_INFORMATION_LIST_MORE_SUCCESS,
        payload: {
          data: uniqueData,
          pagination: newPagination
        }
      });
    } else {
      yield put({
        type: FETCH_INFORMATION_LIST_SUCCESS,
        payload: {
          data: uniqueData,
          pagination: newPagination
        }
      });
    }
  } catch (error) {
    console.error('[Saga] Error processing information list:', error);
    const { append = false } = action.payload || {};
    yield put({
      type: append ? FETCH_INFORMATION_LIST_MORE_FAILURE : FETCH_INFORMATION_LIST_FAILURE,
      payload: error.message || 'Failed to fetch information list'
    });
  }
}

/**
 * Polling saga - automatically refresh data
 */
function* pollingSaga() {
  while (true) {
    const state = yield select();
    const { isPolling, pollingInterval } = state.informationList;

    if (isPolling && pollingInterval) {
      // Fetch fresh data
      yield put({ type: FETCH_INFORMATION_LIST_REQUEST, payload: { page: 1, append: false } });
      yield delay(pollingInterval);
    } else {
      // Stop polling if disabled
      yield delay(1000); // Check every second
    }
  }
}

/**
 * Root saga for information list
 */
export function* informationListSaga() {
  yield takeEvery(FETCH_INFORMATION_LIST_REQUEST, fetchInformationListSaga);
  yield takeEvery(FETCH_INFORMATION_LIST_MORE_REQUEST, fetchInformationListSaga);
  yield fork(pollingSaga);
}

