import mongoose from 'mongoose';
import { env } from './env.js';
import { log } from './logger.js';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== 'production',
  });
  log.info('mongodb_connected', { uri: env.MONGODB_URI.replace(/:\/\/.*@/, '://***@') });
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  log.info('mongodb_disconnected');
};