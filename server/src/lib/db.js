import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI or MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
}
