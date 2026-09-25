import Contact from '../models/Contact.js';
import ContactRequest from '../models/ContactRequest.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';

export const list = asyncHandler(async (req, res) => {
  const rows = await Contact.find({ owner: req.user._id })
    .populate('contact', 'displayName username avatarUrl presence lastSeen')
    .sort({ createdAt: -1 });
  res.json({ contacts: rows.map((x) => x.contact) });
});

export const requests = asyncHandler(async (req, res) => {
  const rows = await ContactRequest.find({ to: req.user._id, status: 'pending' })
    .populate('from', 'displayName username avatarUrl presence');
  res.json({ requests: rows });
});

export const send = asyncHandler(async (req, res) => {
  const target = await User.findById(req.body.userId);
  if (!target || String(target._id) === String(req.user._id)) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (await Contact.exists({ owner: req.user._id, contact: target._id })) {
    return res.status(409).json({ message: 'Already a contact' });
  }
  // Use upsert to be resilient against concurrent requests
  try {
    await ContactRequest.create({ from: req.user._id, to: target._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Request already sent' });
    }
    throw err;
  }
  res.status(201).json({ success: true });
});

export const accept = asyncHandler(async (req, res) => {
  const r = await ContactRequest.findOne({
    _id: req.params.id, to: req.user._id, status: 'pending',
  });
  if (!r) return res.status(404).json({ message: 'Request not found' });

  r.status = 'accepted';
  await r.save();

  // Idempotent upserts on both directions
  await Promise.all([
    Contact.updateOne(
      { owner: req.user._id, contact: r.from },
      { $setOnInsert: { owner: req.user._id, contact: r.from } },
      { upsert: true }
    ),
    Contact.updateOne(
      { owner: r.from, contact: req.user._id },
      { $setOnInsert: { owner: r.from, contact: req.user._id } },
      { upsert: true }
    ),
  ]);

  res.json({ success: true });
});

export const remove = asyncHandler(async (req, res) => {
  await Contact.deleteMany({
    $or: [
      { owner: req.user._id, contact: req.params.userId },
      { owner: req.params.userId, contact: req.user._id },
    ],
  });
  res.json({ success: true });
});