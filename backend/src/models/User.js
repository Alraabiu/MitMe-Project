import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: /^[a-z0-9_.-]{3,30}$/,
    },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, trim: true },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    avatarUrl: String,
    bio: { type: String, maxlength: 240 },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    presence: {
      type: String,
      enum: ['online', 'away', 'dnd', 'offline'],
      default: 'offline',
    },
    lastSeen: Date,
    // Role field kept for backward compatibility with old accounts,
    // but the app no longer uses it. Default is 'member' for new users.
    role: {
      type: String,
      enum: ['member', 'student', 'teacher', 'moderator', 'admin'],
      default: 'member',
    },
  },
  { timestamps: true }
);

schema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);
schema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);
schema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } }
);

schema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', schema);