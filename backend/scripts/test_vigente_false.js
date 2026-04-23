require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const now = Date.now();
  const email = `no_vigente_${now}@tesch.edu.mx`;
  const password = 'Abc123#';
  const nombre = 'No Vigente';
  const matricula = `NV${now}`;

  const registerResponse = await fetch('http://127.0.0.1:3000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nombre, matricula, role: 'student' }),
  });

  if (!registerResponse.ok) {
    const text = await registerResponse.text();
    throw new Error(`registro fallo: ${text}`);
  }

  await pool.query('UPDATE users SET vigente = FALSE WHERE email = $1', [email]);

  const loginResponse = await fetch('http://127.0.0.1:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginResponse.json();

  console.log(
    JSON.stringify({
      test: 'vigente_false_login_blocked',
      statusCode: loginResponse.status,
      message: loginData.error,
      expected: 'Usuario no vigente en la institución',
      pass:
        loginResponse.status === 403 &&
        loginData.error === 'Usuario no vigente en la institución',
    }),
  );

  await pool.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
