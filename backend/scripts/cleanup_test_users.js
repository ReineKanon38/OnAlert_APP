require('dotenv').config();
const { Pool } = require('pg');

function shouldKeepUser(user) {
  if (user.role === 'security' || user.role === 'admin') {
    return true;
  }

  if (/^alumno_final_.*@tesch\.edu\.mx$/i.test(user.email)) {
    return true;
  }

  return false;
}

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const usersResult = await pool.query(
    'SELECT id, email, nombre, matricula, role FROM users ORDER BY id',
  );

  const allUsers = usersResult.rows;
  const usersToKeep = allUsers.filter(shouldKeepUser);
  const usersToDelete = allUsers.filter((user) => !shouldKeepUser(user));

  if (usersToDelete.length > 0) {
    const ids = usersToDelete.map((user) => user.id);
    await pool.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
  }

  console.log(
    JSON.stringify(
      {
        kept: usersToKeep.map((user) => ({
          id: user.id,
          email: user.email,
          role: user.role,
        })),
        deleted: usersToDelete.map((user) => ({
          id: user.id,
          email: user.email,
          role: user.role,
        })),
      },
      null,
      2,
    ),
  );

  await pool.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
