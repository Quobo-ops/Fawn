import { pgTable, uuid, text, timestamp, jsonb, index, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Research tasks - tracks deep research requests and their status
 */
export const researchTasks = pgTable('research_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // The research query
  query: text('query').notNull(),

  // Status tracking
  status: text('status').notNull().$type<'pending' | 'in_progress' | 'completed' | 'failed'>(),
  progress: integer('progress').default(0), // 0-100

  // Progress messaging
  currentStage: text('current_stage'), // 'planning', 'searching', 'analyzing', 'synthesizing', 'complete'
  statusMessage: text('status_message'),

  // Results
  summary: text('summary'),
  findings: jsonb('findings').$type<ResearchFinding[]>(),
  sources: jsonb('sources').$type<ResearchSource[]>(),

  // Stats
  searchesCompleted: integer('searches_completed').default(0),
  sourcesReviewed: integer('sources_reviewed').default(0),

  // Error tracking
  error: text('error'),
  retryCount: integer('retry_count').default(0),

  // SMS context
  conversationId: uuid('conversation_id'),
  triggerMessageId: uuid('trigger_message_id'),
  fromNumber: text('from_number'),
  toNumber: text('to_number'),

  // Timestamps
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  notifiedAt: timestamp('notified_at'), // When user was notified of completion
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('research_tasks_user_idx').on(table.userId),
  statusIdx: index('research_tasks_status_idx').on(table.status),
  createdAtIdx: index('research_tasks_created_at_idx').on(table.createdAt),
}));

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface ResearchFinding {
  topic: string;
  summary: string;
  details: string;
  sources: ResearchSource[];
  confidence: 'high' | 'medium' | 'low';
}

export type ResearchTask = typeof researchTasks.$inferSelect;
export type NewResearchTask = typeof researchTasks.$inferInsert;
