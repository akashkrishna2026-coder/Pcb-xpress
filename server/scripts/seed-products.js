import dotenv from 'dotenv';
import path from 'path';
import { ensureDb, replaceWithSeed } from '../lib/db.js';

async function main() {
  try {
    // Load env from project root .env first
    dotenv.config();
    // If missing, also try the server/.env
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
      dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
    }
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI or MONGO_URI not set. Define it in .env or environment.');
    await ensureDb();
    await replaceWithSeed();
    console.log('✅ Products collection created and seeded with defaults.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err?.message || err);
    process.exit(1);
  }
}

main();
