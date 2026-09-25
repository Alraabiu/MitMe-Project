import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

schema.index({ owner: 1, contact: 1 }, { unique: true });

export default mongoose.model('Contact', schema);