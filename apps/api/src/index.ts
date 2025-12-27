import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from root .env
// Try multiple paths to find .env in monorepo structure
const possiblePaths = [
  resolve(process.cwd(), '.env'),           // If running from root
  resolve(process.cwd(), '../../.env'),     // If running from apps/api
  resolve(__dirname, '../../../.env'),      // Relative to source file
  resolve(__dirname, '../../../../.env'),   // If in dist folder
];

for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log(`Loaded .env from: ${envPath}`);
    break;
  }
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { smsRouter } from './routes/sms';
import { usersRouter } from './routes/users';
import { companionsRouter } from './routes/companions';
import { memoriesRouter } from './routes/memories';
import { goalsRouter } from './routes/goals';
import { eventsRouter } from './routes/events';
import { statsRouter } from './routes/stats';
import { processPendingReminders } from './workers/reminder-sender';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio webhooks

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/sms', smsRouter);
app.use('/api/users', usersRouter);
app.use('/api/companions', companionsRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/stats', statsRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(port, () => {
  console.log(`Fawn API server running on port ${port}`);

  // Start reminder processing (every minute)
  const REMINDER_INTERVAL_MS = 60 * 1000;
  setInterval(async () => {
    try {
      const result = await processPendingReminders();
      if (result.processed > 0) {
        console.log(`Reminders processed: ${result.sent} sent, ${result.errors} errors`);
      }
    } catch (error) {
      console.error('Reminder processing error:', error);
    }
  }, REMINDER_INTERVAL_MS);

  // Run once on startup
  processPendingReminders().catch(console.error);
});

export { app };
