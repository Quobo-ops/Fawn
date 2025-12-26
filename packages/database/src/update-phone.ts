import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

config({ path: resolve(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updatePhone() {
  const oldNumber = '+18555149404';
  const newNumber = '+13373456372';
  
  const result = await pool.query(
    'UPDATE assigned_phone_numbers SET phone_number = $1 WHERE phone_number = $2',
    [newNumber, oldNumber]
  );
  
  console.log(`Updated ${result.rowCount} row(s)`);
  
  // Also update .env reference
  const envResult = await pool.query(
    'SELECT * FROM assigned_phone_numbers'
  );
  console.log('Current assigned numbers:', envResult.rows);
  
  await pool.end();
}

updatePhone().catch(console.error);

