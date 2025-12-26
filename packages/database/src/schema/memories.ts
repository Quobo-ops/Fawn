import { pgTable, uuid, text, timestamp, jsonb, index, real, integer, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// Core memory storage with vector embeddings
// This is where the "whole life context" lives
export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // The actual content/fact/memory
  content: text('content').notNull(),

  // Vector embedding for semantic search (1536 dimensions for OpenAI ada-002)
  embedding: text('embedding'), // Will be cast to vector in queries

  // Memory categorization
  category: text('category').notNull(), // 'fact', 'preference', 'goal', 'event', 'relationship', 'emotion', 'insight'
  subcategory: text('subcategory'),

  // Temporal context
  occurredAt: timestamp('occurred_at'), // When this thing happened/was relevant
  validFrom: timestamp('valid_from'),   // When this becomes true
  validUntil: timestamp('valid_until'), // When this stops being true (null = forever)

  // Source tracking
  sourceType: text('source_type').notNull(), // 'conversation', 'import', 'inferred', 'user_input'
  sourceId: uuid('source_id'), // Reference to conversation message, etc.

  // Importance and recall
  importance: integer('importance').default(5), // 1-10
  accessCount: integer('access_count').default(0),
  lastAccessedAt: timestamp('last_accessed_at'),

  // Metadata
  metadata: jsonb('metadata').$type<MemoryMetadata>(),
  tags: text('tags').array(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('memories_user_idx').on(table.userId),
  categoryIdx: index('memories_category_idx').on(table.category),
  importanceIdx: index('memories_importance_idx').on(table.importance),
}));

// Memory connections - how memories relate to each other
export const memoryConnections = pgTable('memory_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  memoryId: uuid('memory_id').references(() => memories.id).notNull(),
  relatedMemoryId: uuid('related_memory_id').references(() => memories.id).notNull(),
  relationshipType: text('relationship_type').notNull(), // 'supports', 'contradicts', 'caused_by', 'related_to'
  strength: real('strength').default(0.5), // 0-1
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Periodic summaries - compressed context for different time windows
export const memorySummaries = pgTable('memory_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  periodType: text('period_type').notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  summary: text('summary').notNull(),
  embedding: text('embedding'),
  highlights: jsonb('highlights').$type<string[]>(),
  mood: text('mood'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Life areas - domains of the user's life
export const lifeAreas = pgTable('life_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  importance: integer('importance').default(5),
  currentStatus: text('current_status'), // Free-form status
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export interface MemoryMetadata {
  // People involved
  people?: string[];

  // Location context
  location?: string;

  // Emotional context
  emotion?: string;
  emotionIntensity?: number;

  // Confidence in this memory
  confidence?: number;

  // If this memory supersedes another
  supersedes?: string; // memory ID

  // Custom fields
  [key: string]: unknown;
}

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type MemorySummary = typeof memorySummaries.$inferSelect;
export type LifeArea = typeof lifeAreas.$inferSelect;
