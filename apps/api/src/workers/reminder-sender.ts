import { db, reminders, users, assignedPhoneNumbers, companions } from '@fawn/database';
import { sendSms } from '@fawn/sms';
import { CompanionEngine } from '@fawn/ai';
import type { CompanionConfig, UserContext } from '@fawn/ai';
import { eq, and, lte, isNull, or } from 'drizzle-orm';

/**
 * Process and send pending reminders
 * This should be called periodically (e.g., every minute via cron)
 */
export async function processPendingReminders(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const now = new Date();
  let processed = 0;
  let sent = 0;
  let errors = 0;

  try {
    // Find all due reminders that haven't been sent
    const dueReminders = await db.query.reminders.findMany({
      where: and(
        eq(reminders.sent, false),
        eq(reminders.dismissed, false),
        lte(reminders.triggerAt, now),
        or(isNull(reminders.snoozedUntil), lte(reminders.snoozedUntil, now))
      ),
      limit: 50,
    });

    for (const reminder of dueReminders) {
      processed++;

      try {
        // Get user and their phone number
        const user = await db.query.users.findFirst({
          where: eq(users.id, reminder.userId),
        });

        if (!user) {
          console.error(`User not found for reminder ${reminder.id}`);
          errors++;
          continue;
        }

        const assignedNumber = await db.query.assignedPhoneNumbers.findFirst({
          where: eq(assignedPhoneNumbers.userId, reminder.userId),
        });

        if (!assignedNumber || !user.phoneNumber) {
          console.error(`No phone numbers for user ${reminder.userId}`);
          errors++;
          continue;
        }

        // Get companion config for personalized message
        const companion = await db.query.companions.findFirst({
          where: eq(companions.userId, reminder.userId),
        });

        let messageContent = reminder.content;

        // If there's context, generate a more personalized reminder message
        if (reminder.context && companion) {
          try {
            const companionConfig: CompanionConfig = {
              id: companion.id,
              name: companion.name,
              pronouns: companion.pronouns || 'they/them',
              personality: companion.personality as CompanionConfig['personality'] || defaultPersonality(),
              rules: companion.rules as CompanionConfig['rules'] || {},
              communicationStyle: companion.communicationStyle as CompanionConfig['communicationStyle'] || defaultCommunicationStyle(),
            };

            const engine = new CompanionEngine(companionConfig);
            const context: UserContext = {
              userId: user.id,
              userName: user.name || undefined,
              timezone: user.timezone || 'UTC',
              currentTime: now,
              recentMessages: [],
              relevantMemories: [],
              activeGoals: [],
              upcomingEvents: [],
              recentPeople: [],
            };

            messageContent = await engine.generateProactiveMessage(
              context,
              'reminder',
              `Remind the user about: ${reminder.content}. ${reminder.context || ''}`
            );
          } catch (error) {
            console.error('Failed to generate personalized reminder:', error);
            // Fall back to the original content
          }
        }

        // Send the SMS
        await sendSms({
          from: assignedNumber.phoneNumber,
          to: user.phoneNumber,
          body: messageContent,
        });

        // Mark reminder as sent
        await db.update(reminders)
          .set({
            sent: true,
            sentAt: now,
          })
          .where(eq(reminders.id, reminder.id));

        // Handle recurring reminders
        if (reminder.recurring && reminder.recurrenceRule) {
          const nextTrigger = calculateNextOccurrence(reminder.triggerAt, reminder.recurrenceRule);
          if (nextTrigger) {
            await db.insert(reminders).values({
              userId: reminder.userId,
              content: reminder.content,
              context: reminder.context,
              triggerAt: nextTrigger,
              recurring: true,
              recurrenceRule: reminder.recurrenceRule,
              reminderType: reminder.reminderType,
              relatedEntityType: reminder.relatedEntityType,
              relatedEntityId: reminder.relatedEntityId,
            });
          }
        }

        sent++;
        console.log(`Sent reminder ${reminder.id} to user ${reminder.userId}`);

      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        errors++;
      }
    }

  } catch (error) {
    console.error('Reminder processing failed:', error);
    throw error;
  }

  return { processed, sent, errors };
}

/**
 * Calculate next occurrence based on recurrence rule
 * Supports simple rules like 'daily', 'weekly', 'monthly'
 */
function calculateNextOccurrence(lastTrigger: Date, rule: string): Date | null {
  const date = new Date(lastTrigger);

  switch (rule.toLowerCase()) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      // For more complex rules (iCal RRULE format), we'd need a library
      console.warn(`Unsupported recurrence rule: ${rule}`);
      return null;
  }

  return date;
}

function defaultPersonality(): CompanionConfig['personality'] {
  return {
    warmth: 7,
    humor: 5,
    directness: 6,
    formality: 3,
    curiosity: 7,
    encouragement: 7,
    traits: [],
  };
}

function defaultCommunicationStyle(): CompanionConfig['communicationStyle'] {
  return {
    emojiFrequency: 'moderate',
    brevity: 'short',
    addressStyle: 'nickname',
  };
}

// If this file is run directly, process reminders once
if (require.main === module) {
  processPendingReminders()
    .then((result) => {
      console.log('Reminder processing complete:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Reminder processing failed:', error);
      process.exit(1);
    });
}
