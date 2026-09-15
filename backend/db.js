import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isMongoConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('YOUR_MONGODB_URI')) {
    console.log('[Database] No MONGODB_URI provided in environment. Operating in local JSON / in-memory fallback mode.');
    isMongoConnected = false;
    return false;
  }

  try {
    console.log('[Database] Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });

    isMongoConnected = true;
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host} / ${conn.connection.name}`);
    return true;
  } catch (err) {
    console.warn(`[Database Warning] Could not connect to MongoDB Atlas (${err.message}). Falling back to local JSON / in-memory storage mode.`);
    isMongoConnected = false;
    return false;
  }
}

export function getMongoStatus() {
  return {
    connected: isMongoConnected,
    mode: isMongoConnected ? 'mongodb-atlas' : 'local-json-fallback',
    readyState: mongoose.connection.readyState
  };
}

export { mongoose, isMongoConnected };
