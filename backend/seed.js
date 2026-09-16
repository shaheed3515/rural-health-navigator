import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { connectDB, mongoose } from './db.js';
import User from './models/User.js';
import Clinic from './models/Clinic.js';

export async function seedDatabase() {
  const isConnected = await connectDB();

  if (!isConnected) {
    console.log('[Seed] MongoDB is not connected. Skipping database seeding; local JSON fallback is active.');
    return;
  }

  try {
    // 1. Seed Clinics if empty
    const clinicCount = await Clinic.countDocuments();
    if (clinicCount === 0) {
      const clinicsPath = path.join(__dirname, 'data', 'clinics.json');
      const rawData = fs.readFileSync(clinicsPath, 'utf8');
      const clinicsData = JSON.parse(rawData);

      await Clinic.insertMany(clinicsData);
      console.log(`[Seed] Seeded ${clinicsData.length} rural clinics into MongoDB collection.`);
    } else {
      console.log(`[Seed] Clinic collection already contains ${clinicCount} records.`);
    }

    // 2. Seed Default CMO Admin User if not exists
    const adminUser = await User.findOne({ username: 'cmo_admin' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);

      await User.create({
        fullName: 'Dr. S. K. Verma',
        username: 'cmo_admin',
        passwordHash,
        role: 'admin',
        district: 'Maharashtra Health Division',
        preferredLanguage: 'English'
      });
      console.log('[Seed] Seeded default CMO Administrator account (username: cmo_admin).');
    } else {
      console.log('[Seed] Admin user "cmo_admin" is already present.');
    }

    console.log('[Seed] Database initialization and seeding complete.');
  } catch (err) {
    console.error('[Seed Error]:', err.message);
  }
}

// If run directly via node seed.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
}

export default seedDatabase;
