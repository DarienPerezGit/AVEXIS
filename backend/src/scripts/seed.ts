// npm run seed: resets the database in MONGODB_URI to the demo data. Refuses NODE_ENV=production.
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedDemo } from '../seed/seed-demo.js';
import { describeDatabase, requireEnv } from './database-target.js';

const uri = requireEnv('MONGODB_URI');
const nodeEnv = process.env.NODE_ENV ?? 'development';

console.log(`Demo seed target: ${describeDatabase(uri)} (NODE_ENV=${nodeEnv})`);
await connectDatabase(uri);
try {
  await seedDemo({ nodeEnv, now: new Date() });
  console.log('Database reset to the demo data');
} finally {
  await disconnectDatabase();
}
