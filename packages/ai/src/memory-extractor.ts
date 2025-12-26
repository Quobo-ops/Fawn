import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedMemory } from './types';

const anthropic = new Anthropic();

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
    const response = await anthropic.messages.create({
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
      return [];
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedMemory[];
    return parsed.filter(validateMemory);
  } catch (error) {
    console.error('Memory extraction failed:', error);
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
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return { supersedes: [], contradicts: [], relatedTo: [] };
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { supersedes: [], contradicts: [], relatedTo: [] };
    }

    return JSON.parse(jsonMatch[0]);
  } catch {
    return { supersedes: [], contradicts: [], relatedTo: [] };
  }
}
