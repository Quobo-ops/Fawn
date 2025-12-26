/**
 * Knowledge areas that the AI companion should learn about the user.
 * These represent the different domains of a person's life that the AI
 * needs to understand to be an effective companion.
 */
export const KNOWLEDGE_AREAS = {
  // Daily life
  DAILY_ROUTINE: 'daily_routine',        // Wake time, sleep time, typical day structure
  WORK_LIFE: 'work_life',                // Job, work schedule, work preferences
  LIVING_SITUATION: 'living_situation',  // Where they live, who with, home context

  // Preferences
  COMMUNICATION_PREFS: 'communication_prefs',  // How they like to be talked to
  INTERESTS_HOBBIES: 'interests_hobbies',      // What they enjoy
  FOOD_PREFERENCES: 'food_preferences',        // Diet, favorite foods, restrictions

  // Relationships
  KEY_PEOPLE: 'key_people',              // Important people in their life
  SOCIAL_LIFE: 'social_life',            // Social preferences, friend groups

  // Inner life
  GOALS_ASPIRATIONS: 'goals_aspirations', // What they want to achieve
  VALUES_BELIEFS: 'values_beliefs',       // What matters to them
  EMOTIONAL_PATTERNS: 'emotional_patterns', // How they typically feel, triggers
  STRESS_COPING: 'stress_coping',         // How they handle stress

  // Health & wellness
  HEALTH_WELLNESS: 'health_wellness',     // Exercise, health conditions, self-care

  // Practical
  CALENDAR_PATTERNS: 'calendar_patterns', // Recurring events, busy times
} as const;

export type KnowledgeAreaKey = keyof typeof KNOWLEDGE_AREAS;
export type KnowledgeAreaValue = typeof KNOWLEDGE_AREAS[KnowledgeAreaKey];

/**
 * Onboarding phases that determine the AI's questioning behavior.
 */
export const ONBOARDING_PHASES = {
  NEW: 'new',               // 0-5 messages: Very active questioning
  GETTING_ACQUAINTED: 'getting_acquainted', // 5-25 messages: Regular questions
  FAMILIAR: 'familiar',     // 25-100 messages: Occasional questions
  ESTABLISHED: 'established', // 100+ messages: Only ask about gaps/changes
} as const;

export type OnboardingPhase = typeof ONBOARDING_PHASES[keyof typeof ONBOARDING_PHASES];

/**
 * Knowledge scores by area.
 */
export interface KnowledgeScores {
  [area: string]: {
    score: number;
    memoryCount: number;
    lastUpdated: string;
    confidence: number;
  };
}

/**
 * A knowledge gap that the AI should try to fill.
 */
export interface KnowledgeGap {
  area: KnowledgeAreaValue;
  areaLabel: string;
  currentScore: number;
  suggestedQuestions: string[];
  priority: number;
}

/**
 * Maps memory categories/subcategories to knowledge areas.
 * This allows us to calculate knowledge scores from existing memories.
 */
const MEMORY_TO_KNOWLEDGE_MAP: Record<string, KnowledgeAreaValue[]> = {
  // Memory category -> knowledge areas it informs
  'preference': [
    KNOWLEDGE_AREAS.COMMUNICATION_PREFS,
    KNOWLEDGE_AREAS.FOOD_PREFERENCES,
    KNOWLEDGE_AREAS.INTERESTS_HOBBIES,
  ],
  'routine': [KNOWLEDGE_AREAS.DAILY_ROUTINE, KNOWLEDGE_AREAS.WORK_LIFE],
  'fact': [
    KNOWLEDGE_AREAS.LIVING_SITUATION,
    KNOWLEDGE_AREAS.WORK_LIFE,
    KNOWLEDGE_AREAS.HEALTH_WELLNESS,
  ],
  'relationship': [KNOWLEDGE_AREAS.KEY_PEOPLE, KNOWLEDGE_AREAS.SOCIAL_LIFE],
  'goal': [KNOWLEDGE_AREAS.GOALS_ASPIRATIONS, KNOWLEDGE_AREAS.VALUES_BELIEFS],
  'emotion': [KNOWLEDGE_AREAS.EMOTIONAL_PATTERNS, KNOWLEDGE_AREAS.STRESS_COPING],
  'event': [KNOWLEDGE_AREAS.CALENDAR_PATTERNS, KNOWLEDGE_AREAS.SOCIAL_LIFE],
  'insight': [KNOWLEDGE_AREAS.VALUES_BELIEFS, KNOWLEDGE_AREAS.EMOTIONAL_PATTERNS],
};

