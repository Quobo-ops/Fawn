import OpenAI from 'openai';

const openai = new OpenAI();

// Using OpenAI's ada-002 for embeddings (1536 dimensions)
const EMBEDDING_MODEL = 'text-embedding-ada-002';

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // OpenAI supports batch embedding
  const response = await openai.embeddings.create({
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
