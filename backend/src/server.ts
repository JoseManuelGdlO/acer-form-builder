import app from './app';
import { config } from './config/env';
import { startTripReminderScheduler } from './jobs/tripReminders.job';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  startTripReminderScheduler();
});