/**
 * Keywords in memory content that map to specific knowledge areas.
 */
const CONTENT_KEYWORDS: Record<KnowledgeAreaValue, string[]> = {
  [KNOWLEDGE_AREAS.DAILY_ROUTINE]: [
    'wake', 'sleep', 'morning', 'night', 'routine', 'daily', 'usually', 'every day',
    'breakfast', 'lunch', 'dinner', 'commute',
  ],
  [KNOWLEDGE_AREAS.WORK_LIFE]: [
    'work', 'job', 'office', 'career', 'boss', 'coworker', 'meeting', 'deadline',
    'project', 'client', 'remote', 'salary', 'promotion',
  ],
  [KNOWLEDGE_AREAS.LIVING_SITUATION]: [
    'home', 'house', 'apartment', 'roommate', 'live with', 'neighborhood', 'city',
    'moved', 'rent', 'own',
  ],
  [KNOWLEDGE_AREAS.COMMUNICATION_PREFS]: [
    'prefer', 'like when you', 'don\'t like when', 'call me', 'text', 'message',
  ],
  [KNOWLEDGE_AREAS.INTERESTS_HOBBIES]: [
    'hobby', 'enjoy', 'love', 'passion', 'fun', 'weekend', 'free time', 'play',
    'watch', 'read', 'listen', 'game', 'sport', 'music', 'book', 'movie',
  ],
  [KNOWLEDGE_AREAS.FOOD_PREFERENCES]: [
    'eat', 'food', 'restaurant', 'cook', 'diet', 'vegetarian', 'vegan', 'allergic',
    'favorite food', 'don\'t eat', 'love eating',
  ],
  [KNOWLEDGE_AREAS.KEY_PEOPLE]: [
    'mom', 'dad', 'parent', 'sibling', 'brother', 'sister', 'partner', 'spouse',
    'wife', 'husband', 'boyfriend', 'girlfriend', 'best friend', 'family',
  ],
  [KNOWLEDGE_AREAS.SOCIAL_LIFE]: [
    'friend', 'social', 'party', 'hangout', 'meet up', 'introvert', 'extrovert',
    'alone time', 'group',
  ],
  [KNOWLEDGE_AREAS.GOALS_ASPIRATIONS]: [
    'goal', 'want to', 'dream', 'hope', 'aspire', 'achieve', 'plan to', 'someday',
    'future', 'ambition',
  ],
  [KNOWLEDGE_AREAS.VALUES_BELIEFS]: [
    'believe', 'value', 'important to me', 'matter', 'principle', 'faith',
    'politics', 'philosophy',
  ],
  [KNOWLEDGE_AREAS.EMOTIONAL_PATTERNS]: [
    'feel', 'mood', 'happy', 'sad', 'anxious', 'stressed', 'excited', 'upset',
    'angry', 'frustrated', 'overwhelmed', 'calm',
  ],
  [KNOWLEDGE_AREAS.STRESS_COPING]: [
    'stress', 'cope', 'relax', 'unwind', 'self-care', 'therapy', 'meditate',
    'exercise', 'when I\'m stressed',
  ],
  [KNOWLEDGE_AREAS.HEALTH_WELLNESS]: [
    'health', 'exercise', 'workout', 'gym', 'run', 'walk', 'doctor', 'medication',
    'condition', 'sleep', 'tired', 'energy',
  ],
  [KNOWLEDGE_AREAS.CALENDAR_PATTERNS]: [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'weekly', 'monthly', 'every week', 'schedule', 'busy', 'free',
  ],
};

/**
 * Human-readable labels for knowledge areas.
 */
