import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedMemory } from './types';

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

const EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the conversation and extract important facts, preferences, events, and information that should be remembered about the user.

For each memory, provide:
- content: The fact or information (phrased as a statement about the user)
- category: One of 'fact', 'preference', 'goal', 'event', 'relationship', 'emotion', 'insight'
- importance: 1-10 (10 being most important)
- people: Array of names mentioned (if any)
- emotion: The emotional context if relevant
- temporal: Any time-related context (when it happened, how long it's valid)

Only extract information that is:
1. About the user themselves (not general knowledge)
2. Likely to be useful in future conversations
3. Not already obvious from context

Respond with a JSON array of extracted memories. If no memories should be extracted, return an empty array.`;

interface ExtractionResult {
  memories: ExtractedMemory[];
}

/**
 * Extract memories from a conversation message
 */
export async function extractMemories(
  userMessage: string,
  assistantResponse: string,
  conversationContext?: string
): Promise<ExtractedMemory[]> {
  const conversationText = conversationContext
    ? `Previous context:\n${conversationContext}\n\n`
    : '';

  const messageToAnalyze = `${conversationText}User: ${userMessage}\n\nAssistant: ${assistantResponse}`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this conversation and extract memories:\n\n${messageToAnalyze}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.warn('[WARN] Memory extraction returned non-text content');
      return [];
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[WARN] Memory extraction response did not contain JSON array');
      return [];
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as ExtractedMemory[];
      const validMemories = parsed.filter(validateMemory);
      
      if (validMemories.length < parsed.length) {
        console.warn(`[WARN] Filtered out ${parsed.length - validMemories.length} invalid memories`);
      }
      
      return validMemories;
    } catch (parseError) {
      console.error('[ERROR] Failed to parse memory extraction JSON:', parseError, {
        responseText: content.text.substring(0, 200),
      });
      return [];
    }
  } catch (error) {
    console.error('[ERROR] Memory extraction failed:', error, {
      userMessagePreview: userMessage.substring(0, 50),
      hasContext: !!conversationContext,
    });
    return [];
  }
}

function validateMemory(memory: unknown): memory is ExtractedMemory {
  if (!memory || typeof memory !== 'object') return false;
  const m = memory as Record<string, unknown>;

  return (
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    typeof m.category === 'string' &&
    ['fact', 'preference', 'goal', 'event', 'relationship', 'emotion', 'insight'].includes(m.category) &&
    typeof m.importance === 'number' &&
    m.importance >= 1 &&
    m.importance <= 10
  );
}

/**
 * Determine if a memory supersedes or contradicts existing memories
 */
export async function checkMemoryConflicts(
  newMemory: ExtractedMemory,
  existingMemories: { id: string; content: string }[]
): Promise<{
  supersedes: string[];
  contradicts: string[];
  relatedTo: string[];
}> {
  if (existingMemories.length === 0) {
    return { supersedes: [], contradicts: [], relatedTo: [] };
  }

  const prompt = `Given a new memory and existing memories, determine:
1. Which existing memories this new memory supersedes (makes outdated)
2. Which existing memories this new memory contradicts
3. Which existing memories are related

New memory: "${newMemory.content}"

Existing memories:
${existingMemories.map((m, i) => `${i + 1}. [${m.id}] ${m.content}`).join('\n')}

Respond with JSON: { "supersedes": ["id1"], "contradicts": ["id2"], "relatedTo": ["id3"] }`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.warn('[WARN] Memory conflict check returned non-text content');
      return { supersedes: [], contradicts: [], relatedTo: [] };
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[WARN] Memory conflict check response did not contain JSON');
      return { supersedes: [], contradicts: [], relatedTo: [] };
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[ERROR] Failed to parse memory conflict check JSON:', parseError);
      return { supersedes: [], contradicts: [], relatedTo: [] };
    }
  } catch (error) {
    console.error('[ERROR] Memory conflict check failed:', error, {
      memoryContent: newMemory.content.substring(0, 50),
      existingCount: existingMemories.length,
    });
    return { supersedes: [], contradicts: [], relatedTo: [] };
  }
}
