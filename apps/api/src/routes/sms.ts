import { Router } from 'express';
import { db, users, assignedPhoneNumbers, conversations, messages, companions, memories, searchMemoriesByEmbedding, userKnowledgeProfiles } from '@fawn/database';
import { parseIncomingSms, sendSms } from '@fawn/sms';
import { CompanionEngine, generateEmbedding, serializeEmbedding, buildOnboardingContext } from '@fawn/ai';
import type { CompanionConfig, UserContext, MemoryContext, GoalContext, MessageContext, OnboardingContext as OnboardingContextType } from '@fawn/ai';
import { eq, and, desc } from 'drizzle-orm';

export const smsRouter = Router();

/**
 * Twilio webhook for incoming SMS messages
 */
smsRouter.post('/webhook', async (req, res) => {
  try {
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

    // Store extracted memories
    if (response.extractedMemories.length > 0) {
      for (const memory of response.extractedMemories) {
        const embedding = await generateEmbedding(memory.content);
        await db.insert(memories).values({
          userId: user.id,
          content: memory.content,
          embedding: serializeEmbedding(embedding),
          category: memory.category,
          importance: memory.importance,
          sourceType: 'conversation',
          sourceId: userMessage.id,
          metadata: {
            people: memory.people,
            emotion: memory.emotion,
          },
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

    // Update knowledge profile (track onboarding progress)
    await updateKnowledgeProfile(user.id);

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

  // Build onboarding context
  const onboarding = await buildOnboardingContextForUser(userId);

  // TODO: Load active goals, upcoming events

  return {
    userId,
    userName: user.name || undefined,
    timezone: user.timezone || 'UTC',
    currentTime: new Date(),
    recentMessages,
    relevantMemories,
    activeGoals: [],
    upcomingEvents: [],
    recentPeople: [],
    onboarding,
  };
}

/**
 * Build onboarding context for a user based on their memories and message history.
 */
async function buildOnboardingContextForUser(userId: string): Promise<OnboardingContextType> {
  // Get or create knowledge profile
  let knowledgeProfile = await db.query.userKnowledgeProfiles.findFirst({
    where: eq(userKnowledgeProfiles.userId, userId),
  });

  if (!knowledgeProfile) {
    // Create new profile for new user
    const [newProfile] = await db.insert(userKnowledgeProfiles).values({
      userId,
      onboardingPhase: 'new',
      totalMessageCount: 0,
      knowledgeScores: {},
      askedQuestions: [],
    }).returning();
    knowledgeProfile = newProfile;
  }

  // Fetch all user memories for knowledge calculation
  const userMemories = await db.query.memories.findMany({
    where: eq(memories.userId, userId),
  });

  // Convert to format expected by knowledge profile calculator
  const memoriesForAnalysis = userMemories.map((m) => ({
    content: m.content,
    category: m.category,
    subcategory: m.subcategory || undefined,
    importance: m.importance || 5,
    createdAt: m.createdAt,
  }));

  // Get recently asked questions to avoid repetition
  const askedQuestions = (knowledgeProfile.askedQuestions || []) as Array<{
    questionText: string;
    knowledgeArea: string;
    askedAt: string;
  }>;
  const recentlyAskedQuestions = askedQuestions
    .filter((q) => {
      // Only consider questions asked in the last 24 hours
      const askedAt = new Date(q.askedAt);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return askedAt > dayAgo;
    })
    .map((q) => q.questionText);

  const recentlyAskedAreas = askedQuestions
    .filter((q) => {
      const askedAt = new Date(q.askedAt);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return askedAt > dayAgo;
    })
    .map((q) => q.knowledgeArea);

  // Build the context
  const onboardingData = buildOnboardingContext(
    knowledgeProfile.totalMessageCount,
    memoriesForAnalysis,
    recentlyAskedQuestions,
    recentlyAskedAreas
  );

  // Convert to the format expected by the types
  const result: OnboardingContextType = {
    phase: onboardingData.phase,
    messageCount: onboardingData.messageCount,
    overallKnowledgeLevel: onboardingData.overallKnowledgeLevel,
    topGaps: onboardingData.topGaps.map((gap) => ({
      area: gap.area,
      areaLabel: gap.areaLabel,
      currentScore: gap.currentScore,
      priority: gap.priority,
    })),
  };

  if (onboardingData.suggestedQuestion) {
    result.suggestedQuestion = {
      question: onboardingData.suggestedQuestion.question,
      area: onboardingData.suggestedQuestion.area,
    };
  }

  return result;
}

/**
 * Update the knowledge profile after a message exchange.
 */
async function updateKnowledgeProfile(userId: string): Promise<void> {
  try {
    // Get or create profile
    let profile = await db.query.userKnowledgeProfiles.findFirst({
      where: eq(userKnowledgeProfiles.userId, userId),
    });

    if (!profile) {
      await db.insert(userKnowledgeProfiles).values({
        userId,
        onboardingPhase: 'new',
        totalMessageCount: 1,
        knowledgeScores: {},
        askedQuestions: [],
      });
      return;
    }

    // Increment message count
    const newCount = (profile.totalMessageCount || 0) + 1;

    // Determine new phase based on message count
    let newPhase: 'new' | 'getting_acquainted' | 'familiar' | 'established' = 'new';
    if (newCount >= 100) {
      newPhase = 'established';
    } else if (newCount >= 25) {
      newPhase = 'familiar';
    } else if (newCount >= 5) {
      newPhase = 'getting_acquainted';
    }

    await db.update(userKnowledgeProfiles)
      .set({
        totalMessageCount: newCount,
        onboardingPhase: newPhase,
        lastKnowledgeUpdateAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userKnowledgeProfiles.userId, userId));
  } catch (error) {
    console.error('Failed to update knowledge profile:', error);
  }
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
