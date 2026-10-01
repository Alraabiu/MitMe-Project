import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'class'],
      default: 'direct',
    },

    /* Regular chat fields */
    title: String,
    avatarUrl: String,
    description: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessageAt: Date,

    /* Class-scoped chat: only used when type === 'class' */
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ members: 1, lastMessageAt: -1 });

/* One class = one chat room. Enforced by partial unique index. */
schema.index(
  { classId: 1 },
  { unique: true, partialFilterExpression: { type: 'class' } }
);

export default mongoose.model('Conversation', schema);