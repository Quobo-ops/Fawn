import { Router } from 'express';
import { db, researchTasks, users } from '@fawn/database';
import { DeepResearchEngine, INTENTS } from '@fawn/ai';
import { sendSms } from '@fawn/sms';
import { eq, desc, and } from 'drizzle-orm';

export const researchRouter = Router();

/**
 * Start a deep research task
 */
export async function startResearch(params: {
  userId: string;
  query: string;
  conversationId?: string;
  triggerMessageId?: string;
  fromNumber: string;
  toNumber: string;
}): Promise<{ taskId: string; confirmationMessage: string }> {
  // Create the research task record
  const [task] = await db.insert(researchTasks).values({
    userId: params.userId,
    query: params.query,
    status: 'pending',
    progress: 0,
    conversationId: params.conversationId,
    triggerMessageId: params.triggerMessageId,
    fromNumber: params.fromNumber,
    toNumber: params.toNumber,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Run research in background (don't await)
  executeResearch(task.id, params.userId, params.query, params.fromNumber, params.toNumber)
    .catch((error) => {
      console.error(`Research task ${task.id} failed:`, error);
    });

  return {
    taskId: task.id,
    confirmationMessage: `Got it! I'm starting deep research on "${params.query}". This might take a few minutes - I'll text you back when I have results. In the meantime, feel free to keep chatting!`,
  };
}

/**
 * Execute the research task asynchronously
 */
async function executeResearch(
  taskId: string,
  userId: string,
  query: string,
  fromNumber: string,
  toNumber: string
): Promise<void> {
  const engine = new DeepResearchEngine({
    maxSearches: 5,
    maxSourcesPerSearch: 5,
  });

  // Update status to in_progress
  await db.update(researchTasks)
    .set({
      status: 'in_progress',
      startedAt: new Date(),
      currentStage: 'planning',
      statusMessage: 'Starting research...',
      updatedAt: new Date(),
    })
    .where(eq(researchTasks.id, taskId));

  try {
    const result = await engine.research(query, async (progress) => {
      // Update progress in database
      await db.update(researchTasks)
        .set({
          progress: progress.progress,
          currentStage: progress.stage,
          statusMessage: progress.message,
          searchesCompleted: progress.searchesCompleted,
          sourcesReviewed: progress.sourcesReviewed,
          updatedAt: new Date(),
        })
        .where(eq(researchTasks.id, taskId));
    });

    // Update with results
    await db.update(researchTasks)
      .set({
        status: result.status,
        progress: 100,
        currentStage: 'complete',
        summary: result.summary,
        findings: result.findings,
        sources: result.sources,
        searchesCompleted: result.totalSearches,
        sourcesReviewed: result.totalSourcesReviewed,
        completedAt: new Date(),
        error: result.error,
        updatedAt: new Date(),
      })
      .where(eq(researchTasks.id, taskId));

    // Send results to user via SMS
    if (result.status === 'completed') {
      const smsMessage = formatResearchForSMS(result.summary, result.sources, query);
      await sendSms({
        from: toNumber,
        to: fromNumber,
        body: smsMessage,
      });

      // Mark as notified
      await db.update(researchTasks)
        .set({ notifiedAt: new Date() })
        .where(eq(researchTasks.id, taskId));
    } else {
      // Notify of failure
      await sendSms({
        from: toNumber,
        to: fromNumber,
        body: `Sorry, I ran into some issues researching "${query}". Would you like me to try again?`,
      });
    }
  } catch (error) {
    console.error(`Research execution failed for task ${taskId}:`, error);

    await db.update(researchTasks)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchTasks.id, taskId));

    // Notify user of failure
    await sendSms({
      from: toNumber,
      to: fromNumber,
      body: `Sorry, I couldn't complete the research on "${query}". Would you like me to try again?`,
    });
  }
}

/**
 * Format research results for SMS
 */
function formatResearchForSMS(
  summary: string,
  sources: Array<{ title: string; url: string; relevance: string }>,
  query: string
): string {
  let message = `Research complete: "${query}"\n\n`;
  message += summary;

  // Add top sources
  const topSources = sources.filter((s) => s.relevance === 'high').slice(0, 3);
  if (topSources.length > 0) {
    message += '\n\nSources:\n';
    for (const source of topSources) {
      message += `${source.url}\n`;
    }
  }

  // SMS has a limit, truncate if needed
  if (message.length > 1550) {
    message = message.slice(0, 1547) + '...';
  }

  return message;
}

/**
 * Get status of user's latest research
 */
export async function getLatestResearchStatus(userId: string): Promise<{
  hasActiveResearch: boolean;
  task?: typeof researchTasks.$inferSelect;
  statusMessage: string;
}> {
  const latestTask = await db.query.researchTasks.findFirst({
    where: eq(researchTasks.userId, userId),
    orderBy: desc(researchTasks.createdAt),
  });

  if (!latestTask) {
    return {
      hasActiveResearch: false,
      statusMessage: "You don't have any research tasks yet. Just ask me to research something!",
    };
  }

  if (latestTask.status === 'pending' || latestTask.status === 'in_progress') {
    const progressMsg = latestTask.progress
      ? ` (${latestTask.progress}% complete)`
      : '';
    return {
      hasActiveResearch: true,
      task: latestTask,
      statusMessage: `I'm still working on your research about "${latestTask.query}"${progressMsg}. ${latestTask.statusMessage || 'Hang tight!'}`,
    };
  }

  if (latestTask.status === 'completed') {
    return {
      hasActiveResearch: false,
      task: latestTask,
      statusMessage: `Your last research on "${latestTask.query}" is complete! Would you like me to send the results again?`,
    };
  }

  return {
    hasActiveResearch: false,
    task: latestTask,
    statusMessage: `Your last research on "${latestTask.query}" ran into issues. Would you like me to try again?`,
  };
}

/**
 * Check if user has any pending/in-progress research
 */
export async function hasActiveResearch(userId: string): Promise<boolean> {
  const activeTask = await db.query.researchTasks.findFirst({
    where: and(
      eq(researchTasks.userId, userId),
      eq(researchTasks.status, 'in_progress')
    ),
  });
  return !!activeTask;
}

// API Routes

/**
 * Get all research tasks for authenticated user
 */
researchRouter.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tasks = await db.query.researchTasks.findMany({
      where: eq(researchTasks.userId, userId),
      orderBy: desc(researchTasks.createdAt),
      limit: 20,
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Failed to get research tasks:', error);
    res.status(500).json({ error: 'Failed to get research tasks' });
  }
});

/**
 * Get a specific research task
 */
researchRouter.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const task = await db.query.researchTasks.findFirst({
      where: and(
        eq(researchTasks.id, req.params.id),
        eq(researchTasks.userId, userId)
      ),
    });

    if (!task) {
      res.status(404).json({ error: 'Research task not found' });
      return;
    }

    res.json({ task });
  } catch (error) {
    console.error('Failed to get research task:', error);
    res.status(500).json({ error: 'Failed to get research task' });
  }
});

/**
 * Start a new research task via API
 */
researchRouter.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    // Get user for phone number
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.phoneNumber) {
      res.status(400).json({ error: 'User phone number required for research' });
      return;
    }

    const result = await startResearch({
      userId,
      query,
      fromNumber: user.phoneNumber,
      toNumber: user.phoneNumber, // Will be updated with assigned number
    });

    res.json({
      taskId: result.taskId,
      message: result.confirmationMessage,
    });
  } catch (error) {
    console.error('Failed to start research:', error);
    res.status(500).json({ error: 'Failed to start research' });
  }
});
