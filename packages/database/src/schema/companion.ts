import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

// The AI companion configuration per user
export const companions = pgTable('companions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),

  // Identity
  name: text('name').notNull().default('Fawn'),
  pronouns: text('pronouns').default('they/them'),

  // Personality configuration
  personality: jsonb('personality').$type<CompanionPersonality>(),

  // Rule sets and restrictions
  rules: jsonb('rules').$type<CompanionRules>(),

  // Custom instructions from user
  customInstructions: text('custom_instructions'),

  // Voice/tone settings
  communicationStyle: jsonb('communication_style').$type<CommunicationStyle>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Personality trait templates that users can mix and match
export const personalityTraits = pgTable('personality_traits', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  systemPromptFragment: text('system_prompt_fragment').notNull(),
  category: text('category'), // 'warmth', 'humor', 'directness', etc.
  isDefault: integer('is_default').default(0),
});

export interface CompanionPersonality {
  warmth: number;        // 1-10: cold to warm
  humor: number;         // 1-10: serious to playful
  directness: number;    // 1-10: gentle to direct
  formality: number;     // 1-10: casual to formal
  curiosity: number;     // 1-10: accepting to inquisitive
  encouragement: number; // 1-10: neutral to motivating
  traits: string[];      // IDs of selected personality traits
  customTraits?: string; // Free-form personality description
}

export interface CompanionRules {
  // Topics to avoid
  avoidTopics?: string[];

  // Topics that need gentle handling
  sensitiveTopics?: string[];

  // Hard restrictions
  neverDo?: string[];

  // Proactive behaviors
  shouldProactively?: string[];

  // Response boundaries
  maxMessageLength?: number;
  responseDelay?: { min: number; max: number }; // seconds, for more human feel

  // Accountability settings
  holdAccountable?: boolean;
  accountabilityLevel?: 'gentle' | 'moderate' | 'firm';
}

export interface CommunicationStyle {
  // Emoji usage
  emojiFrequency: 'never' | 'rare' | 'moderate' | 'frequent';

  // Message length preference
  brevity: 'very_short' | 'short' | 'medium' | 'detailed';

  // How to address the user
  addressStyle: 'name' | 'nickname' | 'none';
  nickname?: string;

  // Greeting style
  greetingStyle?: string;

  // Sign-off style
  signOffStyle?: string;
}

export type Companion = typeof companions.$inferSelect;
export type NewCompanion = typeof companions.$inferInsert;
