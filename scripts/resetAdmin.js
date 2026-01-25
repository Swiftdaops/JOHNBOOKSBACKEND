// scripts/resetAdmin.js
// Connects to the database and updates/creates the admin user.
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  try {
    await connectDB();

    const targetUsername = 'Johnisadmin';
    const targetPassword = 'ebooksecurityIS100%';

    const envAdmin = process.env.ADMIN_USERNAME || 'site_admin';

    let user = await User.findOne({ username: envAdmin });
    if (!user) {
      user = await User.findOne();
    }

    if (!user) {
      // No users in DB - create a new admin
      const created = await User.create({ username: targetUsername, password: targetPassword });
      console.log('Created new admin user:', created.username, created._id.toString());
    } else {
      // Update existing user record to the requested credentials
      user.username = targetUsername;
      user.password = targetPassword;
      await user.save();
      console.log('Updated admin user id:', user._id.toString(), '-> username:', user.username);
    }

    // Verify password matches
    const fresh = await User.findOne({ username: targetUsername }).select('+password');
    if (!fresh) {
      console.error('Verification failed: could not find user after update.');
      process.exit(1);
    }
    const ok = await fresh.matchPassword(targetPassword);
    console.log('Password verification result:', ok);

    process.exit(0);
  } catch (err) {
    console.error('Error resetting admin:', err);
    process.exit(1);
  }
})();
