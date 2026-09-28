import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      index: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    role: {
      type: String,
      enum: ['host', 'cohost', 'participant'],
      default: 'participant',
    },
    // Waiting room state
    status: {
      type: String,
      enum: ['pending', 'admitted', 'rejected'],
      default: 'pending',
      index: true,
    },
    joinedAt: Date,
    leftAt: Date,
    muted: { type: Boolean, default: false },
    cameraOn: { type: Boolean, default: false },
    handRaised: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.index({ meeting: 1, user: 1 }, { unique: true });
schema.index({ meeting: 1, status: 1 });

export default mongoose.model('MeetingParticipant', schema);