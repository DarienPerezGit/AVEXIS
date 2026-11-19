import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

/** Runs the calling test file against a fresh in-memory MongoDB, emptied after every test. */
export function useTestDatabase() {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    // Files run in parallel and each starts its own mongod: with many at once the default 10 s launch limit is not enough.
    server = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(server.getUri());
    await mongoose.connection.syncIndexes();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
  });
}
