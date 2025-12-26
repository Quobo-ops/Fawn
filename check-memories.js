const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:c8FIe83k8UQW7QpA@db.cupiflympfrjxzwpsmnh.supabase.co:5432/postgres' 
});

pool.query(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'memories' ORDER BY ordinal_position`)
  .then(r => { 
    console.log('Memories table columns:');
    r.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name})`));
    pool.end(); 
  })
  .catch(e => { 
    console.error(e); 
    pool.end(); 
  });

