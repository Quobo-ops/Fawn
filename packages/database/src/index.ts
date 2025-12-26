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
