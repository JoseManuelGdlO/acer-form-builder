import { processDueTripReminders } from '../services/tripReminder.service';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30_000;

let jobRunning = false;

export async function runTripReminderJob(): Promise<void> {
  if (jobRunning) return;
  jobRunning = true;
  try {
    const stats = await processDueTripReminders();
    if (
      stats.remindersAttempted > 0 ||
      stats.textSent > 0 ||
      stats.templateSent > 0 ||
      stats.failed > 0
    ) {
      console.log('[trip-reminders]', stats);
    }
  } catch (error) {
    console.error('[trip-reminders] job failed:', error);
  } finally {
    jobRunning = false;
  }
}

export function startTripReminderScheduler(): void {
  if (process.env.TRIP_REMINDERS_ENABLED === 'false') {
    console.log('[trip-reminders] scheduler disabled (TRIP_REMINDERS_ENABLED=false)');
    return;
  }

  const intervalMs = parseInt(process.env.TRIP_REMINDERS_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10);
  console.log(`[trip-reminders] scheduler started (every ${intervalMs}ms)`);

  setTimeout(() => {
    void runTripReminderJob();
  }, STARTUP_DELAY_MS);

  setInterval(() => {
    void runTripReminderJob();
  }, intervalMs);
}
