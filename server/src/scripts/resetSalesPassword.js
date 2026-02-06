import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { connectDB } from '../lib/db.js';

async function resetSalesPassword(email, newPassword) {
  try {
    await connectDB();
    
    if (!email || !newPassword) {
      console.error('❌ Please provide email and new password');
      console.log('Usage: node src/scripts/resetSalesPassword.js <email> <password>');
      process.exit(1);
    }
    
    console.log(`🔍 Looking for sales user: ${email}`);
    
    // Find the sales user
    const salesUser = await User.findOne({ email, role: 'sales' });
    
    if (!salesUser) {
      console.log(`❌ No sales user found with email: ${email}`);
      process.exit(1);
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    salesUser.password = hashedPassword;
    await salesUser.save();
    
    console.log(`✅ Password reset for ${salesUser.name} (${salesUser.email})`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`🎉 They can now login with the new password`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];
resetSalesPassword(email, password);
