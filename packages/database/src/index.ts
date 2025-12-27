import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export * from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

// Vector similarity search helper
export async function searchMemoriesByEmbedding(
  userId: string,
  embedding: number[],
  limit: number = 10,
  threshold: number = 0.7
) {
  const embeddingString = `[${embedding.join(',')}]`;

  const result = await pool.query(`
    SELECT
      id, content, category, importance, metadata, tags,
      1 - (embedding::vector <=> $1::vector) as similarity
    FROM memories
    WHERE user_id = $2
      AND embedding IS NOT NULL
      AND 1 - (embedding::vector <=> $1::vector) > $3
    ORDER BY embedding::vector <=> $1::vector
    LIMIT $4
  `, [embeddingString, userId, threshold, limit]);

  return result.rows;
}

// Full-text search fallback
export async function searchMemoriesByText(
  userId: string,
  query: string,
  limit: number = 10
) {
  const result = await pool.query(`
    SELECT id, content, category, importance, metadata, tags
    FROM memories
    WHERE user_id = $1
      AND content ILIKE $2
    ORDER BY importance DESC, created_at DESC
    LIMIT $3
  `, [userId, `%${query}%`, limit]);

  return result.rows;
}

// ============================================
// Index Document Search Functions
// ============================================

/**
 * Search index documents by embedding similarity
 */
export async function searchIndexDocumentsByEmbedding(
  userId: string,
  embedding: number[],
  limit: number = 5,
  threshold: number = 0.3
) {
  const embeddingString = `[${embedding.join(',')}]`;

  const result = await pool.query(`
    SELECT
      id, index_code, domain, title, summary, content,
      key_insights, patterns, recommendations,
      confidence, memory_count, status,
      1 - (embedding::vector <=> $1::vector) as similarity
    FROM index_documents
    WHERE user_id = $2
      AND embedding IS NOT NULL
      AND status = 'active'
      AND 1 - (embedding::vector <=> $1::vector) > $3
    ORDER BY embedding::vector <=> $1::vector
    LIMIT $4
  `, [embeddingString, userId, threshold, limit]);

  return result.rows;
}

/**
 * Get index documents by domain
 */
export async function getIndexDocumentsByDomain(
  userId: string,
  domain: string,
  limit: number = 10
) {
  const result = await pool.query(`
    SELECT
      id, index_code, domain, title, summary, content,
      key_insights, patterns, recommendations,
      confidence, memory_count, status, updated_at
    FROM index_documents
    WHERE user_id = $1
      AND domain = $2
      AND status = 'active'
    ORDER BY confidence DESC, updated_at DESC
    LIMIT $3
  `, [userId, domain, limit]);

  return result.rows;
}

/**
 * Get memories with their index directives for context building
 */
export async function getMemoriesWithDirectives(
  userId: string,
  memoryIds: string[]
) {
  if (memoryIds.length === 0) return [];

  const placeholders = memoryIds.map((_, i) => `$${i + 2}`).join(',');

  const result = await pool.query(`
    SELECT
      m.id as memory_id,
      m.content,
      m.category,
      m.importance,
      d.primary_index_code,
      d.related_index_codes,
      d.confidence as directive_confidence,
      d.retrieval_priority
    FROM memories m
    LEFT JOIN index_directives d ON d.memory_id = m.id
    WHERE m.user_id = $1
      AND m.id IN (${placeholders})
    ORDER BY m.importance DESC
  `, [userId, ...memoryIds]);

  return result.rows;
}

/**
 * Get comprehensive context for conversation preparation
 * Combines relevant index documents with recent memories
 */
export async function getConversationContext(
  userId: string,
  queryEmbedding: number[],
  options: {
    maxDocuments?: number;
    maxMemories?: number;
    priorityDomains?: string[];
  } = {}
) {
  const {
    maxDocuments = 3,
    maxMemories = 10,
    priorityDomains = ['I', 'F', 'J'] // Communication, Emotional, Challenges
  } = options;

  const embeddingString = `[${queryEmbedding.join(',')}]`;

  // Get relevant index documents
  const docsResult = await pool.query(`
    SELECT
      id, index_code, domain, title, summary,
      key_insights, patterns, recommendations,
      1 - (embedding::vector <=> $1::vector) as similarity
    FROM index_documents
    WHERE user_id = $2
      AND embedding IS NOT NULL
      AND status = 'active'
    ORDER BY
      CASE WHEN domain = ANY($4::text[]) THEN 0 ELSE 1 END,
      embedding::vector <=> $1::vector
    LIMIT $3
  `, [embeddingString, userId, maxDocuments, priorityDomains]);

  // Get relevant memories with their directives
  const memoriesResult = await pool.query(`
    SELECT
      m.id, m.content, m.category, m.importance,
      d.primary_index_code, d.related_index_codes,
      1 - (m.embedding::vector <=> $1::vector) as similarity
    FROM memories m
    LEFT JOIN index_directives d ON d.memory_id = m.id
    WHERE m.user_id = $2
      AND m.embedding IS NOT NULL
    ORDER BY m.embedding::vector <=> $1::vector
    LIMIT $3
  `, [embeddingString, userId, maxMemories]);

  return {
    indexDocuments: docsResult.rows,
    memories: memoriesResult.rows,
    retrievedAt: new Date()
  };
}
