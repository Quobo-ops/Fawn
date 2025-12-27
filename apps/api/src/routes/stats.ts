import { Router } from 'express';
import { db, messages, memories, goals, conversations } from '@fawn/database';
import { eq, sql, count, and, gte } from 'drizzle-orm';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const statsRouter = Router();

/**
 * Get dashboard statistics
 */
statsRouter.get('/', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    // Get message count
    const [messageStats] = await db
      .select({
        total: count(),
      })
      .from(messages)
      .where(eq(messages.userId, userId));

    // Get conversation count
    const [conversationStats] = await db
      .select({
        total: count(),
      })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    // Get memory count
    const [memoryStats] = await db
      .select({
        total: count(),
      })
      .from(memories)
      .where(eq(memories.userId, userId));

    // Get active goals count
    const [goalStats] = await db
      .select({
        total: count(),
      })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));

    // Get messages in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentMessages] = await db
      .select({
        total: count(),
      })
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        gte(messages.createdAt, sevenDaysAgo)
      ));

    res.json({
      messages: {
        total: messageStats?.total || 0,
        lastWeek: recentMessages?.total || 0,
      },
      conversations: conversationStats?.total || 0,
      memories: memoryStats?.total || 0,
      activeGoals: goalStats?.total || 0,
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get memory statistics by category
 */
statsRouter.get('/memories', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const result = await db
      .select({
        category: memories.category,
        count: count(),
      })
      .from(memories)
      .where(eq(memories.userId, userId))
      .groupBy(memories.category);

    const total = result.reduce((sum, r) => sum + r.count, 0);

    res.json({
      total,
      byCategory: Object.fromEntries(result.map((r) => [r.category, r.count])),
    });

  } catch (error) {
    console.error('Memory stats error:', error);
    res.status(500).json({ error: 'Failed to fetch memory stats' });
  }
});

/**
 * Get goal statistics
 */
statsRouter.get('/goals', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const result = await db
      .select({
        status: goals.status,
        count: count(),
      })
      .from(goals)
      .where(eq(goals.userId, userId))
      .groupBy(goals.status);

    const byStatus = Object.fromEntries(result.map((r) => [r.status || 'unknown', r.count]));

    res.json({
      total: result.reduce((sum, r) => sum + r.count, 0),
      active: byStatus['active'] || 0,
      completed: byStatus['completed'] || 0,
      paused: byStatus['paused'] || 0,
      abandoned: byStatus['abandoned'] || 0,
    });

  } catch (error) {
    console.error('Goal stats error:', error);
    res.status(500).json({ error: 'Failed to fetch goal stats' });
  }
});
