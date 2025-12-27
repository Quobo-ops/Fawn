import { Router } from 'express';
import { db, users, assignedPhoneNumbers, conversations, messages, companions, memories, goals, events, searchMemoriesByEmbedding } from '@fawn/database';
import { parseIncomingSms, sendSms, validateTwilioWebhook } from '@fawn/sms';
import { CompanionEngine, generateEmbedding, serializeEmbedding, checkMemoryConflicts } from '@fawn/ai';
import type { CompanionConfig, UserContext, MemoryContext, GoalContext, EventContext, MessageContext } from '@fawn/ai';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export const smsRouter = Router();

/**
 * Twilio webhook for incoming SMS messages
 */
smsRouter.post('/webhook', async (req, res) => {
  try {
    // Validate Twilio webhook signature
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const webhookUrl = `${process.env.API_BASE_URL}/api/sms/webhook`;

    if (process.env.NODE_ENV === 'production' && !validateTwilioWebhook(twilioSignature, webhookUrl, req.body)) {
      console.error('Invalid Twilio webhook signature');
      res.status(403).send('Forbidden');
      return;
    }

    const incoming = parseIncomingSms(req.body);
    console.log(`Incoming SMS from ${incoming.from}: ${incoming.body}`);

    // Find user by their assigned companion phone number
    const assignedNumber = await db.query.assignedPhoneNumbers.findFirst({
      where: eq(assignedPhoneNumbers.phoneNumber, incoming.to),
    });

    if (!assignedNumber) {
      console.error(`No user found for number ${incoming.to}`);
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, assignedNumber.userId),
    });

    if (!user) {
      console.error(`User not found: ${assignedNumber.userId}`);
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Verify the sender is the user's phone
    if (user.phoneNumber !== incoming.from) {
      console.warn(`Message from unknown number ${incoming.from} for user ${user.id}`);
      // Could be legitimate - maybe user has multiple phones. For now, allow it.
    }

    // Get or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: eq(conversations.userId, user.id),
      orderBy: desc(conversations.lastMessageAt),
    });

    if (!conversation) {
      const [newConversation] = await db.insert(conversations).values({
        userId: user.id,
      }).returning();
      conversation = newConversation;
    }

    // Store incoming message
    const [userMessage] = await db.insert(messages).values({
      conversationId: conversation.id,
      userId: user.id,
      role: 'user',
      content: incoming.body,
      twilioMessageSid: incoming.sid,
      fromNumber: incoming.from,
      toNumber: incoming.to,
    }).returning();

    // Get companion config
    const companion = await db.query.companions.findFirst({
      where: eq(companions.userId, user.id),
    });

    const companionConfig: CompanionConfig = companion ? {
      id: companion.id,
      name: companion.name,
      pronouns: companion.pronouns || 'they/them',
      personality: companion.personality as CompanionConfig['personality'] || defaultPersonality(),
      rules: companion.rules as CompanionConfig['rules'] || {},
      communicationStyle: companion.communicationStyle as CompanionConfig['communicationStyle'] || defaultCommunicationStyle(),
      customInstructions: companion.customInstructions || undefined,
    } : defaultCompanionConfig();

    // Build context
    const context = await buildUserContext(user.id, user, incoming.body);

    // Generate response
    const engine = new CompanionEngine(companionConfig);
    const startTime = Date.now();
    const response = await engine.respond(incoming.body, context);
    const latencyMs = Date.now() - startTime;

    // Store assistant message
    await db.insert(messages).values({
      conversationId: conversation.id,
      userId: user.id,
      role: 'assistant',
      content: response.content,
      fromNumber: incoming.to,
      toNumber: incoming.from,
      processedAt: new Date(),
      responseLatencyMs: latencyMs,
      detectedIntent: response.intent.primary,
      intentConfidence: Math.round(response.intent.confidence * 100),
    });

    // Store extracted memories with conflict resolution
    if (response.extractedMemories.length > 0) {
      for (const memory of response.extractedMemories) {
        const embedding = await generateEmbedding(memory.content);

        // Check for conflicting memories
        const existingMemories = await db.query.memories.findMany({
          where: eq(memories.userId, user.id),
          columns: { id: true, content: true },
          limit: 50,
          orderBy: [desc(memories.importance)],
        });

        let metadata: Record<string, unknown> = {
          people: memory.people,
          emotion: memory.emotion,
        };

        if (existingMemories.length > 0) {
          try {
            const conflicts = await checkMemoryConflicts(memory, existingMemories);

            // Mark superseded memories as less important
            if (conflicts.supersedes.length > 0) {
              for (const supersededId of conflicts.supersedes) {
                await db.update(memories)
                  .set({
                    importance: 1,
                    metadata: { supersededBy: 'new_memory', supersededAt: new Date().toISOString() },
                  })
                  .where(eq(memories.id, supersededId));
              }
              metadata.supersedes = conflicts.supersedes;
            }

            if (conflicts.relatedTo.length > 0) {
              metadata.relatedTo = conflicts.relatedTo;
            }
          } catch (error) {
            console.error('Memory conflict check failed:', error);
          }
        }

        await db.insert(memories).values({
          userId: user.id,
          content: memory.content,
          embedding: serializeEmbedding(embedding),
          category: memory.category,
          importance: memory.importance,
          sourceType: 'conversation',
          sourceId: userMessage.id,
          metadata,
        });
      }
    }

    // Update conversation
    await db.update(conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: (conversation.messageCount || 0) + 2,
      })
      .where(eq(conversations.id, conversation.id));

    // Send SMS response
    await sendSms({
      from: incoming.to,
      to: incoming.from,
      body: response.content,
    });

    // Return empty TwiML (we send via API, not TwiML response)
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * Status callback for message delivery status
 */
