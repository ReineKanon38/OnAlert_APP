require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const result = await pool.query(
    'SELECT id, email, nombre, matricula, role, vigente FROM users ORDER BY id',
  );

  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
