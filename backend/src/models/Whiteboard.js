import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    payload: mongoose.Schema.Types.Mixed,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const pageSchema = new mongoose.Schema(
  { name: String, events: [eventSchema] },
  { _id: true }
);

export default mongoose.model(
  'Whiteboard',
  new mongoose.Schema(
    {
      meeting: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Meeting',
        unique: true, index: true, required: true,
      },
      pages: [pageSchema],
      activePage: String,
      editingMode: { type: String, enum: ['everyone', 'restricted'], default: 'everyone' },
    },
    { timestamps: true }
  )
);