import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// Core user account
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Optional for existing users
  name: text('name'),
  timezone: text('timezone').default('UTC'),
  phoneNumber: text('phone_number'), // User's personal phone
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  onboardingComplete: boolean('onboarding_complete').default(false),
  preferences: jsonb('preferences').$type<UserPreferences>(),
});

// Assigned Twilio phone number for the AI companion
export const assignedPhoneNumbers = pgTable('assigned_phone_numbers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  phoneNumber: text('phone_number').notNull().unique(), // Twilio number
  twilioSid: text('twilio_sid').notNull(),
  active: boolean('active').default(true),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

export interface UserPreferences {
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"
  dailyCheckInTime?: string;
  weeklyReviewDay?: number; // 0-6, Sunday-Saturday
  language?: string;
  messageStyle?: 'concise' | 'detailed' | 'balanced';
}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AssignedPhoneNumber = typeof assignedPhoneNumbers.$inferSelect;
