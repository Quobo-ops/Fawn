/**
 * Document Synthesis Engine
 *
 * Uses Claude to transform raw memories into synthesized deep-dive documents.
 * These documents are NOT transcripts - they are analytical profiles that
 * help the companion understand and relate to the user more deeply.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { IndexCode, IndexDocument, IndexDirective } from './types';
import { getCategoryByCode, CATEGORIES } from './categories';

const anthropic = new Anthropic();

interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  metadata?: {
    emotion?: string;
    people?: string[];
    location?: string;
    confidence?: number;
  };
  createdAt: Date;
  occurredAt?: Date;
}

interface SynthesisResult {
  title: string;
  summary: string;
  content: string;
  keyInsights: string[];
  patterns: string[];
  recommendations: string[];
  confidence: number;
}

interface DirectiveResult {
  primaryIndex: IndexCode;
  relatedIndices: IndexCode[];
  confidence: number;
  reasoning: string;
}

/**
 * Synthesize memories into a comprehensive document for a specific index category
 */
export async function synthesizeDocument(
  indexCode: IndexCode,
  memories: Memory[],
  existingDocument?: Partial<IndexDocument>
): Promise<SynthesisResult> {
  const category = getCategoryByCode(indexCode);

  if (!category) {
    throw new Error(`Unknown index code: ${indexCode}`);
  }

  if (memories.length === 0) {
    return createEmptyDocument(category.topicName);
  }

  // Format memories for the prompt
  const memoriesText = memories
    .sort((a, b) => b.importance - a.importance)
    .map((m, i) => {
      const date = m.occurredAt || m.createdAt;
      const emotion = m.metadata?.emotion ? ` [${m.metadata.emotion}]` : '';
      const people = m.metadata?.people?.length ? ` (involves: ${m.metadata.people.join(', ')})` : '';
      return `${i + 1}. [Importance: ${m.importance}/10]${emotion}${people}\n   ${m.content}\n   (${date.toLocaleDateString()})`;
    })
    .join('\n\n');

  const existingContext = existingDocument?.content
    ? `\n\nPrevious understanding:\n${existingDocument.content}\n\nUpdate and expand upon this based on new memories.`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are synthesizing a psychological profile document about a person based on collected memories and observations. This is for an AI companion to better understand and support this person.

CATEGORY: ${category.domainName} > ${category.topicName}
DESCRIPTION: ${category.description}

MEMORIES TO SYNTHESIZE (${memories.length} total):
${memoriesText}
${existingContext}

Create a comprehensive, analytical document that:
1. Goes BEYOND surface-level facts to understand underlying motivations, patterns, and psychology
2. Identifies what these memories reveal about the person's character, needs, and tendencies
3. Notes patterns, contradictions, and nuances in behavior
4. Provides guidance for how a companion should interact regarding this topic

Respond in this exact JSON format:
{
  "title": "A descriptive title for this profile section",
  "summary": "A 2-3 sentence executive summary for quick reference",
  "content": "The full deep-dive analysis (3-5 paragraphs, written in third person about 'they/them'). This should read like a therapist's insightful notes, not a list of facts.",
  "keyInsights": ["List of 3-5 key psychological/behavioral insights discovered"],
  "patterns": ["List of 2-4 recurring patterns observed"],
  "recommendations": ["List of 3-5 specific recommendations for how the companion should approach this topic with them"],
  "confidence": 0.0 to 1.0 based on how much evidence supports these conclusions
}`,
      },
    ],
  });

  // Extract JSON from response
  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from synthesis');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse synthesis response as JSON');
  }

  const result = JSON.parse(jsonMatch[0]) as SynthesisResult;

  // Validate and clean
  return {
    title: result.title || category.topicName,
    summary: result.summary || '',
    content: result.content || '',
    keyInsights: Array.isArray(result.keyInsights) ? result.keyInsights : [],
    patterns: Array.isArray(result.patterns) ? result.patterns : [],
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5,
  };
}

/**
 * Determine which index categories a memory should be mapped to
 */
export async function classifyMemoryToIndices(memory: Memory): Promise<DirectiveResult> {
  // Build category list for the prompt
  const categoryList = CATEGORIES.map(
    (c) => `${c.code}: ${c.domainName} > ${c.topicName} - ${c.description}`
  ).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Classify which index categories this memory belongs to.

MEMORY:
"${memory.content}"
Category: ${memory.category}
Importance: ${memory.importance}/10
${memory.metadata?.emotion ? `Emotion: ${memory.metadata.emotion}` : ''}
${memory.metadata?.people?.length ? `People involved: ${memory.metadata.people.join(', ')}` : ''}

AVAILABLE INDEX CATEGORIES:
${categoryList}

Determine:
1. The PRIMARY index category this memory most strongly relates to
2. Any RELATED index categories (up to 3) that could benefit from this memory
3. Your confidence (0-1) in this classification

Respond in this exact JSON format:
{
  "primaryIndex": "X000",
  "relatedIndices": ["X000", "X000"],
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of why"
}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from classification');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback classification
    return {
      primaryIndex: inferPrimaryIndex(memory),
      relatedIndices: [],
      confidence: 0.3,
      reasoning: 'Fallback classification',
    };
  }

  const result = JSON.parse(jsonMatch[0]) as DirectiveResult;

  // Validate index codes
  const validPrimary = getCategoryByCode(result.primaryIndex as IndexCode);
  if (!validPrimary) {
    return {
      primaryIndex: inferPrimaryIndex(memory),
      relatedIndices: [],
      confidence: 0.3,
      reasoning: 'Invalid primary index, used fallback',
    };
  }

  const validRelated = (result.relatedIndices || [])
    .filter((code) => getCategoryByCode(code as IndexCode))
    .slice(0, 3) as IndexCode[];

  return {
    primaryIndex: result.primaryIndex as IndexCode,
    relatedIndices: validRelated,
    confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
    reasoning: result.reasoning || '',
  };
}

/**
 * Batch classify multiple memories (more efficient)
 */
export async function batchClassifyMemories(
  memories: Memory[]
): Promise<Map<string, DirectiveResult>> {
  const results = new Map<string, DirectiveResult>();

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (memory) => {
        try {
          const result = await classifyMemoryToIndices(memory);
          return { id: memory.id, result };
        } catch (error) {
          // Fallback on error
          return {
            id: memory.id,
            result: {
              primaryIndex: inferPrimaryIndex(memory),
              relatedIndices: [],
              confidence: 0.2,
              reasoning: 'Classification failed, used fallback',
            } as DirectiveResult,
          };
        }
      })
    );

    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });
  }

  return results;
}

/**
 * Infer a primary index based on memory category (fallback)
 */
function inferPrimaryIndex(memory: Memory): IndexCode {
  const categoryMapping: Record<string, IndexCode> = {
    fact: 'A003', // Self-Perception
    preference: 'H001', // Hobbies & Passions
    goal: 'E002', // Current Goals
    event: 'G005', // Recent Events
    relationship: 'B003', // Friendships (default)
    emotion: 'F001', // Emotional Tendencies
    insight: 'J004', // Lessons Learned
  };

  return categoryMapping[memory.category] || 'A003';
}

/**
 * Create an empty document placeholder
 */
function createEmptyDocument(topicName: string): SynthesisResult {
  return {
    title: topicName,
    summary: 'No memories have been collected for this topic yet.',
    content:
      'This profile section is awaiting memories to synthesize. As conversations occur and memories are extracted, this document will be populated with insights.',
    keyInsights: [],
    patterns: [],
    recommendations: ['Gather more information about this topic through natural conversation'],
    confidence: 0,
  };
}

/**
 * Determine if a document needs regeneration based on new memories
 */
export function shouldRegenerateDocument(
  document: IndexDocument,
  newMemoryCount: number,
  lastMemoryImportance: number
): boolean {
  // Always regenerate if document is stale
  if (document.status === 'stale') {
    return true;
  }

  // Regenerate if significant new content
  const significantNewContent = newMemoryCount >= 3 || lastMemoryImportance >= 8;

  // Regenerate if document is old and has new memories
  const daysSinceUpdate = (Date.now() - document.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const isOld = daysSinceUpdate > 7;

  return significantNewContent || (isOld && newMemoryCount > 0);
}

/**
 * Generate a context summary for conversation preparation
 */
export async function generateContextSummary(
  documents: IndexDocument[],
  conversationTopic?: string
): Promise<string> {
  if (documents.length === 0) {
    return '';
  }

  // Sort by relevance/priority
  const sortedDocs = [...documents].sort((a, b) => {
    const catA = getCategoryByCode(a.indexCode as IndexCode);
    const catB = getCategoryByCode(b.indexCode as IndexCode);
    return (catB?.priority || 5) - (catA?.priority || 5);
  });

  // Build context sections
  const sections = sortedDocs.map((doc) => {
    const category = getCategoryByCode(doc.indexCode as IndexCode);
    return `[${doc.indexCode}] ${category?.topicName || doc.title}:
${doc.summary}
Key: ${doc.keyInsights.slice(0, 2).join('; ')}
Approach: ${doc.recommendations.slice(0, 2).join('; ')}`;
  });

  return `CONTEXT PROFILE:
${sections.join('\n\n')}`;
}
