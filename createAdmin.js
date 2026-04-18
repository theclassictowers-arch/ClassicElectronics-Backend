import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';
import connectDB from './config/db.js';

dotenv.config();

const createAdmin = async () => {
  await connectDB();

  try {
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'qamarbilal0092@gmail.com';
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Qamar@0092';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit();
    }

    // Create admin
    const admin = await Admin.create({
      email: adminEmail,
      password: adminPassword
    });

    console.log(`Admin created successfully: ${admin.email}`);
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

createAdmin();
