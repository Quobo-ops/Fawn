import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { db, companions } from '@fawn/database';
import { eq } from 'drizzle-orm';

export const companionsRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Validation schemas
const personalitySchema = z.object({
  warmth: z.number().min(1).max(10),
  humor: z.number().min(1).max(10),
  directness: z.number().min(1).max(10),
  formality: z.number().min(1).max(10),
  curiosity: z.number().min(1).max(10),
  encouragement: z.number().min(1).max(10),
  traits: z.array(z.string()),
  customTraits: z.string().optional(),
});

const rulesSchema = z.object({
  avoidTopics: z.array(z.string()).optional(),
  sensitiveTopics: z.array(z.string()).optional(),
  neverDo: z.array(z.string()).optional(),
  shouldProactively: z.array(z.string()).optional(),
  maxMessageLength: z.number().optional(),
  holdAccountable: z.boolean().optional(),
  accountabilityLevel: z.enum(['gentle', 'moderate', 'firm']).optional(),
});

const communicationStyleSchema = z.object({
  emojiFrequency: z.enum(['never', 'rare', 'moderate', 'frequent']),
  brevity: z.enum(['very_short', 'short', 'medium', 'detailed']),
  addressStyle: z.enum(['name', 'nickname', 'none']),
  nickname: z.string().optional(),
  greetingStyle: z.string().optional(),
  signOffStyle: z.string().optional(),
});

const updateCompanionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  pronouns: z.string().optional(),
  personality: personalitySchema.partial().optional(),
  rules: rulesSchema.optional(),
  communicationStyle: communicationStyleSchema.partial().optional(),
  customInstructions: z.string().max(2000).optional(),
});

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
 * Get companion settings
 */
companionsRouter.get('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const companion = await db.query.companions.findFirst({
      where: eq(companions.userId, userId),
    });

    if (!companion) {
      res.status(404).json({ error: 'Companion not found' });
      return;
    }

    res.json({
      id: companion.id,
      name: companion.name,
      pronouns: companion.pronouns,
      personality: companion.personality,
      rules: companion.rules,
      communicationStyle: companion.communicationStyle,
      customInstructions: companion.customInstructions,
    });
  } catch (error) {
    console.error(`[ERROR] Failed to get companion for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve companion settings' });
  }
});

/**
 * Update companion settings
 */
companionsRouter.patch('/', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const data = updateCompanionSchema.parse(req.body);

    const existing = await db.query.companions.findFirst({
      where: eq(companions.userId, userId),
    });

    if (!existing) {
      res.status(404).json({ error: 'Companion not found' });
      return;
    }

    // Merge personality and communication style with existing
    const updatedPersonality = data.personality
      ? { ...(existing.personality as unknown as Record<string, unknown>), ...data.personality }
      : existing.personality;

    const updatedCommunicationStyle = data.communicationStyle
      ? { ...(existing.communicationStyle as unknown as Record<string, unknown>), ...data.communicationStyle }
      : existing.communicationStyle;

    await db.update(companions)
      .set({
        name: data.name ?? existing.name,
        pronouns: data.pronouns ?? existing.pronouns,
        personality: updatedPersonality as typeof existing.personality,
        rules: data.rules ?? existing.rules,
        communicationStyle: updatedCommunicationStyle as typeof existing.communicationStyle,
        customInstructions: data.customInstructions ?? existing.customInstructions,
        updatedAt: new Date(),
      })
      .where(eq(companions.userId, userId));

    res.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error(`[ERROR] Failed to update companion for user ${userId}:`, error);
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * Reset companion to defaults
 */
companionsRouter.post('/reset', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await db.update(companions)
      .set({
        name: 'Fawn',
        pronouns: 'they/them',
        personality: {
          warmth: 7,
          humor: 5,
          directness: 6,
          formality: 3,
          curiosity: 7,
          encouragement: 7,
          traits: [],
        },
        rules: {
          holdAccountable: true,
          accountabilityLevel: 'moderate',
        },
        communicationStyle: {
          emojiFrequency: 'moderate',
          brevity: 'short',
          addressStyle: 'name',
        },
        customInstructions: null,
        updatedAt: new Date(),
      })
      .where(eq(companions.userId, userId));

    res.json({ success: true });
  } catch (error) {
    console.error(`[ERROR] Failed to reset companion for user ${userId}:`, error);
    res.status(500).json({ error: 'Reset failed' });
  }
});
