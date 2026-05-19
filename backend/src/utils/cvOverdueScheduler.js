import { markOverdueCVsAndPromoteDuplicates } from './cvDuplicateChecker.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function isDisabled() {
  const v = process.env.CV_OVERDUE_SCHEDULER_DISABLED;
  return v === '1' || v === 'true' || v === 'yes';
}

function getIntervalMs() {
  const raw = process.env.CV_OVERDUE_SCHEDULER_INTERVAL_MS;
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(String(raw), 10);
    if (!Number.isNaN(n) && n >= 60_000) return n;
  }
  return DAY_MS;
}

async function runTick() {
  try {
    const result = await markOverdueCVsAndPromoteDuplicates();
    if (result.markedOverdue > 0 || result.promoted > 0) {
      console.log(
        `[CV Overdue Scheduler] markedOverdue=${result.markedOverdue}, promoted=${result.promoted}`
      );
    }
  } catch (e) {
    console.error('[CV Overdue Scheduler] Error:', e?.message || e);
  }
}

/**
 * Chi goi `markOverdueCVsAndPromoteDuplicates` (logic trong cvDuplicateChecker.js).
 * Runs on startup and on an interval (default 24h).
 * Disable: CV_OVERDUE_SCHEDULER_DISABLED=1|true|yes
 * Interval (min 60000 ms): CV_OVERDUE_SCHEDULER_INTERVAL_MS
 */
export function startCvOverdueScheduler() {
  if (isDisabled()) {
    console.log('[CV Overdue Scheduler] Disabled (CV_OVERDUE_SCHEDULER_DISABLED).');
    return;
  }

  const intervalMs = getIntervalMs();
  runTick();

  setInterval(() => {
    runTick();
  }, intervalMs);

  console.log(
    `[CV Overdue Scheduler] Started (interval ${intervalMs}ms ~= ${(intervalMs / DAY_MS).toFixed(2)} day(s)).`
  );
}
