import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// SMS conversation threads
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Thread metadata
  startedAt: timestamp('started_at').defaultNow().notNull(),
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),

  // Context window management
  activeContextSummary: text('active_context_summary'),
  lastContextRefreshAt: timestamp('last_context_refresh_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('conversations_user_idx').on(table.userId),
  lastMessageIdx: index('conversations_last_message_idx').on(table.lastMessageAt),
}));

// Individual messages in the conversation
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Message content
  role: text('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),

  // Twilio metadata
  twilioMessageSid: text('twilio_message_sid'),
  fromNumber: text('from_number'),
  toNumber: text('to_number'),

  // Processing metadata
  processedAt: timestamp('processed_at'),
  responseLatencyMs: integer('response_latency_ms'),

  // Memory extraction
  memoriesExtracted: boolean('memories_extracted').default(false),
  extractedMemoryIds: uuid('extracted_memory_ids').array(),

  // For threading/context
  embedding: text('embedding'),

  // Intent detection
  detectedIntent: text('detected_intent'),
  intentConfidence: integer('intent_confidence'),

  metadata: jsonb('metadata').$type<MessageMetadata>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index('messages_conversation_idx').on(table.conversationId),
  userIdx: index('messages_user_idx').on(table.userId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
}));

// Quick replies / suggested responses
export const suggestedReplies = pgTable('suggested_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id).notNull(),
  content: text('content').notNull(),
  intent: text('intent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export interface MessageMetadata {
  // Media attachments (MMS)
  mediaUrls?: string[];
  mediaTypes?: string[];

  // If this was part of a multi-message response
  partOf?: string;
  partNumber?: number;
  totalParts?: number;

  // Error tracking
  error?: string;
  retryCount?: number;

  // Model info
  model?: string;
  tokensUsed?: number;
}

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
