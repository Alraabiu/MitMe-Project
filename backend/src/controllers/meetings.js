import Meeting from '../models/Meeting.js';
import MeetingParticipant from '../models/MeetingParticipant.js';
import Whiteboard from '../models/Whiteboard.js';
import { createMeetingCode } from '../utils/meeting.js';
import { env } from '../config/env.js';
import { getMediaProvider } from '../services/mediaProvider.js';
import { asyncHandler } from '../middleware/error.js';

const newCode = async () => {
  for (let i = 0; i < 5; i++) {
    const c = createMeetingCode();
    if (!(await Meeting.exists({ code: c }))) return c;
  }
  throw new Error('Could not allocate a unique meeting code');
};

// ─── Create meeting ─────────────────────────────────────────
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

  // Host is always admitted
  await MeetingParticipant.create({
    meeting: m._id,
    user: req.user._id,
    role: 'host',
    status: 'admitted',
    joinedAt: null,
  });

  await Whiteboard.create({
    meeting: m._id,
    pages: [{ name: 'Page 1', events: [] }],
    activePage: 'Page 1',
  });

  try {
    const provider = getMediaProvider();
    await provider.createRoom({ meetingId: String(m._id), title: m.title });
  } catch {
    /* lazy */
  }

  res.status(201).json({ meeting: m });
});

// ─── List meetings for current user ─────────────────────────
export const list = asyncHandler(async (req, res) => {
  const rows = await Meeting.find({
    $or: [{ host: req.user._id }, { participants: req.user._id }],
  })
    .populate('host', 'displayName username avatarUrl')
    .sort({ scheduledStart: -1 })
    .limit(100);
  res.json({ meetings: rows });
});

// ─── Get one meeting ────────────────────────────────────────
export const get = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id).populate(
    'host',
    'displayName username avatarUrl'
  );
  if (!m) return res.status(404).json({ message: 'Meeting not found' });
  res.json({ meeting: m });
});

