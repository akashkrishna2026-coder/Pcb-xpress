import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../lib/db.js';
import User from '../models/User.js';

async function main() {
  await connectDB();

  // Seed admin
  const adminEmail = 'admin@pcbxpress.online';
  const adminPassword = 'admin123';
  const adminName = 'Admin User';

  let admin = await User.findOne({ email: adminEmail.toLowerCase() });
  if (!admin) {
    const hash = await bcrypt.hash(adminPassword, 10);
    admin = await User.create({ name: adminName, email: adminEmail.toLowerCase(), password: hash, role: 'admin' });
    console.log('Admin created:', { id: admin._id.toString(), email: admin.email, role: admin.role });
  } else {
    console.log('Admin already exists:', admin.email);
  }

  // Seed user
  const userEmail = 'user@pcbxpress.online';
  const userPassword = 'user123';
  const userName = 'Test User';

  let user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user) {
    const hash = await bcrypt.hash(userPassword, 10);
    user = await User.create({ name: userName, email: userEmail.toLowerCase(), password: hash, role: 'user' });
    console.log('User created:', { id: user._id.toString(), email: user.email, role: user.role });
  } else {
    console.log('User already exists:', user.email);
  }

  await mongoose.disconnect();
  console.log('Seeding completed.');
}

main().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});