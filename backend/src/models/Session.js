import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    tokenHash: { type: String, index: true, required: true },
    jti: { type: String, index: true, required: true, unique: true },
    deviceName: String,
    userAgent: String,
    ip: String,
   expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-expire sessions from Mongo (TTL)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Session', schema);