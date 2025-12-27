import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, date, real, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { lifeAreas } from './memories';

// Goals - what you're working towards
export const goals = pgTable('fawn_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  lifeAreaId: uuid('life_area_id').references(() => lifeAreas.id),

  // Goal definition
  title: text('title').notNull(),
  description: text('description'),
  why: text('why'), // Motivation - why this matters

  // Type and scope
  type: text('type').notNull(), // 'habit', 'outcome', 'process', 'milestone'
  timeframe: text('timeframe'), // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'ongoing'

  // Target and progress
  targetValue: real('target_value'),
  targetUnit: text('target_unit'),
  currentValue: real('current_value').default(0),
  progressPercentage: real('progress_percentage').default(0),

  // Dates
  startDate: date('start_date'),
  targetDate: date('target_date'),
  completedAt: timestamp('completed_at'),

  // Status
  status: text('status').default('active'), // 'active', 'paused', 'completed', 'abandoned'
  priority: integer('priority').default(5), // 1-10

  // Tracking settings
  trackingFrequency: text('tracking_frequency'), // 'daily', 'weekly', 'on_action'
  reminderEnabled: boolean('reminder_enabled').default(false),
  reminderTime: text('reminder_time'),
  reminderDays: integer('reminder_days').array(), // 0-6 for Sunday-Saturday

  // AI coaching
  coachingStyle: text('coaching_style'), // 'encouraging', 'strict', 'analytical'
  checkInFrequency: text('check_in_frequency'),

  metadata: jsonb('metadata').$type<GoalMetadata>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('goals_user_idx').on(table.userId),
  statusIdx: index('goals_status_idx').on(table.status),
}));

// Goal progress entries
export const goalProgress = pgTable('fawn_goal_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').references(() => goals.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // What happened
  value: real('value'),
  note: text('note'),
  mood: text('mood'),

  // Source of this entry
  sourceType: text('source_type').notNull(), // 'manual', 'conversation', 'integration', 'check_in'
  sourceMessageId: uuid('source_message_id'),

  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  goalIdx: index('goal_progress_goal_idx').on(table.goalId),
  recordedAtIdx: index('goal_progress_recorded_at_idx').on(table.recordedAt),
}));

// Goal milestones / sub-goals
export const goalMilestones = pgTable('fawn_goal_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').references(() => goals.id).notNull(),

  title: text('title').notNull(),
  description: text('description'),
  targetDate: date('target_date'),
  completedAt: timestamp('completed_at'),
  order: integer('order').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Habits - recurring behaviors (special type of goal)
export const habits = pgTable('fawn_habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  goalId: uuid('goal_id').references(() => goals.id),

  name: text('name').notNull(),
  description: text('description'),
  cue: text('cue'), // What triggers this habit
  routine: text('routine'), // The behavior
  reward: text('reward'), // The reward

  // Frequency
  frequency: text('frequency').notNull(), // 'daily', 'weekly', 'custom'
  frequencyDays: integer('frequency_days').array(), // For weekly: which days
  timesPerPeriod: integer('times_per_period').default(1),

  // Streaks
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastCompletedAt: timestamp('last_completed_at'),

  // Status
  active: boolean('active').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Habit completions
export const habitCompletions = pgTable('fawn_habit_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').references(() => habits.id).notNull(),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
  note: text('note'),
  quality: integer('quality'), // 1-5 how well did you do it
  sourceType: text('source_type').default('manual'),
});

export interface GoalMetadata {
  obstacles?: string[];
  strategies?: string[];
  accountability?: {
    partner?: string;
    checkInSchedule?: string;
  };
  celebrationPlan?: string;
  fallbackPlan?: string;
}

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalProgress = typeof goalProgress.$inferSelect;
export type Habit = typeof habits.$inferSelect;
