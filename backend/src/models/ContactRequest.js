import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// Only one pending request per (from → to)
schema.index(
  { from: 1, to: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model('ContactRequest', schema);