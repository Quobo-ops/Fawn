import Anthropic from '@anthropic-ai/sdk';
import { db, memories, memorySummaries, users } from '@fawn/database';
import { generateEmbedding, serializeEmbedding } from '@fawn/ai';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const anthropic = new Anthropic();

interface SummaryPeriod {
  type: 'daily' | 'weekly' | 'monthly';
  start: Date;
  end: Date;
}

/**
 * Generate memory summaries for a user
 * Creates compressed summaries for daily, weekly, and monthly periods
 */
export async function generateMemorySummaries(userId: string): Promise<{
  generated: number;
  errors: number;
}> {
  let generated = 0;
  let errors = 0;

  try {
    const now = new Date();
    const periods = getPeriodsToSummarize(now);

    for (const period of periods) {
      try {
        // Check if summary already exists for this period
        const existing = await db.query.memorySummaries.findFirst({
          where: and(
            eq(memorySummaries.userId, userId),
            eq(memorySummaries.periodType, period.type),
            eq(memorySummaries.periodStart, period.start.toISOString().split('T')[0])
          ),
        });

        if (existing) {
          continue;
        }

        // Get memories from this period
        const periodMemories = await db.query.memories.findMany({
          where: and(
            eq(memories.userId, userId),
            gte(memories.createdAt, period.start),
            lte(memories.createdAt, period.end)
          ),
          orderBy: [desc(memories.importance)],
          limit: 100,
        });

        if (periodMemories.length < 3) {
          // Not enough memories to summarize
          continue;
        }

        // Generate summary using Claude
        const memoryData = periodMemories.map((m) => ({
          content: m.content,
          category: m.category,
          importance: m.importance ?? 5,
        }));
        const summary = await generateSummary(memoryData, period);

        // Generate embedding for the summary
        const embedding = await generateEmbedding(summary.text);

        // Store the summary
        await db.insert(memorySummaries).values({
          userId,
          periodType: period.type,
          periodStart: period.start.toISOString().split('T')[0],
          periodEnd: period.end.toISOString().split('T')[0],
          summary: summary.text,
          embedding: serializeEmbedding(embedding),
          highlights: summary.highlights,
          mood: summary.mood,
        });

        generated++;
        console.log(`Generated ${period.type} summary for user ${userId}`);

      } catch (error) {
        console.error(`Failed to generate ${period.type} summary:`, error);
        errors++;
      }
    }

  } catch (error) {
    console.error('Memory summarization failed:', error);
    throw error;
  }

  return { generated, errors };
}

/**
 * Get periods that need summarization
 */
function getPeriodsToSummarize(now: Date): SummaryPeriod[] {
  const periods: SummaryPeriod[] = [];

  // Yesterday (daily summary)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  periods.push({
    type: 'daily',
    start: yesterday,
    end: yesterdayEnd,
  });

  // Last week (if today is Monday)
  if (now.getDay() === 1) {
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    lastWeekStart.setHours(0, 0, 0, 0);
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);

    periods.push({
      type: 'weekly',
      start: lastWeekStart,
      end: lastWeekEnd,
    });
  }

  // Last month (if today is the 1st)
  if (now.getDate() === 1) {
    const lastMonthEnd = new Date(now);
    lastMonthEnd.setDate(0); // Last day of previous month
    lastMonthEnd.setHours(23, 59, 59, 999);

    const lastMonthStart = new Date(lastMonthEnd);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);

    periods.push({
      type: 'monthly',
      start: lastMonthStart,
      end: lastMonthEnd,
    });
  }

  return periods;
}

/**
 * Generate a summary of memories using Claude
 */
async function generateSummary(
  memoryList: { content: string; category: string; importance: number }[],
  period: SummaryPeriod
): Promise<{
  text: string;
  highlights: string[];
  mood: string;
}> {
  const memoryTexts = memoryList
    .map((m) => `- [${m.category}] ${m.content}`)
    .join('\n');

  const periodLabel = period.type === 'daily' ? 'day' : period.type === 'weekly' ? 'week' : 'month';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are summarizing a user's memories from the past ${periodLabel}. Create a concise summary that captures the key themes, events, and emotional tone.

Memories:
${memoryTexts}

Respond with JSON in this format:
{
  "summary": "A 2-3 sentence narrative summary of the ${periodLabel}",
  "highlights": ["Key highlight 1", "Key highlight 2", "Key highlight 3"],
  "mood": "overall emotional tone (e.g., 'positive', 'challenging', 'productive', 'mixed')"
}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse summary response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    text: parsed.summary,
    highlights: parsed.highlights || [],
    mood: parsed.mood || 'neutral',
  };
}

/**
 * Process all users for memory summarization
 */
export async function processAllUserSummaries(): Promise<{
  usersProcessed: number;
  totalGenerated: number;
  totalErrors: number;
}> {
  let usersProcessed = 0;
  let totalGenerated = 0;
  let totalErrors = 0;

  const allUsers = await db.query.users.findMany({
    columns: { id: true },
  });

  for (const user of allUsers) {
    try {
      const result = await generateMemorySummaries(user.id);
      totalGenerated += result.generated;
      totalErrors += result.errors;
      usersProcessed++;
    } catch (error) {
      console.error(`Failed to process user ${user.id}:`, error);
      totalErrors++;
    }
  }

  return { usersProcessed, totalGenerated, totalErrors };
}

// If this file is run directly, process all users
if (require.main === module) {
  processAllUserSummaries()
    .then((result) => {
      console.log('Memory summarization complete:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Memory summarization failed:', error);
      process.exit(1);
    });
}
