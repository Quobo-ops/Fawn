import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { db, events, tasks, reminders } from '@fawn/database';
import { eq, and, gte, lte, desc, or } from 'drizzle-orm';

export const eventsRouter = Router();

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
 * Get upcoming events
 */
eventsRouter.get('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const startDate = req.query.start
    ? new Date(req.query.start as string)
    : new Date();
  const endDate = req.query.end
    ? new Date(req.query.end as string)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const result = await db.query.events.findMany({
    where: and(
      eq(events.userId, userId),
      gte(events.startTime, startDate),
      lte(events.startTime, endDate),
      or(eq(events.status, 'scheduled'), eq(events.status, 'completed'))
    ),
    orderBy: events.startTime,
  });

  res.json({
    events: result.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      startTime: e.startTime,
      endTime: e.endTime,
      allDay: e.allDay,
      eventType: e.eventType,
      status: e.status,
      recurring: e.recurring,
    })),
  });
});

/**
 * Create an event
 */
eventsRouter.post('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const createSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().max(500).optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().optional(),
    allDay: z.boolean().optional(),
    eventType: z.string().optional(),
    reminders: z.array(z.object({
      minutesBefore: z.number(),
      method: z.enum(['sms', 'push']),
    })).optional(),
  });

  try {
    const data = createSchema.parse(req.body);

    const [event] = await db.insert(events).values({
      userId,
      title: data.title,
      description: data.description,
      location: data.location,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      allDay: data.allDay,
      eventType: data.eventType,
      sourceType: 'manual',
      reminders: data.reminders,
    }).returning();

    // Create reminder entries if specified
    if (data.reminders) {
      for (const reminder of data.reminders) {
        const triggerAt = new Date(
          new Date(data.startTime).getTime() - reminder.minutesBefore * 60 * 1000
        );

        await db.insert(reminders).values({
          userId,
          content: `Reminder: ${data.title}`,
          context: data.description,
          triggerAt,
          reminderType: 'event',
          relatedEntityType: 'event',
          relatedEntityId: event.id,
        });
      }
    }

    res.status(201).json({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * Update an event
 */
eventsRouter.patch('/:id', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    location: z.string().max(500).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  });

  try {
    const data = updateSchema.parse(req.body);

    const existing = await db.query.events.findFirst({
      where: and(eq(events.id, req.params.id), eq(events.userId, userId)),
    });

    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    await db.update(events)
      .set({
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : existing.startTime,
        endTime: data.endTime ? new Date(data.endTime) : existing.endTime,
        completedAt: data.status === 'completed' ? new Date() : undefined,
        cancelledAt: data.status === 'cancelled' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(events.id, req.params.id));

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
 * Delete an event
 */
eventsRouter.delete('/:id', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const existing = await db.query.events.findFirst({
    where: and(eq(events.id, req.params.id), eq(events.userId, userId)),
  });

  if (!existing) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  await db.delete(events).where(eq(events.id, req.params.id));

  res.json({ success: true });
});

// ============ TASKS ============

/**
 * List tasks
 */
eventsRouter.get('/tasks', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const status = req.query.status as string | undefined;

  const conditions = [eq(tasks.userId, userId)];
  if (status) {
    conditions.push(eq(tasks.status, status));
  }

  const result = await db.query.tasks.findMany({
    where: and(...conditions),
    orderBy: [desc(tasks.priority), tasks.dueDate],
  });

  res.json({
    tasks: result.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
      context: t.context,
      tags: t.tags,
    })),
  });
});

/**
 * Create a task
 */
eventsRouter.post('/tasks', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const createSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().datetime().optional(),
    context: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  try {
    const data = createSchema.parse(req.body);

    const [task] = await db.insert(tasks).values({
      userId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      context: data.context,
      tags: data.tags,
    }).returning();

    res.status(201).json({
      id: task.id,
      title: task.title,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * Complete a task
 */
eventsRouter.post('/tasks/:id/complete', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const existing = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, req.params.id), eq(tasks.userId, userId)),
  });

  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  await db.update(tasks)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, req.params.id));

  res.json({ success: true });
});

// ============ REMINDERS ============

/**
 * Set a reminder
 */
eventsRouter.post('/reminders', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const createSchema = z.object({
    content: z.string().min(1).max(500),
    triggerAt: z.string().datetime(),
    recurring: z.boolean().optional(),
    recurrenceRule: z.string().optional(),
  });

  try {
    const data = createSchema.parse(req.body);

    const [reminder] = await db.insert(reminders).values({
      userId,
      content: data.content,
      triggerAt: new Date(data.triggerAt),
      recurring: data.recurring,
      recurrenceRule: data.recurrenceRule,
      reminderType: 'custom',
    }).returning();

    res.status(201).json({
      id: reminder.id,
      content: reminder.content,
      triggerAt: reminder.triggerAt,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});
