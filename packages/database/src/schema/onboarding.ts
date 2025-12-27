import { pgTable, uuid, text, timestamp, jsonb, integer, real } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Onboarding phase type for database storage.
 * The AI package has its own more detailed constants.
 */
export type OnboardingPhase = 'new' | 'getting_acquainted' | 'familiar' | 'established';

/**
 * Tracks the AI's knowledge about each user across different life areas.
 * This enables the AI to know what it knows and what gaps to fill.
 */
export const userKnowledgeProfiles = pgTable('fawn_user_knowledge_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),

  // Overall onboarding state
  onboardingPhase: text('onboarding_phase').$type<OnboardingPhase>().default('new').notNull(),
  totalMessageCount: integer('total_message_count').default(0).notNull(),

  // Knowledge scores per area (0-100)
  // Calculated based on memories in each category
  knowledgeScores: jsonb('knowledge_scores').$type<KnowledgeScores>().default({}).notNull(),

  // Track which questions have been asked to avoid repetition
  askedQuestions: jsonb('asked_questions').$type<AskedQuestion[]>().default([]).notNull(),

  // Last time knowledge was assessed
  lastAssessedAt: timestamp('last_assessed_at'),

  // When knowledge was last updated (new memory added)
  lastKnowledgeUpdateAt: timestamp('last_knowledge_update_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Suggested questions the AI can ask to fill knowledge gaps.
 * Pre-defined questions organized by knowledge area.
 */
export const onboardingQuestions = pgTable('fawn_onboarding_questions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Which knowledge area this question helps fill
  knowledgeArea: text('knowledge_area').notNull(),

  // The question template (may include {name} placeholder)
  question: text('question').notNull(),

  // Follow-up questions if the user gives certain responses
  followUps: jsonb('follow_ups').$type<string[]>(),

  // How important is this question (affects priority)
  priority: integer('priority').default(5).notNull(), // 1-10

  // Tags for filtering (e.g., 'early_stage', 'sensitive', 'casual')
  tags: text('tags').array(),

  // Is this a default system question or custom?
  isSystem: integer('is_system').default(1).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Knowledge scores by area - how well the AI knows each aspect of the user's life.
 */
export interface KnowledgeScores {
  [area: string]: {
    score: number;           // 0-100 knowledge level
    memoryCount: number;     // Number of memories in this area
    lastUpdated: string;     // ISO timestamp
    confidence: number;      // 0-1 confidence in the score
  };
}

/**
 * Track which questions have been asked to avoid repetition.
 */
export interface AskedQuestion {
  questionId?: string;       // Reference to onboardingQuestions if from there
  questionText: string;      // The actual question asked
  askedAt: string;           // ISO timestamp
  knowledgeArea: string;     // Which area it was about
  gotAnswer: boolean;        // Did they respond meaningfully?
}

export type UserKnowledgeProfile = typeof userKnowledgeProfiles.$inferSelect;
export type NewUserKnowledgeProfile = typeof userKnowledgeProfiles.$inferInsert;
export type OnboardingQuestion = typeof onboardingQuestions.$inferSelect;