export const KNOWLEDGE_AREA_LABELS: Record<KnowledgeAreaValue, string> = {
  [KNOWLEDGE_AREAS.DAILY_ROUTINE]: 'Daily Routine',
  [KNOWLEDGE_AREAS.WORK_LIFE]: 'Work Life',
  [KNOWLEDGE_AREAS.LIVING_SITUATION]: 'Living Situation',
  [KNOWLEDGE_AREAS.COMMUNICATION_PREFS]: 'Communication Preferences',
  [KNOWLEDGE_AREAS.INTERESTS_HOBBIES]: 'Interests & Hobbies',
  [KNOWLEDGE_AREAS.FOOD_PREFERENCES]: 'Food Preferences',
  [KNOWLEDGE_AREAS.KEY_PEOPLE]: 'Key People',
  [KNOWLEDGE_AREAS.SOCIAL_LIFE]: 'Social Life',
  [KNOWLEDGE_AREAS.GOALS_ASPIRATIONS]: 'Goals & Aspirations',
  [KNOWLEDGE_AREAS.VALUES_BELIEFS]: 'Values & Beliefs',
  [KNOWLEDGE_AREAS.EMOTIONAL_PATTERNS]: 'Emotional Patterns',
  [KNOWLEDGE_AREAS.STRESS_COPING]: 'Stress & Coping',
  [KNOWLEDGE_AREAS.HEALTH_WELLNESS]: 'Health & Wellness',
  [KNOWLEDGE_AREAS.CALENDAR_PATTERNS]: 'Calendar Patterns',
};

/**
 * Default questions for each knowledge area to ask during onboarding.
 */
export const DEFAULT_ONBOARDING_QUESTIONS: Record<KnowledgeAreaValue, string[]> = {
  [KNOWLEDGE_AREAS.DAILY_ROUTINE]: [
    "What does a typical day look like for you?",
    "What time do you usually wake up and go to bed?",
    "Do you have any morning or evening rituals that are important to you?",
  ],
  [KNOWLEDGE_AREAS.WORK_LIFE]: [
    "What do you do for work?",
    "What's your work schedule like?",
    "Do you work from home or go into an office?",
  ],
  [KNOWLEDGE_AREAS.LIVING_SITUATION]: [
    "Where do you live? City, suburbs, rural area?",
    "Do you live alone or with others?",
  ],
  [KNOWLEDGE_AREAS.COMMUNICATION_PREFS]: [
    "How do you prefer I communicate with you - more casual or more structured?",
    "Is there anything you'd like me to do differently in how I respond?",
    "Would you prefer shorter or longer messages from me?",
  ],
  [KNOWLEDGE_AREAS.INTERESTS_HOBBIES]: [
    "What do you enjoy doing in your free time?",
    "Any hobbies or interests you're particularly passionate about?",
    "What do you like to do on weekends?",
  ],
  [KNOWLEDGE_AREAS.FOOD_PREFERENCES]: [
    "Do you have any dietary preferences or restrictions I should know about?",
    "What are some of your favorite foods or cuisines?",
  ],
  [KNOWLEDGE_AREAS.KEY_PEOPLE]: [
    "Who are the most important people in your life right now?",
    "Tell me about your family - who should I know about?",
  ],
  [KNOWLEDGE_AREAS.SOCIAL_LIFE]: [
    "Would you describe yourself as more introverted or extroverted?",
    "How do you usually spend time with friends?",
  ],
  [KNOWLEDGE_AREAS.GOALS_ASPIRATIONS]: [
    "What are you currently working towards or hoping to achieve?",
    "Are there any big goals or dreams on your mind?",
    "What would you like to accomplish in the next few months?",
  ],
  [KNOWLEDGE_AREAS.VALUES_BELIEFS]: [
    "What matters most to you in life?",
    "What principles guide your decisions?",
  ],
  [KNOWLEDGE_AREAS.EMOTIONAL_PATTERNS]: [
    "How have you been feeling lately, in general?",
    "What usually puts you in a good mood?",
    "Is there anything that tends to bring you down?",
  ],
  [KNOWLEDGE_AREAS.STRESS_COPING]: [
    "What do you do to relax or unwind?",
    "How do you typically handle stressful situations?",
  ],
  [KNOWLEDGE_AREAS.HEALTH_WELLNESS]: [
    "Do you have any health or wellness routines?",
    "Are you working on any health-related goals?",
  ],
  [KNOWLEDGE_AREAS.CALENDAR_PATTERNS]: [
    "What days are usually busiest for you?",
    "Are there any recurring events or commitments I should know about?",
  ],
};

