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

// Lazy initialization - only create client when needed and API key is available
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropic) return anthropic;
  
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  anthropic = new Anthropic();
  return anthropic;
}

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
    let intent: DetectedIntent;
    try {
      const quickMatch = quickIntentMatch(userMessage);
      if (quickMatch && quickMatch.confidence >= 0.8) {
        intent = quickMatch;
      } else {
        const recentContext = context.recentMessages
          .slice(-3)
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n');
        intent = await detectIntent(userMessage, recentContext);
      }
    } catch (error) {
      console.error('[ERROR] Intent detection failed:', error);
      intent = {
        primary: 'unknown',
        confidence: 0,
        entities: {},
        requiresAction: false,
      };
    }

    // Build system prompt with context
    let systemPrompt: string;
    try {
      systemPrompt = buildSystemPrompt(this.config, context);
    } catch (error) {
      console.error('[ERROR] Failed to build system prompt:', error);
      throw new Error('Failed to build system prompt');
    }

    // Build message history
    const messages = this.buildMessageHistory(context.recentMessages, userMessage);

    // Generate response
    let response;
    try {
      const client = getAnthropicClient();
      response = await client.messages.create({
        model: this.options.model,
        max_tokens: this.options.maxTokens,
        temperature: this.options.temperature,
        system: systemPrompt,
        messages,
      });
    } catch (error) {
      console.error('[ERROR] Anthropic API call failed:', error, {
        model: this.options.model,
        messageLength: userMessage.length,
      });
      throw error;
    }

    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('[ERROR] Unexpected response type from Anthropic:', content.type);
      throw new Error('Unexpected response type');
    }

    const responseText = content.text;

    // Extract memories (handle errors gracefully)
    let extractedMemories: ExtractedMemory[] = [];
    try {
      extractedMemories = await extractMemories(userMessage, responseText);
    } catch (error) {
      console.error('[ERROR] Memory extraction failed:', error);
      // Continue without extracted memories
    }

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
    let systemPrompt: string;
    try {
      systemPrompt = buildSystemPrompt(this.config, context);
    } catch (error) {
      console.error('[ERROR] Failed to build system prompt:', error);
      throw new Error('Failed to build system prompt');
    }

    const proactivePrompts = {
      check_in: `Generate a friendly check-in message. Be natural and conversational. Don't be formulaic.`,
      reminder: `Generate a reminder message. ${additionalContext || ''}`,
      goal_nudge: `Generate a gentle nudge about their goals. Reference specific goals from context.`,
      event_reminder: `Generate an event reminder. ${additionalContext || ''}`,
    };

    try {
      const client = getAnthropicClient();
      const response = await client.messages.create({
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
    } catch (error) {
      console.error('[ERROR] Failed to generate proactive message:', error, {
        type,
      });
      throw error;
    }
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
