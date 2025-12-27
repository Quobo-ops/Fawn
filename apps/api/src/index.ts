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

let envLoaded = false;
for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log(`[INFO] Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('[WARN] No .env file found. Make sure environment variables are set.');
}

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'ANTHROPIC_API_KEY',
  ];

  const optional = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'API_BASE_URL',
    'PORT',
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of optional) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('[ERROR] Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nPlease set these in your .env file or environment.');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('[WARN] Optional environment variables not set:');
    warnings.forEach(key => console.warn(`  - ${key}`));
    
    if (warnings.includes('TWILIO_ACCOUNT_SID') || warnings.includes('TWILIO_AUTH_TOKEN')) {
      console.warn('  SMS functionality will be limited without Twilio credentials.');
    }
    if (warnings.includes('OPENAI_API_KEY')) {
      console.warn('  Memory search will be limited without OpenAI API key.');
    }
  }

  // Validate Twilio token length if provided
  if (process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN.length !== 32) {
    console.warn(`[WARN] TWILIO_AUTH_TOKEN should be 32 characters, got ${process.env.TWILIO_AUTH_TOKEN.length}`);
  }

  console.log('[INFO] Environment validation passed');
}

// Validate on startup
validateEnvironment();

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

// Health check with environment status
app.get('/health', (req, res) => {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      hasTwilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      hasOpenAI: !!process.env.OPENAI_API_KEY,
    },
  };
  res.json(status);
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
  console.error('[ERROR] Unhandled error:', err, {
    path: req.path,
    method: req.method,
  });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(port, () => {
  console.log(`[INFO] Fawn API server running on port ${port}`);
  console.log(`[INFO] Health check: http://localhost:${port}/health`);

  // Start reminder processing (every minute)
  const REMINDER_INTERVAL_MS = 60 * 1000;
  setInterval(async () => {
    try {
      const result = await processPendingReminders();
      if (result.processed > 0) {
        console.log(`[INFO] Reminders processed: ${result.sent} sent, ${result.errors} errors`);
      }
    } catch (error) {
      console.error('[ERROR] Reminder processing error:', error);
    }
  }, REMINDER_INTERVAL_MS);

  // Run once on startup
  processPendingReminders().catch(console.error);
});

export { app };