/**
 * Priority order for knowledge areas during early onboarding.
 * Higher priority areas are asked about first.
 */
export const KNOWLEDGE_AREA_PRIORITY: KnowledgeAreaValue[] = [
  KNOWLEDGE_AREAS.COMMUNICATION_PREFS,    // Important to know early so AI communicates well
  KNOWLEDGE_AREAS.DAILY_ROUTINE,          // Helps contextualize messages
  KNOWLEDGE_AREAS.WORK_LIFE,              // Major part of most people's lives
  KNOWLEDGE_AREAS.KEY_PEOPLE,             // Need to know who matters
  KNOWLEDGE_AREAS.GOALS_ASPIRATIONS,      // Central to being helpful
  KNOWLEDGE_AREAS.INTERESTS_HOBBIES,      // Good for rapport
  KNOWLEDGE_AREAS.EMOTIONAL_PATTERNS,     // Helps with support
  KNOWLEDGE_AREAS.LIVING_SITUATION,       // Context
  KNOWLEDGE_AREAS.SOCIAL_LIFE,            // Social context
  KNOWLEDGE_AREAS.STRESS_COPING,          // Important for support
  KNOWLEDGE_AREAS.HEALTH_WELLNESS,        // Wellness context
  KNOWLEDGE_AREAS.VALUES_BELIEFS,         // Deeper understanding
  KNOWLEDGE_AREAS.FOOD_PREFERENCES,       // Nice to know
  KNOWLEDGE_AREAS.CALENDAR_PATTERNS,      // Practical
];

export interface MemoryForAnalysis {
  content: string;
  category: string;
  subcategory?: string;
  importance?: number;
  createdAt: Date;
}

/**
 * Analyze memories to calculate knowledge scores for each area.
 */
export function calculateKnowledgeScores(memories: MemoryForAnalysis[]): KnowledgeScores {
  const scores: KnowledgeScores = {};
  const now = new Date().toISOString();

  // Initialize all areas with zero
  for (const area of Object.values(KNOWLEDGE_AREAS)) {
    scores[area] = {
      score: 0,
      memoryCount: 0,
      lastUpdated: now,
      confidence: 0,
    };
  }

  // Analyze each memory
  for (const memory of memories) {
    const contentLower = memory.content.toLowerCase();
    const areas = new Set<KnowledgeAreaValue>();

    // Map by memory category
    const mappedAreas = MEMORY_TO_KNOWLEDGE_MAP[memory.category];
    if (mappedAreas) {
      mappedAreas.forEach(area => areas.add(area));
    }

    // Map by content keywords
    for (const [area, keywords] of Object.entries(CONTENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          areas.add(area as KnowledgeAreaValue);
          break; // One match per area is enough
        }
      }
    }

    // Add points to each matched area
    const memoryImportance = memory.importance || 5;
    const points = 5 + (memoryImportance - 5) * 2; // 5-15 points per memory

    for (const area of areas) {
      scores[area].memoryCount++;
      scores[area].score = Math.min(100, scores[area].score + points);
      scores[area].lastUpdated = memory.createdAt.toISOString();
    }
  }

  // Calculate confidence based on memory count and recency
  for (const area of Object.values(KNOWLEDGE_AREAS)) {
    const data = scores[area];
    // More memories = higher confidence (up to 1.0)
    data.confidence = Math.min(1, data.memoryCount / 5);
  }

  return scores;
}

/**
 * Determine the onboarding phase based on message count.
 */
export function determineOnboardingPhase(messageCount: number): OnboardingPhase {
  if (messageCount < 5) {
    return ONBOARDING_PHASES.NEW;
  } else if (messageCount < 25) {
    return ONBOARDING_PHASES.GETTING_ACQUAINTED;
  } else if (messageCount < 100) {
    return ONBOARDING_PHASES.FAMILIAR;
  } else {
    return ONBOARDING_PHASES.ESTABLISHED;
  }
}

/**
 * Identify knowledge gaps that the AI should try to fill.
 * Returns gaps sorted by priority.
 */
