const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:c8FIe83k8UQW7QpA@db.cupiflympfrjxzwpsmnh.supabase.co:5432/postgres' 
});

pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
  .then(r => { 
    console.log('Tables found:', r.rows.length);
    console.log('Fawn tables:', r.rows.filter(x => x.table_name.startsWith('fawn')).map(x => x.table_name));
    console.log('All tables:', r.rows.map(x => x.table_name).slice(0, 20));
    pool.end(); 
  })
  .catch(e => { 
    console.error(e); 
    pool.end(); 
  });

