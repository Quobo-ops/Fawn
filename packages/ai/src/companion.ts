import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './prompt-builder';
import { detectIntent, quickIntentMatch } from './intent-detector';
import { extractMemories } from './memory-extractor';
import { generateEmbedding } from './embeddings';
import type {
  CompanionConfig,
  UserContext,
  MessageContext,
  DetectedIntent,
  ExtractedMemory,
} from './types';

const anthropic = new Anthropic();

export interface CompanionResponse {
  content: string;
  intent: DetectedIntent;
  extractedMemories: ExtractedMemory[];
  tokensUsed: number;
  model: string;
}

export interface CompanionEngineOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_OPTIONS: Required<CompanionEngineOptions> = {
  model: 'claude-opus-4-20250514',
  maxTokens: 500, // Keep SMS-appropriate
  temperature: 0.7,
};

/**
 * The main companion engine that generates responses
 */
export class CompanionEngine {
  private config: CompanionConfig;
  private options: Required<CompanionEngineOptions>;

  constructor(config: CompanionConfig, options: CompanionEngineOptions = {}) {
    this.config = config;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate a response to a user message
   */
  async respond(
    userMessage: string,
    context: UserContext
  ): Promise<CompanionResponse> {
    // Detect intent (try quick match first)
    let intent = quickIntentMatch(userMessage);
    if (!intent || intent.confidence < 0.8) {
      const recentContext = context.recentMessages
        .slice(-3)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
      intent = await detectIntent(userMessage, recentContext);
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(this.config, context);

    // Build message history
    const messages = this.buildMessageHistory(context.recentMessages, userMessage);

    // Generate response
    const response = await anthropic.messages.create({
      model: this.options.model,
      max_tokens: this.options.maxTokens,
      temperature: this.options.temperature,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const responseText = content.text;

    // Extract memories in background (don't await in critical path for SMS latency)
    const memoriesPromise = extractMemories(userMessage, responseText);

    const extractedMemories = await memoriesPromise;

    return {
      content: responseText,
      intent,
      extractedMemories,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: this.options.model,
    };
  }

  /**
   * Generate a proactive message (check-in, reminder, etc.)
   */
  async generateProactiveMessage(
    context: UserContext,
    type: 'check_in' | 'reminder' | 'goal_nudge' | 'event_reminder',
    additionalContext?: string
  ): Promise<string> {
    const systemPrompt = buildSystemPrompt(this.config, context);

    const proactivePrompts = {
      check_in: `Generate a friendly check-in message. Be natural and conversational. Don't be formulaic.`,
      reminder: `Generate a reminder message. ${additionalContext || ''}`,
      goal_nudge: `Generate a gentle nudge about their goals. Reference specific goals from context.`,
      event_reminder: `Generate an event reminder. ${additionalContext || ''}`,
    };

    const response = await anthropic.messages.create({
      model: this.options.model,
      max_tokens: this.options.maxTokens,
      temperature: this.options.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `[SYSTEM: ${proactivePrompts[type]}]`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  }

  /**
   * Generate an embedding for a query to search memories
   */
  async embedQuery(query: string): Promise<number[]> {
    return generateEmbedding(query);
  }

  /**
   * Update companion configuration
   */
  updateConfig(config: Partial<CompanionConfig>) {
    this.config = { ...this.config, ...config };
  }

  private buildMessageHistory(
    recentMessages: MessageContext[],
    currentMessage: string
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add recent conversation history
    for (const msg of recentMessages.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }
}

/**
 * Factory function to create a companion engine with default configuration
 */
export function createCompanion(
  config: Partial<CompanionConfig> = {}
): CompanionEngine {
  const defaultConfig: CompanionConfig = {
    id: 'default',
    name: 'Fawn',
    pronouns: 'they/them',
    personality: {
      warmth: 7,
      humor: 5,
      directness: 6,
      formality: 3,
      curiosity: 7,
      encouragement: 7,
      traits: [],
    },
    rules: {
      holdAccountable: true,
      accountabilityLevel: 'moderate',
    },
    communicationStyle: {
      emojiFrequency: 'moderate',
      brevity: 'short',
      addressStyle: 'nickname',
    },
  };

  return new CompanionEngine({ ...defaultConfig, ...config });
}
