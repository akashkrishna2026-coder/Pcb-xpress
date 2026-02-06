import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../lib/db.js';

async function activateSalesUser(email) {
  try {
    await connectDB();
    
    if (!email) {
      console.error('❌ Please provide an email address');
      console.log('Usage: node src/scripts/activateSalesUser.js <email>');
      process.exit(1);
    }
    
    console.log(`🔍 Looking for sales user: ${email}`);
    
    // Find the sales user
    const salesUser = await User.findOne({ email, role: 'sales' });
    
    if (!salesUser) {
      console.log(`❌ No sales user found with email: ${email}`);
      console.log('💡 Available sales users:');
      
      const allSalesUsers = await User.find({ role: 'sales' });
      allSalesUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Active: ${user.isActive ? 'YES' : 'NO'}`);
      });
      
      process.exit(1);
    }
    
    if (salesUser.isActive) {
      console.log(`✅ Sales user ${salesUser.name} is already active!`);
      process.exit(0);
    }
    
    // Activate the user
    salesUser.isActive = true;
    await salesUser.save();
    
    console.log(`✅ Sales user ${salesUser.name} (${salesUser.email}) has been ACTIVATED!`);
    console.log(`🎉 They can now login at /sales/login`);
    
  } catch (error) {
    console.error('❌ Error activating sales user:', error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
activateSalesUser(email);
