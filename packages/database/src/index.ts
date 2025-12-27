import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export * from './schema';

// Lazy initialization - pool is created on first use after env vars are loaded
let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

// Create a typed proxy for lazy initialization
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_, prop) {
    if (!dbInstance) {
      dbInstance = drizzle(getPool(), { schema });
    }
    return (dbInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Database = typeof db;

// Vector similarity search helper
export async function searchMemoriesByEmbedding(
  userId: string,
  embedding: number[],
  limit: number = 10,
  threshold: number = 0.7
) {
  const embeddingString = `[${embedding.join(',')}]`;

  const result = await getPool().query(`
    SELECT
      id, content, category, importance, metadata, tags,
      1 - (embedding::vector <=> $1::vector) as similarity
    FROM fawn_memories
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
  const result = await getPool().query(`
    SELECT id, content, category, importance, metadata, tags
    FROM fawn_memories
    WHERE user_id = $1
      AND content ILIKE $2
    ORDER BY importance DESC, created_at DESC
    LIMIT $3
  `, [userId, `%${query}%`, limit]);

  return result.rows;
}
