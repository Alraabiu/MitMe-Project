import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';

const isMember = (c, id) => c.members.some((m) => String(m._id || m) === String(id));

export const list = asyncHandler(async (req, res) => {
  const rows = await Conversation.find({ members: req.user._id })
    .populate('members', 'displayName username avatarUrl presence')
    .sort({ lastMessageAt: -1 });
  res.json({ conversations: rows });
});

export const create = asyncHandler(async (req, res) => {
  const ids = [...new Set([String(req.user._id), ...(req.body.memberIds || []).map(String)])];
  if (req.body.type === 'direct' && ids.length !== 2) {
    return res.status(400).json({ message: 'Direct chat needs two members' });
  }

  const users = await User.find({ _id: { $in: ids } }).select('_id');
  if (users.length !== ids.length) {
    return res.status(400).json({ message: 'A member was not found' });
  }

  if (req.body.type === 'direct') {
    const existing = await Conversation.findOne({
      type: 'direct', members: { $all: ids, $size: 2 },
    });
    if (existing) return res.json({ conversation: existing });
  }

  const c = await Conversation.create({
    type: req.body.type || 'direct',
    title: req.body.title,
    members: ids,
    admins: [req.user._id],
    createdBy: req.user._id,
  });

  res.status(201).json({
    conversation: await c.populate('members', 'displayName username avatarUrl presence'),
  });
});

export const messages = asyncHandler(async (req, res) => {
  const c = await Conversation.findById(req.params.id);
  if (!c || !isMember(c, req.user._id)) {
    return res.status(404).json({ message: 'Conversation not found' });
  }
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const rows = await Message.find({ conversation: c._id })
    .populate('sender', 'displayName username avatarUrl')
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({ messages: rows.reverse() });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const c = await Conversation.findById(req.params.id);
  if (!c || !isMember(c, req.user._id)) {
    return res.status(404).json({ message: 'Conversation not found' });
  }
  if (!req.body.text?.trim() && !req.body.attachments?.length) {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }

  const m = await Message.create({
    conversation: c._id,
    sender: req.user._id,
    text: req.body.text?.trim(),
    attachments: req.body.attachments || [],
    replyTo: req.body.replyTo,
  });

  c.lastMessageAt = new Date();
  await c.save();

  await m.populate('sender', 'displayName username avatarUrl');
  req.app.get('io').to(`conversation:${c._id}`).emit('message:new', m);
  res.status(201).json({ message: m });
});