import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, maxlength: 1000 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    code: { type: String, unique: true, index: true, required: true },
    passwordHash: { type: String, select: false },
    scheduledStart: Date,
    scheduledEnd: Date,
    timeZone: String,
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    waitingRoom: { type: Boolean, default: true },
    whiteboardEnabled: { type: Boolean, default: true },
    chatEnabled: { type: Boolean, default: true },
    screenShareEnabled: { type: Boolean, default: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // NEW: optional class link for live classroom sessions
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ host: 1, scheduledStart: -1 });
schema.index({ participants: 1 });
schema.index({ classId: 1, status: 1 });

export default mongoose.model('Meeting', schema);
