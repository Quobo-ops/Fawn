import { Router } from 'express';
import { db, users, assignedPhoneNumbers, conversations, messages, companions, memories, goals, events, searchMemoriesByEmbedding } from '@fawn/database';
import { parseIncomingSms, sendSms, validateTwilioWebhook } from '@fawn/sms';
import { CompanionEngine, generateEmbedding, serializeEmbedding, checkMemoryConflicts } from '@fawn/ai';
import type { CompanionConfig, UserContext, MemoryContext, GoalContext, EventContext, MessageContext } from '@fawn/ai';
import { eq, and, desc, gte, lte, or } from 'drizzle-orm';

export const smsRouter = Router();

/**
 * Twilio webhook for incoming SMS messages
 */
smsRouter.post('/webhook', async (req, res) => {
  let userPhoneNumber: string | null = null;
  let userId: string | null = null;
  let twilioNumber: string | null = null;
  
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
    console.log(`[INFO] Incoming SMS from ${incoming.from}: ${incoming.body}`);
    twilioNumber = incoming.to;

    // Find user by their assigned companion phone number
    const assignedNumber = await db.query.assignedPhoneNumbers.findFirst({
      where: eq(assignedPhoneNumbers.phoneNumber, incoming.to),
    });

    if (!assignedNumber) {
      console.error(`[ERROR] No user found for number ${incoming.to}`);
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, assignedNumber.userId),
    });

    if (!user) {
      console.error(`[ERROR] User not found: ${assignedNumber.userId}`);
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    userPhoneNumber = incoming.from;
    userId = user.id;

    // Verify the sender is the user's phone
    if (user.phoneNumber !== incoming.from) {
      console.warn(`[WARN] Message from unknown number ${incoming.from} for user ${user.id}`);
      // Could be legitimate - maybe user has multiple phones. For now, allow it.
    }

    // Get or create conversation
    let conversation;
    try {
      conversation = await db.query.conversations.findFirst({
        where: eq(conversations.userId, user.id),
        orderBy: desc(conversations.lastMessageAt),
      });

      if (!conversation) {
        const [newConversation] = await db.insert(conversations).values({
          userId: user.id,
        }).returning();
        conversation = newConversation;
      }
    } catch (error) {
      console.error(`[ERROR] Failed to get/create conversation for user ${user.id}:`, error);
      await sendErrorSms(twilioNumber, userPhoneNumber, "I'm having trouble right now. Please try again.");
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Store incoming message
    let userMessage;
    try {
      [userMessage] = await db.insert(messages).values({
        conversationId: conversation.id,
        userId: user.id,
        role: 'user',
        content: incoming.body,
        twilioMessageSid: incoming.sid,
        fromNumber: incoming.from,
        toNumber: incoming.to,
      }).returning();
    } catch (error) {
      console.error(`[ERROR] Failed to store user message for user ${user.id}:`, error);
      await sendErrorSms(twilioNumber, userPhoneNumber, "I'm having trouble right now. Please try again.");
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Get companion config
    let companionConfig: CompanionConfig;
    try {
      const companion = await db.query.companions.findFirst({
        where: eq(companions.userId, user.id),
      });

      companionConfig = companion ? {
        id: companion.id,
        name: companion.name,
        pronouns: companion.pronouns || 'they/them',
        personality: companion.personality as CompanionConfig['personality'] || defaultPersonality(),
        rules: companion.rules as CompanionConfig['rules'] || {},
        communicationStyle: companion.communicationStyle as CompanionConfig['communicationStyle'] || defaultCommunicationStyle(),
        customInstructions: companion.customInstructions || undefined,
      } : defaultCompanionConfig();
    } catch (error) {
      console.error(`[ERROR] Failed to load companion config for user ${user.id}:`, error);
      companionConfig = defaultCompanionConfig();
    }

    // Build context
    let context: UserContext;
    try {
      context = await buildUserContext(user.id, user, incoming.body);
    } catch (error) {
      console.error(`[ERROR] Failed to build context for user ${user.id}:`, error);
      // Use minimal context
      context = {
        userId: user.id,
        userName: user.name || undefined,
        timezone: user.timezone || 'UTC',
        currentTime: new Date(),
        recentMessages: [],
        relevantMemories: [],
        activeGoals: [],
        upcomingEvents: [],
        recentPeople: [],
      };
    }

    // Generate response
    const engine = new CompanionEngine(companionConfig);
    const startTime = Date.now();
    let response;
    try {
      response = await engine.respond(incoming.body, context);
    } catch (error) {
      console.error(`[ERROR] Failed to generate response for user ${user.id}:`, error);
      await sendErrorSms(twilioNumber, userPhoneNumber, "Sorry, I'm having trouble processing that right now. Can you try again?");
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }
    
    const latencyMs = Date.now() - startTime;
    console.log(`[INFO] Generated response in ${latencyMs}ms for user ${user.id}`);

    // Store assistant message
    try {
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
    } catch (error) {
      console.error(`[ERROR] Failed to store assistant message for user ${user.id}:`, error);
      // Continue anyway - we still want to send the response
    }

    // Store extracted memories with conflict resolution (handle each individually)
    if (response.extractedMemories.length > 0) {
      console.log(`[INFO] Storing ${response.extractedMemories.length} memories for user ${user.id}`);
      for (const memory of response.extractedMemories) {
        try {
          const embedding = await generateEmbedding(memory.content);
          if (!embedding || embedding.length === 0) {
            console.warn(`[WARN] Failed to generate embedding for memory: ${memory.content.substring(0, 50)}...`);
            continue;
          }

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
            } catch (conflictError) {
              console.error('[ERROR] Memory conflict check failed:', conflictError);
              // Continue with storing the memory anyway
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
        } catch (error) {
          console.error(`[ERROR] Failed to store memory for user ${user.id}:`, error, {
            memoryContent: memory.content.substring(0, 100),
            category: memory.category,
          });
          // Continue with next memory instead of failing completely
        }
      }
    }

    // Update conversation
    try {
      await db.update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: (conversation.messageCount || 0) + 2,
        })
        .where(eq(conversations.id, conversation.id));
    } catch (error) {
      console.error(`[ERROR] Failed to update conversation for user ${user.id}:`, error);
      // Non-critical, continue
    }

    // Send SMS response
    try {
      await sendSms({
        from: incoming.to,
        to: incoming.from,
        body: response.content,
      });
      console.log(`[INFO] Sent SMS response to ${incoming.from}`);
    } catch (error) {
      console.error(`[ERROR] Failed to send SMS response to ${incoming.from}:`, error, {
        userId: user.id,
        messageLength: response.content.length,
      });
      // Try to notify user about the failure
      await sendErrorSms(twilioNumber, userPhoneNumber, "I received your message but had trouble sending my response. Please try again.");
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Return empty TwiML (we send via API, not TwiML response)
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error) {
    console.error('[ERROR] SMS webhook error:', error, {
      userPhoneNumber,
      userId,
      requestBody: req.body,
    });
    
    // Try to send error notification to user if we have their number
    await sendErrorSms(twilioNumber, userPhoneNumber, "I'm experiencing technical difficulties. Please try again in a moment.");
    
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * Helper to send error SMS to user
 */
async function sendErrorSms(from: string | null, to: string | null, message: string): Promise<void> {
  if (!from || !to) return;
  
  try {
    await sendSms({ from, to, body: message });
  } catch (smsError) {
    console.error('[ERROR] Failed to send error notification SMS:', smsError);
  }
}

/**
 * Status callback for message delivery status
 */
smsRouter.post('/status', async (req, res) => {
  try {
    const { MessageSid, MessageStatus } = req.body;
    console.log(`[INFO] Message ${MessageSid} status: ${MessageStatus}`);
    res.status(200).send('OK');
  } catch (error) {
    console.error('[ERROR] Status callback error:', error);
    res.status(200).send('OK'); // Always return OK to Twilio
  }
});

async function buildUserContext(
  userId: string,
  user: { name: string | null; timezone: string | null },
  currentMessage: string
): Promise<UserContext> {
  // Get recent messages
  let recentMessages: MessageContext[] = [];
  try {
    const recentDbMessages = await db.query.messages.findMany({
      where: eq(messages.userId, userId),
      orderBy: desc(messages.createdAt),
      limit: 10,
    });

    recentMessages = recentDbMessages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt,
    }));
  } catch (error) {
    console.error(`[ERROR] Failed to load recent messages for user ${userId}:`, error);
  }

  // Search for relevant memories (only if embeddings are available)
  let relevantMemories: MemoryContext[] = [];
  try {
    const queryEmbedding = await generateEmbedding(currentMessage);
    
    // Only search if we got a valid embedding with actual dimensions
    if (queryEmbedding && Array.isArray(queryEmbedding) && queryEmbedding.length > 0 && typeof queryEmbedding[0] === 'number') {
      try {
        const similarMemories = await searchMemoriesByEmbedding(userId, queryEmbedding, 5, 0.6);
        relevantMemories = similarMemories.map((m) => ({
          id: m.id,
          content: m.content,
          category: m.category,
          importance: m.importance,
          relevanceScore: m.similarity,
        }));
      } catch (searchError) {
        console.error(`[ERROR] Memory search failed for user ${userId}:`, searchError);
      }
    }
  } catch (error) {
    console.error(`[ERROR] Memory embedding generation failed for user ${userId}:`, error);
  }

  // Load active goals
  let activeGoals: GoalContext[] = [];
  try {
    const userGoals = await db.query.goals.findMany({
      where: and(
        eq(goals.userId, userId),
        eq(goals.status, 'active')
      ),
      orderBy: desc(goals.priority),
      limit: 5,
    });

    activeGoals = userGoals.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      description: g.description || undefined,
      progress: g.progressPercentage || 0,
      targetDate: g.targetDate ? g.targetDate : undefined,
    }));
  } catch (error) {
    console.error(`[ERROR] Failed to load goals for user ${userId}:`, error);
  }

  // Load upcoming events (next 7 days)
  let upcomingEvents: EventContext[] = [];
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const userEvents = await db.query.events.findMany({
      where: and(
        eq(events.userId, userId),
        gte(events.startTime, now),
        lte(events.startTime, sevenDaysFromNow),
        or(eq(events.status, 'scheduled'), eq(events.status, 'completed'))
      ),
      orderBy: events.startTime,
      limit: 10,
    });

    upcomingEvents = userEvents.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || undefined,
      startTime: e.startTime,
      endTime: e.endTime || undefined,
      location: e.location || undefined,
    }));
  } catch (error) {
    console.error(`[ERROR] Failed to load events for user ${userId}:`, error);
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
    recentPeople: [], // TODO: Implement people tracking
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
