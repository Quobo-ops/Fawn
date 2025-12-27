import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { db, memories, searchMemoriesByEmbedding, searchMemoriesByText } from '@fawn/database';
import { generateEmbedding, serializeEmbedding } from '@fawn/ai';
import { eq, and, desc, sql } from 'drizzle-orm';

export const memoriesRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserIdFromAuth(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('[WARN] Invalid JWT token:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.warn('[WARN] Expired JWT token');
    } else if (error instanceof jwt.NotBeforeError) {
      console.warn('[WARN] JWT token not active yet');
    } else {
      console.error('[ERROR] JWT verification error:', error);
    }
    return null;
  }
}

/**
 * Search memories semantically
 */
memoriesRouter.get('/search', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  try {
    // Generate embedding for query and search
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.warn(`[WARN] Empty embedding for query, falling back to text search`);
      // Fall back to text search
      try {
        const textResults = await searchMemoriesByText(userId, query, 20);
        res.json({
          query,
          results: textResults,
          fallback: true,
        });
      } catch (textSearchError) {
        console.error(`[ERROR] Text search fallback also failed for user ${userId}:`, textSearchError);
        res.status(500).json({ error: 'Memory search failed' });
      }
      return;
    }
    
    const results = await searchMemoriesByEmbedding(userId, queryEmbedding, 20, 0.5);

    res.json({
      query,
      results: results.map((r) => ({
        id: r.id,
        content: r.content,
        category: r.category,
        importance: r.importance,
        similarity: r.similarity,
        tags: r.tags,
      })),
    });

  } catch (error) {
    console.error(`[ERROR] Memory search error for user ${userId}:`, error, {
      query: query.substring(0, 50),
    });
    
    // Fall back to text search
    try {
      const textResults = await searchMemoriesByText(userId, query, 20);
      res.json({
        query,
        results: textResults,
        fallback: true,
      });
    } catch (fallbackError) {
      console.error(`[ERROR] Text search fallback also failed for user ${userId}:`, fallbackError);
      res.status(500).json({ 
        error: 'Memory search failed',
        details: process.env.NODE_ENV === 'development' ? String(fallbackError) : undefined,
      });
    }
  }
});

/**
 * List memories with optional filtering
 */
memoriesRouter.get('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const conditions = [eq(memories.userId, userId)];
    if (category) {
      conditions.push(eq(memories.category, category));
    }

    const result = await db.query.memories.findMany({
      where: and(...conditions),
      orderBy: [desc(memories.importance), desc(memories.createdAt)],
      limit,
      offset,
    });

    res.json({
      memories: result.map((m) => ({
        id: m.id,
        content: m.content,
        category: m.category,
        subcategory: m.subcategory,
        importance: m.importance,
        tags: m.tags,
        occurredAt: m.occurredAt,
        createdAt: m.createdAt,
      })),
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error(`[ERROR] Failed to list memories for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

/**
 * Add a new memory manually
 */
memoriesRouter.post('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const createSchema = z.object({
    content: z.string().min(1).max(5000),
    category: z.enum(['fact', 'preference', 'goal', 'event', 'relationship', 'emotion', 'insight']),
    subcategory: z.string().optional(),
    importance: z.number().min(1).max(10).optional(),
    tags: z.array(z.string()).optional(),
    occurredAt: z.string().datetime().optional(),
  });

  try {
    const data = createSchema.parse(req.body);

    // Generate embedding
    const embedding = await generateEmbedding(data.content);
    
    if (!embedding || embedding.length === 0) {
      console.warn(`[WARN] Could not generate embedding for new memory`);
    }

    const [memory] = await db.insert(memories).values({
      userId,
      content: data.content,
      embedding: embedding.length > 0 ? serializeEmbedding(embedding) : null,
      category: data.category,
      subcategory: data.subcategory,
      importance: data.importance || 5,
      tags: data.tags,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      sourceType: 'user_input',
    }).returning();

    res.status(201).json({
      id: memory.id,
      content: memory.content,
      category: memory.category,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error(`[ERROR] Create memory error for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

/**
 * Update a memory
 */
memoriesRouter.patch('/:id', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const memoryId = req.params.id;

  const updateSchema = z.object({
    content: z.string().min(1).max(5000).optional(),
    category: z.enum(['fact', 'preference', 'goal', 'event', 'relationship', 'emotion', 'insight']).optional(),
    importance: z.number().min(1).max(10).optional(),
    tags: z.array(z.string()).optional(),
  });

  try {
    const data = updateSchema.parse(req.body);

    // Verify ownership
    const existing = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.userId, userId)),
    });

    if (!existing) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    // Re-generate embedding if content changed
    let embedding = existing.embedding;
    if (data.content && data.content !== existing.content) {
      const newEmbedding = await generateEmbedding(data.content);
      if (newEmbedding && newEmbedding.length > 0) {
        embedding = serializeEmbedding(newEmbedding);
      }
    }

    await db.update(memories)
      .set({
        ...data,
        embedding,
        updatedAt: new Date(),
      })
      .where(eq(memories.id, memoryId));

    res.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error(`[ERROR] Update memory error for user ${userId}:`, error);
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * Delete a memory
 */
memoriesRouter.delete('/:id', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const memoryId = req.params.id;

  try {
    // Verify ownership
    const existing = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.userId, userId)),
    });

    if (!existing) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    await db.delete(memories).where(eq(memories.id, memoryId));

    res.json({ success: true });
  } catch (error) {
    console.error(`[ERROR] Delete memory error for user ${userId}:`, error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/**
 * Get memory categories summary
 */
memoriesRouter.get('/summary', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await db
      .select({
        category: memories.category,
        count: sql<number>`count(*)::int`,
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
    console.error(`[ERROR] Memory summary error for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to get memory summary' });
  }
});
