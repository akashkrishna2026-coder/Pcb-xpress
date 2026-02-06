import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { connectDB } from '../lib/db.js';

async function testPassword(email, testPassword) {
  try {
    await connectDB();
    
    console.log(`🔍 Testing password for: ${email}`);
    
    // Find the sales user
    const salesUser = await User.findOne({ email, role: 'sales' });
    
    if (!salesUser) {
      console.log(`❌ No sales user found with email: ${email}`);
      process.exit(1);
    }
    
    console.log(`✅ User found: ${salesUser.name}`);
    console.log(`📧 Email: ${salesUser.email}`);
    console.log(`🔑 Role: ${salesUser.role}`);
    console.log(`✅ Active: ${salesUser.isActive}`);
    
    // Test the password
    const isMatch = await bcrypt.compare(testPassword, salesUser.password);
    
    console.log(`\n🧪 Testing password: "${testPassword}"`);
    console.log(`🔓 Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);
    
    if (isMatch) {
      console.log(`\n🎉 SUCCESS! You can login with:`);
      console.log(`   Email: ${salesUser.email}`);
      console.log(`   Password: ${testPassword}`);
      console.log(`   URL: http://localhost:5173/sales/login`);
    } else {
      console.log(`\n❌ Password doesn't match. Try a different password or reset it.`);
    }
    
  } catch (error) {
    console.error('❌ Error testing password:', error);
  } finally {
    process.exit(0);
  }
}

// Get email and password from command line arguments
const email = process.argv[2] || 'akashkrisna2026@mca.ajce.in';
const password = process.argv[3] || '123456';
testPassword(email, password);
