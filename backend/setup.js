const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users (optional - remove if you want to keep existing data)
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      upiId: 'admin@upi',
      phoneNumber: '9876543210',
      role: 'admin'
    });
    await admin.save();

    // Create test user
    const userPassword = await bcrypt.hash('user123', 12);
    const testUser = new User({
      name: 'Test User',
      email: 'user@example.com',
      password: userPassword,
      upiId: 'user@upi',
      phoneNumber: '9876543211',
      role: 'user'
    });
    await testUser.save();

    console.log('Created admin user: admin@example.com / admin123');
    console.log('Created test user: user@example.com / user123');

    mongoose.disconnect();
    console.log('Database setup completed!');
  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
};

setupDatabase();
