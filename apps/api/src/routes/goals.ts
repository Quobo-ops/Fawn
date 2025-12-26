import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { db, goals, goalProgress, habits, habitCompletions } from '@fawn/database';
import { eq, and, desc } from 'drizzle-orm';

export const goalsRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserIdFromAuth(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

/**
 * List goals
 */
goalsRouter.get('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const status = req.query.status as string | undefined;

  const conditions = [eq(goals.userId, userId)];
  if (status) {
    conditions.push(eq(goals.status, status));
  }

  const result = await db.query.goals.findMany({
    where: and(...conditions),
    orderBy: [desc(goals.priority), desc(goals.createdAt)],
  });

  res.json({
    goals: result.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      type: g.type,
      status: g.status,
      priority: g.priority,
      targetDate: g.targetDate,
      progressPercentage: g.progressPercentage,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      targetUnit: g.targetUnit,
    })),
  });
});

/**
 * Create a goal
 */
goalsRouter.post('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const createSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    why: z.string().max(1000).optional(),
    type: z.enum(['habit', 'outcome', 'process', 'milestone']),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'ongoing']).optional(),
    targetValue: z.number().optional(),
    targetUnit: z.string().optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    priority: z.number().min(1).max(10).optional(),
    trackingFrequency: z.string().optional(),
  });

  try {
    const data = createSchema.parse(req.body);

    const [goal] = await db.insert(goals).values({
      userId,
      ...data,
    }).returning();

    res.status(201).json({
      id: goal.id,
      title: goal.title,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * Get goal details with progress history
 */
goalsRouter.get('/:id', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const goal = await db.query.goals.findFirst({
    where: and(eq(goals.id, req.params.id), eq(goals.userId, userId)),
  });

  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  const progress = await db.query.goalProgress.findMany({
    where: eq(goalProgress.goalId, goal.id),
    orderBy: desc(goalProgress.recordedAt),
    limit: 50,
  });

  res.json({
    ...goal,
    progress: progress.map((p) => ({
      id: p.id,
      value: p.value,
      note: p.note,
      mood: p.mood,
      recordedAt: p.recordedAt,
    })),
  });
});

/**
 * Update goal
 */
goalsRouter.patch('/:id', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
    priority: z.number().min(1).max(10).optional(),
    currentValue: z.number().optional(),
    progressPercentage: z.number().min(0).max(100).optional(),
  });

  try {
    const data = updateSchema.parse(req.body);

    const existing = await db.query.goals.findFirst({
      where: and(eq(goals.id, req.params.id), eq(goals.userId, userId)),
    });

    if (!existing) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    await db.update(goals)
      .set({
        ...data,
        completedAt: data.status === 'completed' ? new Date() : existing.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, req.params.id));

    res.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * Log progress on a goal
 */
goalsRouter.post('/:id/progress', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const logSchema = z.object({
    value: z.number().optional(),
    note: z.string().max(1000).optional(),
    mood: z.string().optional(),
  });

  try {
    const data = logSchema.parse(req.body);

    const goal = await db.query.goals.findFirst({
      where: and(eq(goals.id, req.params.id), eq(goals.userId, userId)),
    });

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const [entry] = await db.insert(goalProgress).values({
      goalId: goal.id,
      userId,
      value: data.value,
      note: data.note,
      mood: data.mood,
      sourceType: 'manual',
    }).returning();

    // Update goal current value and progress if applicable
    if (data.value !== undefined && goal.targetValue) {
      const newCurrentValue = (goal.currentValue || 0) + data.value;
      const newProgress = Math.min(100, (newCurrentValue / goal.targetValue) * 100);

      await db.update(goals)
        .set({
          currentValue: newCurrentValue,
          progressPercentage: newProgress,
          updatedAt: new Date(),
        })
        .where(eq(goals.id, goal.id));
    }

    res.status(201).json({
      id: entry.id,
      recordedAt: entry.recordedAt,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to log progress' });
  }
});

/**
 * List habits
 */
goalsRouter.get('/habits/list', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await db.query.habits.findMany({
    where: eq(habits.userId, userId),
    orderBy: desc(habits.currentStreak),
  });

  res.json({
    habits: result.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      frequency: h.frequency,
      currentStreak: h.currentStreak,
      longestStreak: h.longestStreak,
      lastCompletedAt: h.lastCompletedAt,
      active: h.active,
    })),
  });
});

/**
 * Log habit completion
 */
goalsRouter.post('/habits/:id/complete', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, req.params.id), eq(habits.userId, userId)),
  });

  if (!habit) {
    res.status(404).json({ error: 'Habit not found' });
    return;
  }

  const logSchema = z.object({
    note: z.string().max(500).optional(),
    quality: z.number().min(1).max(5).optional(),
  });

  try {
    const data = logSchema.parse(req.body);

    await db.insert(habitCompletions).values({
      habitId: habit.id,
      note: data.note,
      quality: data.quality,
    });

    // Update streak
    const now = new Date();
    const lastCompleted = habit.lastCompletedAt;
    let newStreak = habit.currentStreak || 0;

    // Simple streak logic - if last completion was yesterday or today, continue streak
    if (lastCompleted) {
      const daysSinceLastCompletion = Math.floor(
        (now.getTime() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastCompletion <= 1) {
        newStreak += 1;
      } else {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1;
    }

    await db.update(habits)
      .set({
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak || 0, newStreak),
        lastCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(habits.id, habit.id));

    res.json({
      success: true,
      newStreak,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to log completion' });
  }
});
