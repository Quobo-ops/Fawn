import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// Events and scheduled items
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Event details
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),

  // Timing
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  allDay: boolean('all_day').default(false),
  timezone: text('timezone'),

  // Recurrence
  recurring: boolean('recurring').default(false),
  recurrenceRule: text('recurrence_rule'), // iCal RRULE format
  recurrenceEndDate: timestamp('recurrence_end_date'),

  // Type and source
  eventType: text('event_type'), // 'meeting', 'appointment', 'reminder', 'task', 'booking'
  sourceType: text('source_type').notNull(), // 'conversation', 'integration', 'manual'
  externalId: text('external_id'), // For synced events
  externalSource: text('external_source'), // 'google_calendar', 'outlook', etc.

  // Reminders
  reminders: jsonb('reminders').$type<EventReminder[]>(),
  remindersSent: jsonb('reminders_sent').$type<string[]>(),

  // Status
  status: text('status').default('scheduled'), // 'scheduled', 'completed', 'cancelled'
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),

  // Context
  relatedGoalId: uuid('related_goal_id'),
  participants: text('participants').array(),
  tags: text('tags').array(),

  metadata: jsonb('metadata').$type<EventMetadata>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('events_user_idx').on(table.userId),
  startTimeIdx: index('events_start_time_idx').on(table.startTime),
  statusIdx: index('events_status_idx').on(table.status),
}));

// Tasks - items that need to be done (no specific time)
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  title: text('title').notNull(),
  description: text('description'),

  // Priority and effort
  priority: text('priority').default('medium'), // 'low', 'medium', 'high', 'urgent'
  estimatedMinutes: integer('estimated_minutes'),
  actualMinutes: integer('actual_minutes'),

  // Due date (optional)
  dueDate: timestamp('due_date'),
  dueType: text('due_type'), // 'hard' (must be done by), 'soft' (should be done by)

  // Status
  status: text('status').default('pending'), // 'pending', 'in_progress', 'completed', 'cancelled', 'deferred'
  completedAt: timestamp('completed_at'),

  // Context
  context: text('context'), // '@home', '@work', '@errands', etc. (GTD-style)
  energy: text('energy'), // 'high', 'medium', 'low' - energy level needed
  relatedGoalId: uuid('related_goal_id'),
  parentTaskId: uuid('parent_task_id'),

  // Source
  sourceType: text('source_type').default('conversation'),
  sourceMessageId: uuid('source_message_id'),

  tags: text('tags').array(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('tasks_user_idx').on(table.userId),
  statusIdx: index('tasks_status_idx').on(table.status),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
}));

// Reminders - proactive check-ins from the companion
export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // What to remind about
  content: text('content').notNull(),
  context: text('context'), // Additional context for the AI

  // When
  triggerAt: timestamp('trigger_at').notNull(),

  // Recurrence
  recurring: boolean('recurring').default(false),
  recurrenceRule: text('recurrence_rule'),

  // Status
  sent: boolean('sent').default(false),
  sentAt: timestamp('sent_at'),
  snoozedUntil: timestamp('snoozed_until'),
  dismissed: boolean('dismissed').default(false),

  // Type
  reminderType: text('reminder_type').default('custom'), // 'custom', 'goal_check_in', 'habit', 'event', 'follow_up'
  relatedEntityType: text('related_entity_type'),
  relatedEntityId: uuid('related_entity_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('reminders_user_idx').on(table.userId),
  triggerAtIdx: index('reminders_trigger_at_idx').on(table.triggerAt),
  sentIdx: index('reminders_sent_idx').on(table.sent),
}));

export interface EventReminder {
  minutesBefore: number;
  method: 'sms' | 'push';
}

export interface EventMetadata {
  bookingConfirmation?: string;
  bookingReference?: string;
  meetingLink?: string;
  notes?: string;
  preparation?: string[];
  followUp?: string[];
}

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
