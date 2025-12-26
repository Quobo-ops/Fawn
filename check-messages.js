const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:c8FIe83k8UQW7QpA@db.cupiflympfrjxzwpsmnh.supabase.co:5432/postgres' 
});

async function check() {
  try {
    // Check conversations
    const convos = await pool.query(`SELECT id, user_id, message_count, last_message_at FROM conversations ORDER BY last_message_at DESC LIMIT 5`);
    console.log('Conversations:', convos.rows);
    
    // Check messages
    const msgs = await pool.query(`SELECT id, role, content, created_at FROM messages ORDER BY created_at DESC LIMIT 10`);
    console.log('\nMessages:', msgs.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();

