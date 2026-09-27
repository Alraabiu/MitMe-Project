import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    subject: { type: String, trim: true, maxlength: 60, default: '' },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    coverColor: { type: String, default: '#4B24A8' },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    assignments: { type: Array, default: [] },
    resources: { type: Array, default: [] },
    meetingIds: { type: Array, default: [] },
  },
  { timestamps: true }
);

schema.index({ teacher: 1, isArchived: 1 });
schema.index({ students: 1, isArchived: 1 });

schema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Class', schema);
