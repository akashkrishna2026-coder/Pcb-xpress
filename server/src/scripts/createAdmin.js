import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../lib/db.js';
import User from '../models/User.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  const { email, password, name = 'Admin' } = parseArgs();
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- --email admin@example.com --password secret [--name Admin]');
    process.exit(1);
  }
  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`Promoted existing user ${email} to admin.`);
    } else {
      console.log('Admin already exists for this email.');
    }
    await mongoose.disconnect();
    return;
  }
  const hash = await bcrypt.hash(String(password), 10);
  const user = await User.create({ name, email: email.toLowerCase(), password: hash, role: 'admin' });
  console.log('Admin created:', { id: user._id.toString(), email: user.email });
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

