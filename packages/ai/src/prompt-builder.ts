import type { CompanionConfig, UserContext, OnboardingContext } from './types';

/**
 * Build the system prompt for the AI companion based on configuration and context
 */
export function buildSystemPrompt(
  config: CompanionConfig,
  context: UserContext
): string {
  const sections: string[] = [];

  // Core identity
  sections.push(buildIdentitySection(config, context.onboarding));

  // Personality traits
  sections.push(buildPersonalitySection(config.personality));

  // Onboarding behavior (new assistant learning about the user)
  if (context.onboarding) {
    sections.push(buildOnboardingSection(context.onboarding, context.userName));
  }

  // Communication style
  sections.push(buildCommunicationStyleSection(config.communicationStyle, context));

  // Rules and restrictions
  sections.push(buildRulesSection(config.rules));

  // Custom instructions
  if (config.customInstructions) {
    sections.push(`## Custom Instructions\n${config.customInstructions}`);
  }

  // Current context
  sections.push(buildContextSection(context));

  // Capabilities
  sections.push(buildCapabilitiesSection());

  return sections.join('\n\n');
}

function buildIdentitySection(config: CompanionConfig, onboarding?: OnboardingContext): string {
  const userName = config.communicationStyle.nickname || 'the user';

  // Adjust the identity based on onboarding phase
  let relationshipContext = '';
  if (onboarding) {
    switch (onboarding.phase) {
      case 'new':
        relationshipContext = `\n\nYou're newly introduced to ${userName} and are just starting to get to know them. You're eager to learn about their life, routines, preferences, and what matters to them. Ask questions naturally as part of conversation to build understanding.`;
        break;
      case 'getting_acquainted':
        relationshipContext = `\n\nYou're getting to know ${userName} and have learned some things about them (${onboarding.overallKnowledgeLevel}% understanding so far). Continue learning through natural conversation, but balance questions with being helpful.`;
        break;
      case 'familiar':
        relationshipContext = `\n\nYou know ${userName} fairly well now (${onboarding.overallKnowledgeLevel}% understanding). Focus on being helpful while occasionally filling in gaps in your knowledge when relevant.`;
        break;
      case 'established':
        relationshipContext = `\n\nYou have a well-established relationship with ${userName} (${onboarding.overallKnowledgeLevel}% understanding). Focus on being helpful and only ask questions when you encounter genuine gaps or changes in their life.`;
        break;
    }
  }

  return `# Identity

You are ${config.name}, a personal AI companion communicating via text message.
Your pronouns are ${config.pronouns}.

You exist to be a supportive, knowledgeable companion who helps ${userName} navigate their life. You have access to their memories, goals, schedule, and the context of their life.${relationshipContext}

This is a text message conversation. Keep responses conversational and appropriately sized for SMS.`;
}

function buildPersonalitySection(personality: CompanionConfig['personality']): string {
  const traits: string[] = [];

  // Map numeric values to descriptions
  if (personality.warmth >= 7) {
    traits.push('warm and caring in your responses');
  } else if (personality.warmth <= 3) {
    traits.push('professional and measured in tone');
  }

  if (personality.humor >= 7) {
    traits.push('playful with occasional humor');
  } else if (personality.humor <= 3) {
    traits.push('serious and focused');
  }

  if (personality.directness >= 7) {
    traits.push('direct and straightforward');
  } else if (personality.directness <= 3) {
    traits.push('gentle and diplomatic');
  }

  if (personality.formality >= 7) {
    traits.push('formal in language');
  } else if (personality.formality <= 3) {
    traits.push('casual and relaxed');
  }

  if (personality.curiosity >= 7) {
    traits.push('curious and asking follow-up questions');
  }

  if (personality.encouragement >= 7) {
    traits.push('motivating and encouraging');
  }

  let section = '## Personality\n\n';

  if (traits.length > 0) {
    section += `You are: ${traits.join(', ')}.\n\n`;
  }

  if (personality.customTraits) {
    section += `Additional personality notes: ${personality.customTraits}`;
  }

  return section;
}

function buildCommunicationStyleSection(
  style: CompanionConfig['communicationStyle'],
  context: UserContext
): string {
  const guidelines: string[] = [];

  // Emoji usage
  switch (style.emojiFrequency) {
    case 'never':
      guidelines.push('Never use emojis');
      break;
    case 'rare':
      guidelines.push('Use emojis sparingly, only when they add meaning');
      break;
    case 'moderate':
      guidelines.push('Use emojis occasionally to add warmth');
      break;
    case 'frequent':
      guidelines.push('Feel free to use emojis expressively');
      break;
  }

  // Message length
  switch (style.brevity) {
    case 'very_short':
      guidelines.push('Keep messages very brief - 1-2 sentences max');
      break;
    case 'short':
      guidelines.push('Keep messages concise - 2-3 sentences typically');
      break;
    case 'medium':
      guidelines.push('Moderate message length - be thorough but not verbose');
      break;
    case 'detailed':
      guidelines.push('Feel free to give detailed responses when helpful');
      break;
  }

  // How to address user
  if (style.addressStyle === 'nickname' && style.nickname) {
    guidelines.push(`Address the user as "${style.nickname}"`);
  } else if (style.addressStyle === 'name' && context.userName) {
    guidelines.push(`Address the user as "${context.userName}"`);
  }

  return `## Communication Style\n\n${guidelines.map((g) => `- ${g}`).join('\n')}`;
}

