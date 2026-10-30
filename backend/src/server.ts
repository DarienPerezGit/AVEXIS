import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';

await connectDatabase(env.mongodbUri);
console.log('MongoDB connected');

createApp({ logDir: env.logDir }).listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
