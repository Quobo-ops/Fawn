import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { smsRouter } from './routes/sms';
import { usersRouter } from './routes/users';
import { companionsRouter } from './routes/companions';
import { memoriesRouter } from './routes/memories';
import { goalsRouter } from './routes/goals';
import { eventsRouter } from './routes/events';

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
});

export { app };