function buildRulesSection(rules: CompanionConfig['rules']): string {
  const sections: string[] = ['## Rules & Boundaries'];

  if (rules.avoidTopics && rules.avoidTopics.length > 0) {
    sections.push(`\n### Topics to Avoid\n${rules.avoidTopics.map((t) => `- ${t}`).join('\n')}`);
  }

  if (rules.sensitiveTopics && rules.sensitiveTopics.length > 0) {
    sections.push(`\n### Sensitive Topics (handle with care)\n${rules.sensitiveTopics.map((t) => `- ${t}`).join('\n')}`);
  }

  if (rules.neverDo && rules.neverDo.length > 0) {
    sections.push(`\n### Never Do\n${rules.neverDo.map((r) => `- ${r}`).join('\n')}`);
  }

  if (rules.shouldProactively && rules.shouldProactively.length > 0) {
    sections.push(`\n### Proactive Behaviors\n${rules.shouldProactively.map((r) => `- ${r}`).join('\n')}`);
  }

  if (rules.holdAccountable) {
    const level = rules.accountabilityLevel || 'moderate';
    sections.push(`\n### Accountability\nHold the user accountable to their goals and commitments. Be ${level} about it.`);
  }

  return sections.join('\n');
}

function buildContextSection(context: UserContext): string {
  const sections: string[] = ['## Current Context'];

  // Time context
  const timeStr = context.currentTime.toLocaleString('en-US', {
    timeZone: context.timezone,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
  sections.push(`\nCurrent time: ${timeStr} (${context.timezone})`);

  // Relevant memories
  if (context.relevantMemories.length > 0) {
    sections.push('\n### Relevant Information About This Person');
    for (const memory of context.relevantMemories) {
      sections.push(`- ${memory.content}`);
    }
  }

  // Active goals
  if (context.activeGoals.length > 0) {
    sections.push('\n### Active Goals');
    for (const goal of context.activeGoals) {
      sections.push(`- ${goal.title} (${goal.progress}% complete)`);
    }
  }

  // Upcoming events
  if (context.upcomingEvents.length > 0) {
    sections.push('\n### Upcoming Schedule');
    for (const event of context.upcomingEvents) {
      const time = event.startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: context.timezone,
      });
      sections.push(`- ${event.title} at ${time}${event.location ? ` (${event.location})` : ''}`);
    }
  }

  // Recently mentioned people
  if (context.recentPeople.length > 0) {
    sections.push('\n### People Recently Mentioned');
    for (const person of context.recentPeople) {
      sections.push(`- ${person.name}${person.relationship ? ` (${person.relationship})` : ''}`);
    }
  }

  return sections.join('\n');
}

function buildCapabilitiesSection(): string {
  return `## Capabilities

You can help the user with:
- Scheduling events and setting reminders
- Tracking goals and habits
- Searching through their memories and past conversations
- Remembering important information about their life
- Providing support and companionship
- Booking and reservations (when integrations allow)

When the user asks you to remember something, schedule something, or set a goal, acknowledge it naturally - the system will handle storing the information.

If you're unsure about something from their past, it's okay to ask - you don't need to pretend to remember everything.`;
}

/**
 * Build the onboarding section that guides the AI's learning behavior.
 * This section tells the AI what it doesn't know and encourages appropriate questioning.
 */
function buildOnboardingSection(onboarding: OnboardingContext, userName?: string): string {
  const name = userName || 'them';
  const sections: string[] = ['## Learning About This Person'];

  // Phase-specific guidance
  switch (onboarding.phase) {
    case 'new':
      sections.push(`
You're brand new to ${name}'s life. Like a newly hired personal assistant, you need to learn everything about them to be effective. This is your priority right now.

**Your approach:**
- Actively ask questions to understand their life, routines, and preferences
- Every response is an opportunity to learn something new
- Ask 1-2 questions naturally woven into your responses
- Don't just respond - engage, inquire, and build understanding
- Be curious but not overwhelming - make questions feel like genuine interest, not an interview

**Example natural questioning:**
- "That sounds busy! Is this a typical day for you, or is today especially hectic?"
- "Got it, I'll remember that. By the way, what time do you usually start winding down?"
- "Happy to help with that! Quick question - do you prefer I keep reminders short and punchy, or more detailed?"`);
      break;

    case 'getting_acquainted':
      sections.push(`
You're building a picture of ${name}'s life. You know some things but there's still plenty to learn.

**Your approach:**
- Continue asking questions, but be more selective
- Weave questions into helpful responses rather than leading with them
- Focus on filling specific gaps in your understanding
- Reference what you already know to show you're learning
- Ask follow-up questions when they share something new`);
      break;

    case 'familiar':
      sections.push(`
You know ${name} fairly well now. Your focus shifts from broad learning to refinement.

**Your approach:**
- Only ask questions when genuinely relevant to the conversation
- Focus on changes or updates to what you already know
- Ask about edge cases or preferences you haven't encountered
- Reference your existing knowledge to provide personalized help`);
      break;

    case 'established':
      sections.push(`
You have a well-established understanding of ${name}. You should rarely need to ask basic questions.

**Your approach:**
- Focus on being maximally helpful with your existing knowledge
- Only ask questions when something seems to have changed
- Check in occasionally about long-term goals or evolving preferences
- Primarily use what you know rather than asking`);
      break;
  }

  // Knowledge gaps section
  if (onboarding.topGaps.length > 0 && onboarding.phase !== 'established') {
    sections.push('\n**Areas you know least about** (consider asking when relevant):');
    for (const gap of onboarding.topGaps.slice(0, 3)) {
      sections.push(`- ${gap.areaLabel} (${gap.currentScore}% understood)`);
    }
  }

  // Suggested question (only for early phases)
  if (onboarding.suggestedQuestion &&
      (onboarding.phase === 'new' || onboarding.phase === 'getting_acquainted')) {
    sections.push(`
**Suggested question to work in naturally:**
"${onboarding.suggestedQuestion.question}"
(This helps you understand their ${onboarding.suggestedQuestion.area.replace(/_/g, ' ')})`);
  }

  return sections.join('\n');
}
