import { pgTable, uuid, text, timestamp, jsonb, integer, date, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// People in the user's life
export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Basic info
  name: text('name').notNull(),
  nickname: text('nickname'),
  relationship: text('relationship'), // 'friend', 'family', 'colleague', 'partner', 'acquaintance'
  specificRelationship: text('specific_relationship'), // 'mother', 'best friend', 'manager', etc.

  // Contact
  phoneNumber: text('phone_number'),
  email: text('email'),

  // Important dates
  birthday: date('birthday'),
  anniversary: date('anniversary'),
  importantDates: jsonb('important_dates').$type<ImportantDate[]>(),

  // Context
  howWeMet: text('how_we_met'),
  sharedInterests: text('shared_interests').array(),
  notes: text('notes'),

  // Interaction tracking
  lastContactedAt: timestamp('last_contacted_at'),
  desiredContactFrequency: text('desired_contact_frequency'), // 'daily', 'weekly', 'monthly', 'quarterly'
  lastMentionedAt: timestamp('last_mentioned_at'),

  // Relationship health
  relationshipScore: integer('relationship_score'), // 1-10, how healthy is this relationship
  needsAttention: integer('needs_attention').default(0),

  metadata: jsonb('metadata').$type<PersonMetadata>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('people_user_idx').on(table.userId),
  nameIdx: index('people_name_idx').on(table.name),
}));

// Relationship notes - observations about interactions
export const relationshipNotes = pgTable('relationship_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id').references(() => people.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  content: text('content').notNull(),
  sentiment: text('sentiment'), // 'positive', 'neutral', 'negative', 'mixed'
  topics: text('topics').array(),

  sourceType: text('source_type').default('conversation'),
  sourceMessageId: uuid('source_message_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Gift ideas and preferences for people
export const personPreferences = pgTable('person_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id').references(() => people.id).notNull(),

  category: text('category').notNull(), // 'gift_idea', 'likes', 'dislikes', 'allergy', 'preference'
  content: text('content').notNull(),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export interface ImportantDate {
  date: string;
  label: string;
  recurring: boolean;
  reminder?: boolean;
}

export interface PersonMetadata {
  workplace?: string;
  title?: string;
  location?: string;
  socialProfiles?: { platform: string; handle: string }[];
  family?: { relation: string; name: string }[];
  pets?: string[];
}

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