export function identifyKnowledgeGaps(
  knowledgeScores: KnowledgeScores,
  onboardingPhase: OnboardingPhase,
  askedQuestionAreas: string[] = []
): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Threshold varies by phase - later phases are pickier about what's a "gap"
  const scoreThreshold = {
    [ONBOARDING_PHASES.NEW]: 30,              // Very low bar - almost everything is a gap
    [ONBOARDING_PHASES.GETTING_ACQUAINTED]: 50, // Moderate
    [ONBOARDING_PHASES.FAMILIAR]: 70,           // Higher bar
    [ONBOARDING_PHASES.ESTABLISHED]: 85,        // Only truly empty areas
  }[onboardingPhase];

  for (const area of KNOWLEDGE_AREA_PRIORITY) {
    const score = knowledgeScores[area]?.score ?? 0;

    if (score < scoreThreshold) {
      // Don't repeatedly ask about the same area in quick succession
      const recentlyAsked = askedQuestionAreas.filter(a => a === area).length;
      if (recentlyAsked >= 2) continue; // Skip if asked twice already

      const priorityIndex = KNOWLEDGE_AREA_PRIORITY.indexOf(area);
      const basePriority = KNOWLEDGE_AREA_PRIORITY.length - priorityIndex;
      const gapSize = scoreThreshold - score;

      gaps.push({
        area,
        areaLabel: KNOWLEDGE_AREA_LABELS[area],
        currentScore: score,
        suggestedQuestions: DEFAULT_ONBOARDING_QUESTIONS[area] || [],
        priority: basePriority + (gapSize / 10), // Higher priority for bigger gaps
      });
    }
  }

  // Sort by priority descending
  return gaps.sort((a, b) => b.priority - a.priority);
}

/**
 * Get the next question to ask based on knowledge gaps.
 * Returns null if no question should be asked.
 */
export function getNextQuestion(
  gaps: KnowledgeGap[],
  onboardingPhase: OnboardingPhase,
  recentlyAskedQuestions: string[] = []
): { question: string; area: KnowledgeAreaValue } | null {
  if (gaps.length === 0) return null;

  // Probability of asking a question based on phase
  const askProbability = {
    [ONBOARDING_PHASES.NEW]: 0.8,              // Ask 80% of the time
    [ONBOARDING_PHASES.GETTING_ACQUAINTED]: 0.5, // Ask 50% of the time
    [ONBOARDING_PHASES.FAMILIAR]: 0.2,           // Ask 20% of the time
    [ONBOARDING_PHASES.ESTABLISHED]: 0.1,        // Ask 10% of the time
  }[onboardingPhase];

  if (Math.random() > askProbability) return null;

  // Find a question we haven't asked recently
  for (const gap of gaps) {
    for (const question of gap.suggestedQuestions) {
      if (!recentlyAskedQuestions.includes(question)) {
        return { question, area: gap.area };
      }
    }
  }

  return null;
}

/**
 * Full onboarding context including detailed knowledge scores.
 * Used internally for building context.
 */
export interface FullOnboardingContext {
  phase: OnboardingPhase;
  messageCount: number;
  knowledgeScores: KnowledgeScores;
  topGaps: KnowledgeGap[];
  suggestedQuestion: { question: string; area: KnowledgeAreaValue } | null;
  overallKnowledgeLevel: number; // 0-100
}

export function buildOnboardingContext(
  messageCount: number,
  memories: MemoryForAnalysis[],
  recentlyAskedQuestions: string[] = [],
  recentlyAskedAreas: string[] = []
): FullOnboardingContext {
  const phase = determineOnboardingPhase(messageCount);
  const knowledgeScores = calculateKnowledgeScores(memories);
  const topGaps = identifyKnowledgeGaps(knowledgeScores, phase, recentlyAskedAreas);
  const suggestedQuestion = getNextQuestion(topGaps, phase, recentlyAskedQuestions);

  // Calculate overall knowledge level (average of all scores)
  const scoreValues = Object.values(knowledgeScores) as Array<{ score: number; memoryCount: number; lastUpdated: string; confidence: number }>;
  const allScores = scoreValues.map(s => s.score);
  const overallKnowledgeLevel = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  return {
    phase,
    messageCount,
    knowledgeScores,
    topGaps: topGaps.slice(0, 5), // Top 5 gaps
    suggestedQuestion,
    overallKnowledgeLevel,
  };
}
