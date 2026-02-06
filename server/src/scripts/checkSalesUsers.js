import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../lib/db.js';

async function checkSalesUsers() {
  try {
    await connectDB();
    
    console.log('=== SALES USERS CHECK ===');
    
    // Find all sales users
    const salesUsers = await User.find({ role: 'sales' });
    
    if (salesUsers.length === 0) {
      console.log('❌ No sales users found in database');
      return;
    }
    
    console.log(`📊 Found ${salesUsers.length} sales user(s):`);
    
    salesUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Phone: ${user.phone || 'Not set'}`);
      console.log(`   Department: ${user.department || 'Not set'}`);
    });
    
    // Check if any inactive users need activation
    const inactiveUsers = salesUsers.filter(user => !user.isActive);
    
    if (inactiveUsers.length > 0) {
      console.log(`\n⚠️  ${inactiveUsers.length} inactive sales user(s) found:`);
      inactiveUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
      
      console.log('\n🔧 To activate a sales user, run:');
      console.log('   node src/scripts/activateSalesUser.js <email>');
    } else {
      console.log('\n✅ All sales users are active!');
    }
    
  } catch (error) {
    console.error('❌ Error checking sales users:', error);
  } finally {
    process.exit(0);
  }
}

checkSalesUsers();
