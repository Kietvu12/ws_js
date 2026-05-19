import { CVStorage } from '../models/index.js';
import { collaboratorNotificationService } from './collaboratorNotificationService.js';

const CV_VECTOR_SYNC_URL = (cvId) => `https://ws-jobshare.com/api_ai/v2/vector/cv/${cvId}`;
const RUNNER_INTERVAL_MS = 30000;
const MAX_RETRY_COUNT = 1000;

let runnerStarted = false;
let runnerTimer = null;
let isTickRunning = false;

const terminalStates = new Set(['vector_done']);

function normalizeStatus(cv) {
  return String(cv?.vectorSyncStatus || '').trim() || 'pending';
}

async function markCvVectorDone(cv) {
  cv.vectorSyncStatus = 'vector_done';
  cv.vectorSyncCompletedAt = new Date();
  cv.vectorSyncLastError = null;
  await cv.save();

  if (cv.collaboratorId) {
    await collaboratorNotificationService.createAndEmit({
      collaboratorId: cv.collaboratorId,
      title: 'Hồ sơ của bạn đã được AI xử lý xong',
      content: `Hồ sơ ${cv.name || cv.code || `#${cv.id}`} đã được xử lý xong và có thể xem gợi ý AI.`,
      jobId: null,
      url: `/agent/candidates/${cv.id}`
    });
  }
}

async function markCvVectorFailed(cv, error) {
  const nextRetry = Number(cv.vectorSyncRetryCount || 0) + 1;
  cv.vectorSyncStatus = nextRetry >= MAX_RETRY_COUNT ? 'vector_failed' : 'vector_pending';
  cv.vectorSyncRetryCount = nextRetry;
  cv.vectorSyncLastError = String(error?.message || error || 'Unknown vector sync error').slice(0, 2000);
  await cv.save();
}

async function syncSingleCvVector(cv) {
  cv.vectorSyncStatus = 'vector_processing';
  cv.vectorSyncRequestedAt = cv.vectorSyncRequestedAt || new Date();
  cv.vectorSyncLastError = null;
  await cv.save();

  try {
    const response = await fetch(CV_VECTOR_SYNC_URL(cv.id), { method: 'POST' });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Vector sync failed (${response.status}): ${body || response.statusText}`);
    }
    await markCvVectorDone(cv);
  } catch (error) {
    await markCvVectorFailed(cv, error);
  }
}

async function tickVectorSyncRunner() {
  if (isTickRunning) return;
  isTickRunning = true;
  try {
    const candidates = await CVStorage.findAll({
      where: {
        isParse: true,
        vectorSyncStatus: ['pending', 'vector_pending', 'vector_processing', 'vector_failed']
      },
      order: [['updated_at', 'ASC']],
      limit: 5
    });

    for (const cv of candidates) {
      if (terminalStates.has(normalizeStatus(cv))) continue;
      if (normalizeStatus(cv) === 'vector_failed' && Number(cv.vectorSyncRetryCount || 0) >= MAX_RETRY_COUNT) continue;
      await syncSingleCvVector(cv);
    }
  } catch (error) {
    console.error('[cvVectorSyncService] Runner tick failed:', error?.message || error);
  } finally {
    isTickRunning = false;
  }
}

export async function enqueueCvVectorSync(cvId) {
  if (!cvId) return null;
  const cv = await CVStorage.findByPk(cvId);
  if (!cv) return null;
  if (!cv.isParse) return cv;

  if (normalizeStatus(cv) === 'vector_done') return cv;

  cv.vectorSyncStatus = 'vector_pending';
  cv.vectorSyncRequestedAt = new Date();
  cv.vectorSyncCompletedAt = null;
  cv.vectorSyncLastError = null;
  await cv.save();
  return cv;
}

export function startCvVectorSyncRunner() {
  if (runnerStarted) return;
  runnerStarted = true;
  runnerTimer = setInterval(() => {
    tickVectorSyncRunner().catch((error) => {
      console.error('[cvVectorSyncService] Interval error:', error?.message || error);
    });
  }, RUNNER_INTERVAL_MS);

  tickVectorSyncRunner().catch((error) => {
    console.error('[cvVectorSyncService] Initial tick error:', error?.message || error);
  });
}

export function stopCvVectorSyncRunner() {
  if (runnerTimer) clearInterval(runnerTimer);
  runnerTimer = null;
  runnerStarted = false;
}
