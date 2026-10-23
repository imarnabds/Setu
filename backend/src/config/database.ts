import mongoose from 'mongoose';
import { config } from './index.js';

let isConnected = false;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    console.log(`[Database] Connecting to MongoDB at: ${config.mongodbUri.replace(/:([^:@]{3,})@/, ':****@')}`);
    
    mongoose.connection.on('connected', () => {
      console.log('[Database] MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database Error] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB disconnected.');
      isConnected = false;
    });

    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: config.nodeEnv !== 'production' // Create indexes in development
    });

    isConnected = true;
    return conn;
  } catch (error: any) {
    console.error(`[Database Fatal Error] Failed to connect to MongoDB: ${error.message}`);
    isConnected = false;
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB connection closed.');
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
