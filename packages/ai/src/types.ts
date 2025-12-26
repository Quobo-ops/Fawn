export interface CompanionConfig {
  id: string;
  name: string;
  pronouns: string;
  personality: PersonalityConfig;
  rules: RulesConfig;
  communicationStyle: CommunicationStyleConfig;
  customInstructions?: string;
}

export interface PersonalityConfig {
  warmth: number;
  humor: number;
  directness: number;
  formality: number;
  curiosity: number;
  encouragement: number;
  traits: string[];
  customTraits?: string;
}

export interface RulesConfig {
  avoidTopics?: string[];
  sensitiveTopics?: string[];
  neverDo?: string[];
  shouldProactively?: string[];
  maxMessageLength?: number;
  holdAccountable?: boolean;
  accountabilityLevel?: 'gentle' | 'moderate' | 'firm';
}

export interface CommunicationStyleConfig {
  emojiFrequency: 'never' | 'rare' | 'moderate' | 'frequent';
  brevity: 'very_short' | 'short' | 'medium' | 'detailed';
  addressStyle: 'name' | 'nickname' | 'none';
  nickname?: string;
  greetingStyle?: string;
  signOffStyle?: string;
}

export interface UserContext {
  userId: string;
  userName?: string;
  timezone: string;
  currentTime: Date;
  recentMessages: MessageContext[];
  relevantMemories: MemoryContext[];
  activeGoals: GoalContext[];
  upcomingEvents: EventContext[];
  recentPeople: PersonContext[];
  onboarding?: OnboardingContext;
}

export interface OnboardingContext {
  phase: 'new' | 'getting_acquainted' | 'familiar' | 'established';
  messageCount: number;
  overallKnowledgeLevel: number; // 0-100
  topGaps: KnowledgeGapInfo[];
  suggestedQuestion?: {
    question: string;
    area: string;
  };
}

export interface KnowledgeGapInfo {
  area: string;
  areaLabel: string;
  currentScore: number;
  priority: number;
}

export interface MessageContext {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface MemoryContext {
  id: string;
  content: string;
  category: string;
  importance: number;
  relevanceScore: number;
}

export interface GoalContext {
  id: string;
  title: string;
  status: string;
  progress: number;
  lastCheckIn?: Date;
}

export interface EventContext {
  id: string;
  title: string;
  startTime: Date;
  location?: string;
}

export interface PersonContext {
  id: string;
  name: string;
  relationship?: string;
  lastMentioned?: Date;
}

export interface DetectedIntent {
  primary: string;
  confidence: number;
  entities: Record<string, string>;
  requiresAction: boolean;
  actionType?: string;
}

export interface ExtractedMemory {
  content: string;
  category: string;
  importance: number;
  people?: string[];
  emotion?: string;
  temporal?: {
    occurredAt?: Date;
    validFrom?: Date;
    validUntil?: Date;
  };
}