// ─── Join meeting (with waiting room) ───────────────────────
export const join = asyncHandler(async (req, res) => {
  const key = String(req.params.id);
  const m = await Meeting.findOne({
    $or: [
      { _id: key.match(/^[a-f0-9]{24}$/i) ? key : null },
      { code: key.toUpperCase() },
    ],
  });
  if (!m || m.status === 'cancelled') {
    return res.status(404).json({ message: 'Meeting no longer exists' });
  }

  const uid = String(req.user._id);
  const isHost = String(m.host) === uid;
  const isCoHost = m.coHosts.some((x) => String(x) === uid);
  const role = isHost ? 'host' : isCoHost ? 'cohost' : 'participant';

  // Hosts always bypass the waiting room
  // If waitingRoom is disabled, everyone bypasses
  const requiresApproval = m.waitingRoom !== false && !isHost && !isCoHost;

  // Make sure user is in the participants list
  if (!m.participants.some((x) => String(x) === uid)) {
    m.participants.push(req.user._id);
  }

  // Find or create participant record
  let participant = await MeetingParticipant.findOne({
    meeting: m._id,
    user: req.user._id,
  });

  // If already rejected and no approval flow, allow retry as pending
  if (!participant) {
    participant = await MeetingParticipant.create({
      meeting: m._id,
      user: req.user._id,
      role,
      status: requiresApproval ? 'pending' : 'admitted',
      ...(requiresApproval ? {} : { joinedAt: new Date() }),
    });
  } else {
    // Update role in case it changed
    participant.role = role;

    // If approval isn't required, admit immediately
    if (!requiresApproval) {
      participant.status = 'admitted';
      participant.joinedAt = new Date();
      participant.leftAt = null;
      await participant.save();
    }
  }

  // ─── PENDING: send the host a join request ────────────────
  if (requiresApproval && participant.status === 'pending') {
    await m.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${m.host}`).emit('meeting:join-request', {
        meetingId: String(m._id),
        meetingTitle: m.title,
        participant: {
          _id: uid,
          displayName: req.user.displayName,
          username: req.user.username,
          avatarUrl: req.user.avatarUrl || '',
        },
        requestedAt: new Date().toISOString(),
      });
    }

    return res.json({
      status: 'pending',
      meeting: {
        _id: m._id,
        title: m.title,
        code: m.code,
      },
    });
  }

  // ─── ADMITTED: issue LiveKit token ────────────────────────
  m.status = 'live';
  await m.save();

  // Refresh participant to be safe
  participant = await MeetingParticipant.findOneAndUpdate(
    { meeting: m._id, user: req.user._id },
    { status: 'admitted', joinedAt: new Date(), leftAt: null, role },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const provider = getMediaProvider();
  const room = await provider.createRoom({
    meetingId: String(m._id),
    title: m.title,
  });
  const tokenPayload = await provider.createParticipantToken({
    meetingId: String(m._id),
    userId: uid,
    userName: req.user.displayName,
    role,
  });

  res.json({
    status: 'admitted',
    meeting: m,
    media: {
      provider: room.provider,
      mode: room.mode,
      url: room.url || tokenPayload.url || null,
      token: tokenPayload.token || null,
    },
  });
});

// ─── List waiting participants (host only) ──────────────────
export const waiting = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id);
  if (!m) return res.status(404).json({ message: 'Meeting not found' });

  const uid = String(req.user._id);
  if (String(m.host) !== uid && !m.coHosts.some((x) => String(x) === uid)) {
    return res
      .status(403)
      .json({ message: 'Only the host can view waiting participants' });
  }

  const rows = await MeetingParticipant.find({
    meeting: m._id,
    status: 'pending',
  }).populate('user', 'displayName username avatarUrl');

  res.json({ waiting: rows });
});

// ─── Admit a participant (host only) ────────────────────────
export const admit = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id);
  if (!m) return res.status(404).json({ message: 'Meeting not found' });

  const uid = String(req.user._id);
  if (String(m.host) !== uid && !m.coHosts.some((x) => String(x) === uid)) {
    return res.status(403).json({ message: 'Only the host can admit participants' });
  }

  const { userId } = req.params;

  const participant = await MeetingParticipant.findOneAndUpdate(
    { meeting: m._id, user: userId },
    { status: 'admitted', joinedAt: new Date(), leftAt: null },
    { new: true }
  );

  if (!participant) {
    return res.status(404).json({ message: 'Participant not found' });
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${userId}`).emit('meeting:admitted', {
      meetingId: String(m._id),
      meetingTitle: m.title,
    });
  }

  res.json({ success: true, participant });
});

// ─── Reject a participant (host only) ───────────────────────
export const reject = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id);
  if (!m) return res.status(404).json({ message: 'Meeting not found' });

  const uid = String(req.user._id);
  if (String(m.host) !== uid && !m.coHosts.some((x) => String(x) === uid)) {
    return res.status(403).json({ message: 'Only the host can reject participants' });
  }

  const { userId } = req.params;

  const participant = await MeetingParticipant.findOneAndUpdate(
    { meeting: m._id, user: userId },
    { status: 'rejected', leftAt: new Date() },
    { new: true }
  );

  if (!participant) {
    return res.status(404).json({ message: 'Participant not found' });
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${userId}`).emit('meeting:rejected', {
      meetingId: String(m._id),
      meetingTitle: m.title,
    });
  }

  res.json({ success: true, participant });
});

// ─── Leave meeting ──────────────────────────────────────────
export const leave = asyncHandler(async (req, res) => {
  await MeetingParticipant.findOneAndUpdate(
    { meeting: req.params.id, user: req.user._id },
    { leftAt: new Date() }
  );

  const active = await MeetingParticipant.countDocuments({
    meeting: req.params.id,
    status: 'admitted',
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

// ─── Update meeting (host only) ─────────────────────────────
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