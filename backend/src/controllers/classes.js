import Class from '../models/Class.js';
import Meeting from '../models/Meeting.js';
import MeetingParticipant from '../models/MeetingParticipant.js';
import Whiteboard from '../models/Whiteboard.js';
import { asyncHandler } from '../middleware/error.js';
import { generateClassCode } from '../utils/classCode.js';
import { createMeetingCode } from '../utils/meeting.js';

const toId = (v) => String(v?._id || v || '');

const isAdmin = (user) =>
  String(user?.role || '').toLowerCase() === 'admin';

/** True if the user created this class (owner). */
const isOwner = (classDoc, user) => {
  if (!classDoc || !user) return false;
  return toId(classDoc.teacher) === toId(user._id);
};

/** True if the user has joined this class (member of `students`). */
const isEnrolled = (classDoc, user) => {
  if (!classDoc || !user) return false;
  const list = Array.isArray(classDoc.students) ? classDoc.students : [];
  return list.some((s) => toId(s) === toId(user._id));
};

/** Owner, enrolled member, or admin — can view the class. */
const canView = (classDoc, user) => {
  if (!classDoc || !user) return false;
  if (isAdmin(user)) return true;
  if (isOwner(classDoc, user)) return true;
  if (isEnrolled(classDoc, user)) return true;
  return false;
};

/** Owner or admin — can manage/start/end/delete the class. */
const canManage = (classDoc, user) => {
  if (!classDoc || !user) return false;
  if (isAdmin(user)) return true;
  if (isOwner(classDoc, user)) return true;
  return false;
};

const newMeetingCode = async () => {
  for (let i = 0; i < 5; i += 1) {
    const c = createMeetingCode();
    if (!(await Meeting.exists({ code: c }))) return c;
  }
  throw new Error('Could not allocate a unique meeting code');
};

/* =========================================================
   CLASS CRUD
   ========================================================= */

/**
 * Create a class.
 * Any authenticated user can create one — they become the owner.
 */
export const createClass = asyncHandler(async (req, res) => {
  const { name, description, subject, coverColor } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Class name is required' });
  }

  const code = await generateClassCode();

  const classDoc = await Class.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : '',
    subject: subject ? String(subject).trim() : '',
    code,
    teacher: req.user._id,
    students: [],
    coverColor: coverColor || '#4B24A8',
  });

  await classDoc.populate('teacher', 'displayName username avatarUrl role');

  return res.status(201).json({ success: true, data: { class: classDoc } });
});

/**
 * List classes for the current user.
 * - Admin sees all.
 * - Everyone else sees classes they own + classes they've joined.
 */
export const listClasses = asyncHandler(async (req, res) => {
  let query;

  if (isAdmin(req.user)) {
    query = { isArchived: false };
  } else {
    query = {
      isArchived: false,
      $or: [
        { teacher: req.user._id },
        { students: req.user._id },
      ],
    };
  }

  const classes = await Class.find(query)
    .sort({ createdAt: -1 })
    .populate('teacher', 'displayName username avatarUrl role')
    .lean();

  // Attach live meeting flag + isOwner flag
  const classIds = classes.map((c) => c._id);
  const liveMeetings = await Meeting.find({
    classId: { $in: classIds },
    status: 'live',
  })
    .select('classId code')
    .lean();

  const liveMap = {};
  for (const m of liveMeetings) liveMap[String(m.classId)] = m.code;

  const withLive = classes.map((c) => ({
    ...c,
    activeMeetingCode: liveMap[String(c._id)] || null,
    isLive: Boolean(liveMap[String(c._id)]),
    isOwner: toId(c.teacher) === toId(req.user._id),
  }));

  return res.json({ success: true, data: { classes: withLive } });
});

/**
 * Class detail.
 * Visible to owner, enrolled members, and admins.
 */
export const getClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id)
    .populate('teacher', 'displayName username avatarUrl role')
    .populate('students', 'displayName username avatarUrl role email');

  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }

  if (!canView(classDoc, req.user)) {
    return res.status(403).json({ message: 'You do not have access to this class' });
  }

  return res.json({ success: true, data: { class: classDoc } });
});

/**
 * Join a class by code.
 * Any authenticated user can join — except the owner.
 */
