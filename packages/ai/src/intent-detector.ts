import Anthropic from '@anthropic-ai/sdk';
import type { DetectedIntent } from './types';

const anthropic = new Anthropic();

export const INTENTS = {
  // Scheduling
  SCHEDULE_EVENT: 'schedule_event',
  CANCEL_EVENT: 'cancel_event',
  CHECK_SCHEDULE: 'check_schedule',
  SET_REMINDER: 'set_reminder',

  // Tasks
  CREATE_TASK: 'create_task',
  COMPLETE_TASK: 'complete_task',
  LIST_TASKS: 'list_tasks',

  // Goals
  SET_GOAL: 'set_goal',
  UPDATE_GOAL: 'update_goal',
  CHECK_GOAL_PROGRESS: 'check_goal_progress',
  LOG_HABIT: 'log_habit',

  // Memory
  REMEMBER: 'remember',
  RECALL: 'recall',
  SEARCH: 'search',

  // People
  ADD_PERSON: 'add_person',
  UPDATE_PERSON: 'update_person',
  ASK_ABOUT_PERSON: 'ask_about_person',

  // Conversation
  GREETING: 'greeting',
  SMALL_TALK: 'small_talk',
  EMOTIONAL_SUPPORT: 'emotional_support',
  ADVICE: 'advice',
  REFLECTION: 'reflection',

  // Meta
  SETTINGS: 'settings',
  HELP: 'help',
  UNKNOWN: 'unknown',
} as const;

const INTENT_DETECTION_PROMPT = `You are an intent detection system for a personal AI companion. Analyze the user's message and determine their intent.

Possible intents:
- schedule_event: User wants to schedule something (meeting, appointment, event)
- cancel_event: User wants to cancel a scheduled event
- check_schedule: User wants to know what's on their schedule
- set_reminder: User wants to be reminded about something
- create_task: User wants to add a task/todo
- complete_task: User marks something as done
- list_tasks: User wants to see their tasks
- set_goal: User wants to set a new goal
- update_goal: User wants to update progress on a goal
- check_goal_progress: User asks about goal progress
- log_habit: User reports completing a habit
- remember: User explicitly asks you to remember something
- recall: User asks about something from their past/memories
- search: User wants to search through their information
- add_person: User mentions a new person to remember
- update_person: User shares info about someone they know
- ask_about_person: User asks about someone in their life
- greeting: Simple greeting
- small_talk: Casual conversation
- emotional_support: User is sharing feelings and needs support
- advice: User is asking for advice
- reflection: User is reflecting on their life/choices
- settings: User wants to change companion settings
- help: User needs help using the system
- unknown: Cannot determine intent

Extract relevant entities (names, dates, times, etc.) from the message.

Respond with JSON:
{
  "primary": "intent_name",
  "confidence": 0.0-1.0,
  "entities": { "key": "value" },
  "requiresAction": true/false,
  "actionType": "create/update/delete/query" or null
}`;

/**
 * Detect the user's intent from their message
 */
export async function detectIntent(
  message: string,
  recentContext?: string
): Promise<DetectedIntent> {
  const contextNote = recentContext
    ? `\n\nRecent conversation context:\n${recentContext}`
    : '';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: INTENT_DETECTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Detect the intent of this message:${contextNote}\n\nMessage: "${message}"`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return defaultIntent();
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return defaultIntent();
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      primary: parsed.primary || INTENTS.UNKNOWN,
      confidence: parsed.confidence || 0.5,
      entities: parsed.entities || {},
      requiresAction: parsed.requiresAction || false,
      actionType: parsed.actionType,
    };
  } catch (error) {
    console.error('Intent detection failed:', error);
    return defaultIntent();
  }
}

function defaultIntent(): DetectedIntent {
  return {
    primary: INTENTS.UNKNOWN,
    confidence: 0,
    entities: {},
    requiresAction: false,
  };
}

/**
 * Quick intent classification without API call for common patterns
 */
export function quickIntentMatch(message: string): DetectedIntent | null {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hey|hello|morning|evening|afternoon|yo|sup)\b/i.test(lower)) {
    return {
      primary: INTENTS.GREETING,
      confidence: 0.9,
      entities: {},
      requiresAction: false,
    };
  }

  // Remember requests
  if (/^(remember|don't forget|note that|keep in mind)/i.test(lower)) {
    return {
      primary: INTENTS.REMEMBER,
      confidence: 0.85,
      entities: { content: message.replace(/^(remember|don't forget|note that|keep in mind)\s*/i, '') },
      requiresAction: true,
      actionType: 'create',
    };
  }

  // Schedule checks
  if (/^(what('s| is) (on )?(my )?(schedule|calendar)|what do i have)/i.test(lower)) {
    return {
      primary: INTENTS.CHECK_SCHEDULE,
      confidence: 0.9,
      entities: {},
      requiresAction: true,
      actionType: 'query',
    };
  }

  // Reminder requests
  if (/^(remind me|set a reminder|don't let me forget)/i.test(lower)) {
    return {
      primary: INTENTS.SET_REMINDER,
      confidence: 0.85,
      entities: {},
      requiresAction: true,
      actionType: 'create',
    };
  }

  return null;
}