smsRouter.post('/status', async (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  console.log(`Message ${MessageSid} status: ${MessageStatus}`);
  res.status(200).send('OK');
});

async function buildUserContext(
  userId: string,
  user: { name: string | null; timezone: string | null },
  currentMessage: string
): Promise<UserContext> {
  // Get recent messages
  const recentDbMessages = await db.query.messages.findMany({
    where: eq(messages.userId, userId),
    orderBy: desc(messages.createdAt),
    limit: 10,
  });

  const recentMessages: MessageContext[] = recentDbMessages.reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: m.createdAt,
  }));

  // Search for relevant memories
  let relevantMemories: MemoryContext[] = [];
  try {
    const queryEmbedding = await generateEmbedding(currentMessage);
    const similarMemories = await searchMemoriesByEmbedding(userId, queryEmbedding, 5, 0.6);
    relevantMemories = similarMemories.map((m) => ({
      id: m.id,
      content: m.content,
      category: m.category,
      importance: m.importance,
      relevanceScore: m.similarity,
    }));
  } catch (error) {
    console.error('Memory search failed:', error);
  }

  // Load active goals
  const activeGoals: GoalContext[] = [];
  try {
    const userGoals = await db.query.goals.findMany({
      where: and(eq(goals.userId, userId), eq(goals.status, 'active')),
      orderBy: [desc(goals.priority)],
      limit: 5,
    });
    for (const goal of userGoals) {
      activeGoals.push({
        id: goal.id,
        title: goal.title,
        type: goal.type,
        progress: goal.progressPercentage || 0,
        targetDate: goal.targetDate || undefined,
      });
    }
  } catch (error) {
    console.error('Failed to load goals:', error);
  }

  // Load upcoming events (next 7 days)
  const upcomingEvents: EventContext[] = [];
  try {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const userEvents = await db.query.events.findMany({
      where: and(
        eq(events.userId, userId),
        eq(events.status, 'scheduled'),
        gte(events.startTime, now),
        lte(events.startTime, weekFromNow)
      ),
      orderBy: events.startTime,
      limit: 10,
    });
    for (const event of userEvents) {
      upcomingEvents.push({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime || undefined,
        location: event.location || undefined,
      });
    }
  } catch (error) {
    console.error('Failed to load events:', error);
  }

  return {
    userId,
    userName: user.name || undefined,
    timezone: user.timezone || 'UTC',
    currentTime: new Date(),
    recentMessages,
    relevantMemories,
    activeGoals,
    upcomingEvents,
    recentPeople: [],
  };
}

function defaultPersonality(): CompanionConfig['personality'] {
  return {
    warmth: 7,
    humor: 5,
    directness: 6,
    formality: 3,
    curiosity: 7,
    encouragement: 7,
    traits: [],
  };
}

function defaultCommunicationStyle(): CompanionConfig['communicationStyle'] {
  return {
    emojiFrequency: 'moderate',
    brevity: 'short',
    addressStyle: 'nickname',
  };
}

function defaultCompanionConfig(): CompanionConfig {
  return {
    id: 'default',
    name: 'Fawn',
    pronouns: 'they/them',
    personality: defaultPersonality(),
    rules: { holdAccountable: true, accountabilityLevel: 'moderate' },
    communicationStyle: defaultCommunicationStyle(),
  };
}