export const joinClass = asyncHandler(async (req, res) => {
  const rawCode = String(req.body?.code || '').trim().toUpperCase();
  if (!rawCode) {
    return res.status(400).json({ message: 'Class code is required' });
  }

  const normalized = rawCode.includes('-')
    ? rawCode
    : rawCode.slice(0, 3) + '-' + rawCode.slice(3);

  const classDoc = await Class.findOne({
    code: normalized,
    isArchived: false,
  }).populate('teacher', 'displayName username avatarUrl role');

  if (!classDoc) {
    return res.status(404).json({ message: 'Invalid class code' });
  }

  if (isOwner(classDoc, req.user)) {
    return res.status(400).json({ message: 'You own this class' });
  }

  if (isEnrolled(classDoc, req.user)) {
    return res.status(409).json({ message: 'You are already in this class' });
  }

  classDoc.students.push(req.user._id);
  await classDoc.save();
  await classDoc.populate('teacher', 'displayName username avatarUrl role');

  return res.json({
    success: true,
    message: 'Joined class successfully',
    data: { class: classDoc },
  });
});

/**
 * Leave a class.
 * The owner cannot leave their own class — they archive it instead.
 */
export const leaveClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }

  if (isOwner(classDoc, req.user)) {
    return res.status(400).json({
      message: 'You own this class. Archive it instead of leaving.',
    });
  }

  const wasIn = isEnrolled(classDoc, req.user);
  if (!wasIn) {
    return res.status(400).json({ message: 'You are not in this class' });
  }

  classDoc.students = classDoc.students.filter(
    (s) => toId(s) !== toId(req.user._id)
  );
  await classDoc.save();

  return res.json({ success: true, message: 'Left class' });
});

/**
 * Remove a member from a class (owner or admin only).
 */
export const removeStudent = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }
  if (!canManage(classDoc, req.user)) {
    return res.status(403).json({ message: 'Only the class owner can remove members' });
  }

  const targetId = req.params.studentId;
  const before = classDoc.students.length;
  classDoc.students = classDoc.students.filter((s) => toId(s) !== toId(targetId));

  if (classDoc.students.length === before) {
    return res.status(404).json({ message: 'Member not found in this class' });
  }

  await classDoc.save();
  return res.json({ success: true, message: 'Member removed' });
});

/**
 * Archive a class (owner or admin only).
 */
export const archiveClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }
  if (!canManage(classDoc, req.user)) {
    return res.status(403).json({ message: 'You cannot archive this class' });
  }

  classDoc.isArchived = true;
  classDoc.archivedAt = new Date();
  await classDoc.save();

  return res.json({ success: true, message: 'Class archived' });
});

/* =========================================================
   LIVE CLASS SESSIONS
   ========================================================= */

/**
 * Start a live session for the class (owner or admin only).
 */
export const startClassMeeting = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }
  if (!canManage(classDoc, req.user)) {
    return res.status(403).json({
      message: 'Only the class owner can start a live session',
    });
  }

  // End any stale live meetings for this class
  await Meeting.updateMany(
    { classId: classDoc._id, status: 'live' },
    { status: 'ended' }
  );

  const code = await newMeetingCode();

  const meeting = await Meeting.create({
    title: classDoc.name + ' - Live Session',
    description: classDoc.description || '',
    host: req.user._id,
    code,
    classId: classDoc._id,
    status: 'live',
    waitingRoom: false,
    whiteboardEnabled: true,
    chatEnabled: true,
    screenShareEnabled: true,
    participants: [req.user._id],
  });

  await MeetingParticipant.create({
    meeting: meeting._id,
    user: req.user._id,
    role: 'host',
    joinedAt: new Date(),
  });

  await Whiteboard.create({
    meeting: meeting._id,
    pages: [{ name: 'Page 1', events: [] }],
    activePage: 'Page 1',
  });

  await meeting.populate('host', 'displayName username avatarUrl');

  return res.status(201).json({ success: true, data: { meeting } });
});

/**
 * Get the active live meeting for a class.
 */
export const getActiveClassMeeting = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }
  if (!canView(classDoc, req.user)) {
    return res.status(403).json({ message: 'You do not have access to this class' });
  }

  const meeting = await Meeting.findOne({
    classId: classDoc._id,
    status: 'live',
  })
    .sort({ createdAt: -1 })
    .populate('host', 'displayName username avatarUrl');

  return res.json({ success: true, data: { meeting: meeting || null } });
});

/**
 * End the live session (owner or admin only).
 */
export const endClassMeeting = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }
  if (!canManage(classDoc, req.user)) {
    return res.status(403).json({ message: 'Only the class owner can end the session' });
  }

  await Meeting.updateMany(
    { classId: classDoc._id, status: 'live' },
    { status: 'ended' }
  );

  return res.json({ success: true, message: 'Session ended' });
});