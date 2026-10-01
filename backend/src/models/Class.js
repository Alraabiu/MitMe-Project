import mongoose from 'mongoose';

/* ─── Pending join request subdocument ──────────────── */

const pendingRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedAt: { type: Date, default: Date.now },
    message: { type: String, maxlength: 200, default: '' },
  },
  { _id: true }
);

/* ─── Class schema ──────────────────────────────────── */

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    subject: { type: String, trim: true, maxlength: 60, default: '' },

    /* Internal unique identifier — used by the app to look up the class */
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    /* Public join code — what the admin shares with students (e.g. KAD-ABC) */
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    /* Which school this class belongs to (null = personal / legacy class) */
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
      index: true,
    },

    /* Owner of this class (school admin) */
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /* Approved students who can see + chat in this class */
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],

    /* Students waiting for admin approval */
    pendingRequests: [pendingRequestSchema],

    /* UI */
    coverColor: { type: String, default: '#4B24A8' },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },

    /* Reserved for future expansion */
    assignments: { type: Array, default: [] },
    resources: { type: Array, default: [] },
    meetingIds: { type: Array, default: [] },
  },
  { timestamps: true }
);

schema.index({ teacher: 1, isArchived: 1 });
schema.index({ students: 1, isArchived: 1 });
schema.index({ schoolId: 1, isArchived: 1 });

schema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Class', schema);