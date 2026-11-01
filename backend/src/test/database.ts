import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

/** Runs the calling test file against a fresh in-memory MongoDB, emptied after every test. */
export function useTestDatabase() {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
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
