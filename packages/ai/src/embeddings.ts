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
 * Returns null if OpenAI is not configured
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  if (!client) {
    // Return empty embedding if OpenAI not configured
    // This allows the system to work without embeddings
    console.warn('OpenAI not configured - skipping embedding generation');
    return [];
  }
  
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts
 * Returns empty arrays if OpenAI is not configured
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  if (!client) {
    console.warn('OpenAI not configured - skipping embedding generation');
    return texts.map(() => []);
  }

  // OpenAI supports batch embedding
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  // Sort by index to maintain order
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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
  return JSON.parse(serialized);
}
