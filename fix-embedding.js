const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:c8FIe83k8UQW7QpA@db.cupiflympfrjxzwpsmnh.supabase.co:5432/postgres' 
});

async function fixEmbedding() {
  try {
    // 1. Enable pgvector extension
    console.log('1. Enabling pgvector extension...');
    await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('   Done!');
    
    // 2. Drop the existing embedding column
    console.log('2. Dropping old text embedding column...');
    await pool.query(`ALTER TABLE memories DROP COLUMN IF EXISTS embedding;`);
    console.log('   Done!');
    
    // 3. Add new vector column
    console.log('3. Adding new vector(1536) column...');
    await pool.query(`ALTER TABLE memories ADD COLUMN embedding vector(1536);`);
    console.log('   Done!');
    
    // 4. Create index for similarity search
    console.log('4. Creating vector similarity index...');
    await pool.query(`CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`);
    console.log('   Done!');
    
    console.log('\n✅ All done! Embedding column is now vector(1536)');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    pool.end();
  }
}

fixEmbedding();

