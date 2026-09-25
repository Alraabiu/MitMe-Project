import Meeting from '../models/Meeting.js';
import MeetingParticipant from '../models/MeetingParticipant.js';
import Whiteboard from '../models/Whiteboard.js';
import { createMeetingCode } from '../utils/meeting.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/error.js';

const newCode = async () => {
  for (let i = 0; i < 5; i++) {
    const c = createMeetingCode();
    if (!(await Meeting.exists({ code: c }))) return c;
  }
  throw new Error('Could not allocate a unique meeting code');
};

export const create = asyncHandler(async (req, res) => {
  const code = await newCode();
  const m = await Meeting.create({
    title: req.body.title,
    description: req.body.description,
    host: req.user._id,
    code,
    scheduledStart: req.body.scheduledStart ? new Date(req.body.scheduledStart) : null,
    scheduledEnd: req.body.scheduledEnd ? new Date(req.body.scheduledEnd) : null,
    timeZone: req.body.timeZone,
    waitingRoom: req.body.waitingRoom !== false,
    whiteboardEnabled: req.body.whiteboardEnabled !== false,
    chatEnabled: req.body.chatEnabled !== false,
    screenShareEnabled: req.body.screenShareEnabled !== false,
    participants: [req.user._id],
  });

  await MeetingParticipant.create({
    meeting: m._id, user: req.user._id, role: 'host', joinedAt: null,
  });

  await Whiteboard.create({
    meeting: m._id,
    pages: [{ name: 'Page 1', events: [] }],
    activePage: 'Page 1',
  });

  res.status(201).json({ meeting: m });
});

export const list = asyncHandler(async (req, res) => {
  const rows = await Meeting.find({
    $or: [{ host: req.user._id }, { participants: req.user._id }],
  })
    .populate('host', 'displayName username avatarUrl')
    .sort({ scheduledStart: -1 })
    .limit(100);
  res.json({ meetings: rows });
});

export const get = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id)
    .populate('host', 'displayName username avatarUrl');
  if (!m) return res.status(404).json({ message: 'Meeting not found' });
  res.json({ meeting: m });
});

export const join = asyncHandler(async (req, res) => {
  const key = String(req.params.id);
  const m = await Meeting.findOne({
    $or: [{ _id: key.match(/^[a-f0-9]{24}$/i) ? key : null }, { code: key.toUpperCase() }],
  });
  if (!m || m.status === 'cancelled') {
    return res.status(404).json({ message: 'Meeting no longer exists' });
  }

  if (!m.participants.some((x) => String(x) === String(req.user._id))) {
    m.participants.push(req.user._id);
  }
  m.status = 'live';
  await m.save();

  await MeetingParticipant.findOneAndUpdate(
    { meeting: m._id, user: req.user._id },
    {
      meeting: m._id,
      user: req.user._id,
      role:
        String(m.host) === String(req.user._id)
          ? 'host'
          : m.coHosts.some((x) => String(x) === String(req.user._id))
          ? 'cohost'
          : 'participant',
      joinedAt: new Date(),
      leftAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({
    meeting: m,
    media: {
      provider: env.SFU_PROVIDER || env.MEDIA_PROVIDER || 'webrtc',
      mode: 'signaling',
    },
  });
});

export const leave = asyncHandler(async (req, res) => {
  await MeetingParticipant.findOneAndUpdate(
    { meeting: req.params.id, user: req.user._id },
    { leftAt: new Date() },
    { new: true }
  );

  const active = await MeetingParticipant.countDocuments({
    meeting: req.params.id,
    joinedAt: { $ne: null },
    leftAt: null,
  });

  if (active === 0) {
    await Meeting.findOneAndUpdate(
      { _id: req.params.id, status: 'live' },
      { status: 'ended' }
    );
  }

  res.json({ success: true });
});

export const update = asyncHandler(async (req, res) => {
  const m = await Meeting.findOne({ _id: req.params.id, host: req.user._id });
  if (!m) return res.status(404).json({ message: 'Meeting not found' });

  const allowed = [
    'title', 'description', 'scheduledStart', 'scheduledEnd', 'timeZone',
    'waitingRoom', 'whiteboardEnabled', 'chatEnabled', 'screenShareEnabled',
  ];
  for (const k of allowed) if (req.body[k] !== undefined) m[k] = req.body[k];
  await m.save();
  res.json({ meeting: m });
});