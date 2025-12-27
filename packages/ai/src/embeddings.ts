import OpenAI from 'openai';

// Lazy initialization - only create client when needed and API key is available
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  openai = new OpenAI();
  return openai;
}

// Using OpenAI's ada-002 for embeddings (1536 dimensions)
const EMBEDDING_MODEL = 'text-embedding-ada-002';

/**
 * Generate embedding for a single text
 * Returns empty array if OpenAI is not configured or fails
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn('[WARN] OpenAI not configured - skipping embedding generation');
    return [];
  }
  
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    if (!response.data || response.data.length === 0) {
      console.error('[ERROR] OpenAI returned empty embedding data');
      return [];
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('[ERROR] Failed to generate embedding:', error, {
      textLength: text.length,
      textPreview: text.substring(0, 100),
    });
    // Return empty array to allow graceful degradation
    return [];
  }
}

/**
 * Generate embeddings for multiple texts
 * Returns empty arrays if OpenAI is not configured
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  if (!client) {
    console.warn('[WARN] OpenAI not configured - skipping embedding generation');
    return texts.map(() => []);
  }

  try {
    // OpenAI supports batch embedding
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

    if (!response.data || response.data.length === 0) {
      console.error('[ERROR] OpenAI returned empty embedding data');
      return texts.map(() => []);
    }

    // Sort by index to maintain order
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  } catch (error) {
    console.error('[ERROR] Failed to generate embeddings:', error, {
      textCount: texts.length,
    });
    // Return empty arrays for graceful degradation
    return texts.map(() => []);
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }

  if (a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Prepare text for embedding by cleaning and normalizing
 */
export function prepareTextForEmbedding(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 8000); // Token limit safety
}

/**
 * Serialize embedding to string for database storage
 */
export function serializeEmbedding(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Deserialize embedding from string
 */
export function deserializeEmbedding(serialized: string): number[] {
  try {
    return JSON.parse(serialized);
  } catch (error) {
    console.error('[ERROR] Failed to deserialize embedding:', error);
    return [];
  }
}
