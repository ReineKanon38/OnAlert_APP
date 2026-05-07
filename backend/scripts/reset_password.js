const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const email = 'rotsen_lh1@tesch.edu.mx';
const newPass = 'Rotsen123#';

bcrypt.hash(newPass, 10).then(hash => {
  pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email])
    .then(r => {
      console.log('Contraseña actualizada. Filas afectadas:', r.rowCount);
      console.log('Nueva contraseña:', newPass);
      pool.end();
    })
    .catch(e => { console.error(e); pool.end(); });
});
