import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';

await connectDatabase(env.mongodbUri);
console.log('MongoDB connected');

createApp({ logDir: env.logDir, auth: env.auth, corsOrigins: env.corsOrigins }).listen(env.port, (error) => {
  // Express 5 also calls this callback when listen fails, e.g. with the port already in use.
  if (error) {
    console.error(`Could not start the API on port ${env.port}: ${error.message}`);
    process.exit(1);
  }
  console.log(`API listening on http://localhost:${env.port}`);
});
