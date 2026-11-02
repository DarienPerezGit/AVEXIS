// npm run create-titular: installs the firm's first owner. Safe in production: it deletes nothing.
// Reads TITULAR_NOMBRE, TITULAR_EMAIL and TITULAR_PASSWORD; the password is temporary and must be changed on first login.
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { crearTitularInicial } from '../usuarios/titular-inicial.js';
import { describeDatabase, requireEnv } from './database-target.js';

const uri = requireEnv('MONGODB_URI');
const database = describeDatabase(uri);
const titular = {
  nombre: requireEnv('TITULAR_NOMBRE'),
  email: requireEnv('TITULAR_EMAIL'),
  password: requireEnv('TITULAR_PASSWORD'),
};

await connectDatabase(uri);
try {
  const { creado } = await crearTitularInicial(titular);
  console.log(
    creado
      ? `Firm owner ${titular.email} created in ${database}; they must change the password on first login`
      : `${database} already has an active firm owner; nothing was created`,
  );
} finally {
  await disconnectDatabase();
}
