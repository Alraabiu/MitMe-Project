import Class from '../models/Class.js';
import School from '../models/School.js';
import Meeting from '../models/Meeting.js';
import MeetingParticipant from '../models/MeetingParticipant.js';
import Whiteboard from '../models/Whiteboard.js';
import Conversation from '../models/Conversation.js';
import { asyncHandler } from '../middleware/error.js';
import { generateClassCode } from '../utils/classCode.js';
import { generateClassJoinCode } from '../utils/classJoinCode.js';
import { createMeetingCode } from '../utils/meeting.js';

const toId = (v) => String(v?._id || v || '');

const isAdmin = (user) =>
  String(user?.role || '').toLowerCase() === 'admin';

const isOwner = (classDoc, user) => {
  if (!classDoc || !user) return false;
  return toId(classDoc.teacher) === toId(user._id);
};

const isEnrolled = (classDoc, user) => {
  if (!classDoc || !user) return false;
  const list = Array.isArray(classDoc.students) ? classDoc.students : [];
  return list.some((s) => toId(s) === toId(user._id));
};

const isPending = (classDoc, user) => {
  if (!classDoc || !user) return false;
  const list = Array.isArray(classDoc.pendingRequests) ? classDoc.pendingRequests : [];
  return list.some((r) => toId(r.user) === toId(user._id));
};

const isSchoolOwner = (school, user) =>
  !!school && !!user && toId(school.owner) === toId(user._id);

const canView = (classDoc, user) => {
  if (!classDoc || !user) return false;
  if (isAdmin(user)) return true;
  if (isOwner(classDoc, user)) return true;
  if (isEnrolled(classDoc, user)) return true;
  return false;
};

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

const ensureClassConversation = async (classDoc) => {
  let convo = await Conversation.findOne({ classId: classDoc._id });
  if (convo) return convo;

  convo = await Conversation.create({
    type: 'class',
    title: classDoc.name,
    classId: classDoc._id,
    schoolId: classDoc.schoolId || null,
    members: [classDoc.teacher, ...(classDoc.students || [])],
    admins: [classDoc.teacher],
    createdBy: classDoc.teacher,
  });
  return convo;
};

/* =========================================================
   CLASS CRUD
   ========================================================= */

/**
 * Create a class.
 * - If `schoolId` is provided → the user must be that school's owner.
 * - Otherwise → personal class (backward compatible).
 */
export const createClass = asyncHandler(async (req, res) => {
  const { name, description, subject, coverColor, schoolId } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Class name is required' });
  }

  // If scoped to a school, verify ownership
  if (schoolId) {
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    if (!isSchoolOwner(school, req.user)) {
      return res
        .status(403)
        .json({ message: 'Only the school owner can create classes here' });
    }
  }

  const internalCode = await generateClassCode();
  const joinCode = await generateClassJoinCode();

  const classDoc = await Class.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : '',
    subject: subject ? String(subject).trim() : '',
    code: internalCode,
    joinCode,
    schoolId: schoolId || null,
    teacher: req.user._id,
    students: [],
    pendingRequests: [],
    coverColor: coverColor || '#4B24A8',
  });

  // Every class gets a chat room
  await ensureClassConversation(classDoc);

  await classDoc.populate('teacher', 'displayName username avatarUrl role');

  return res.status(201).json({ success: true, data: { class: classDoc } });
});

export const listClasses = asyncHandler(async (req, res) => {
  let query;

  if (isAdmin(req.user)) {
    query = { isArchived: false };
  } else {
    query = {
      isArchived: false,
      $or: [{ teacher: req.user._id }, { students: req.user._id }],
    };
  }

  const classes = await Class.find(query)
    .sort({ createdAt: -1 })
    .populate('teacher', 'displayName username avatarUrl role')
    .lean();

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
    memberCount: Array.isArray(c.students) ? c.students.length : 0,
    pendingCount: Array.isArray(c.pendingRequests) ? c.pendingRequests.length : 0,
  }));

  return res.json({ success: true, data: { classes: withLive } });
});

export const getClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id)
    .populate('teacher', 'displayName username avatarUrl role')
    .populate('students', 'displayName username avatarUrl role email')
    .populate('pendingRequests.user', 'displayName username avatarUrl');

  if (!classDoc) {
    return res.status(404).json({ message: 'Class not found' });
  }

  if (!canView(classDoc, req.user)) {
    return res.status(403).json({ message: 'You do not have access to this class' });
  }

  return res.json({ success: true, data: { class: classDoc } });
});

/* =========================================================
   JOIN FLOW
   ========================================================= */

/**
 * Join a class by join code.
 *
 * - School class → adds a pending request; emits socket to owner.
 * - Personal class → instant enrollment (legacy behaviour).
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
    isArchived: false,
    $or: [{ joinCode: normalized }, { code: normalized }],
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

  /* ─── School class → request-to-join ──────────────── */

  if (classDoc.schoolId) {
    if (isPending(classDoc, req.user)) {
      return res.status(409).json({ message: 'Your request is already pending' });
    }

    const message = String(req.body?.message || '').slice(0, 200);

    classDoc.pendingRequests.push({
      user: req.user._id,
      requestedAt: new Date(),
      message,
    });
    await classDoc.save();

    // Notify school owner
    const school = await School.findById(classDoc.schoolId);
    const io = req.app.get('io');
    if (io && school) {
      io.to(`user:${school.owner}`).emit('class:join-request', {
        schoolId: String(school._id),
        schoolName: school.name,
        classId: String(classDoc._id),
        className: classDoc.name,
        classCode: classDoc.joinCode,
        user: {
          _id: String(req.user._id),
          displayName: req.user.displayName,
          username: req.user.username,
          avatarUrl: req.user.avatarUrl || '',
        },
        requestedAt: new Date().toISOString(),
      });
    }

    await classDoc.populate('teacher', 'displayName username avatarUrl role');

    return res.json({
      success: true,
      status: 'pending',
      message: 'Request sent. Waiting for approval.',
      data: { class: classDoc },
    });
  }

  /* ─── Personal class → instant join (legacy) ──────── */

  classDoc.students.push(req.user._id);
  await classDoc.save();

  // Add to class chat
  await Conversation.updateOne(
    { classId: classDoc._id },
    { $addToSet: { members: req.user._id } }
  );

  await classDoc.populate('teacher', 'displayName username avatarUrl role');

  return res.json({
    success: true,
    status: 'joined',
    message: 'Joined class successfully',
    data: { class: classDoc },
  });
});

/**
 * Cancel my pending request.
 */
export const cancelJoinRequest = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });

  const before = classDoc.pendingRequests.length;
  classDoc.pendingRequests = classDoc.pendingRequests.filter(
    (r) => toId(r.user) !== toId(req.user._id)
  );

  if (classDoc.pendingRequests.length === before) {
    return res.status(404).json({ message: 'No pending request found' });
  }

  await classDoc.save();
  return res.json({ success: true, message: 'Request cancelled' });
});

/**
 * Approve a pending request (owner of the class OR school owner).
 */
export const approveJoinRequest = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });

  // Authorize: class owner OR school owner
  let allowed = isOwner(classDoc, req.user) || isAdmin(req.user);
  if (!allowed && classDoc.schoolId) {
    const school = await School.findById(classDoc.schoolId);
    allowed = isSchoolOwner(school, req.user);
  }
  if (!allowed) {
    return res.status(403).json({ message: 'You cannot approve requests here' });
  }

  const request = classDoc.pendingRequests.id(req.params.requestId);
  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }

  const studentId = request.user;
  if (!classDoc.students.some((s) => toId(s) === toId(studentId))) {
    classDoc.students.push(studentId);
  }
  classDoc.pendingRequests.pull(req.params.requestId);
  await classDoc.save();

  // Add to class chat
  await Conversation.updateOne(
    { classId: classDoc._id },
    { $addToSet: { members: studentId } }
  );

  // Notify student
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${studentId}`).emit('class:approved', {
      classId: String(classDoc._id),
      className: classDoc.name,
    });
  }

  return res.json({ success: true, message: 'Request approved' });
});

/**
 * Reject a pending request.
 */
export const rejectJoinRequest = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });

  let allowed = isOwner(classDoc, req.user) || isAdmin(req.user);
  if (!allowed && classDoc.schoolId) {
    const school = await School.findById(classDoc.schoolId);
    allowed = isSchoolOwner(school, req.user);
  }
  if (!allowed) {
    return res.status(403).json({ message: 'You cannot reject requests here' });
  }

  const request = classDoc.pendingRequests.id(req.params.requestId);
  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }

  const studentId = request.user;
  classDoc.pendingRequests.pull(req.params.requestId);
  await classDoc.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${studentId}`).emit('class:rejected', {
      classId: String(classDoc._id),
      className: classDoc.name,
    });
  }

  return res.json({ success: true, message: 'Request rejected' });
});

/* =========================================================
   LEAVE / REMOVE / ARCHIVE
   ========================================================= */

export const leaveClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });

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

  // Remove from class chat
  await Conversation.updateOne(
    { classId: classDoc._id },
    { $pull: { members: req.user._id } }
  );

  return res.json({ success: true, message: 'Left class' });
});

export const removeStudent = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });
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

  await Conversation.updateOne(
    { classId: classDoc._id },
    { $pull: { members: targetId } }
  );

  return res.json({ success: true, message: 'Member removed' });
});

export const archiveClass = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });
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

export const startClassMeeting = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });
  if (!canManage(classDoc, req.user)) {
    return res.status(403).json({
      message: 'Only the class owner can start a live session',
    });
  }

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

export const getActiveClassMeeting = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });
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

export const endClassMeeting = asyncHandler(async (req, res) => {
  const classDoc = await Class.findById(req.params.id);
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });
  if (!canManage(classDoc, req.user)) {
    return res.status(403).json({ message: 'Only the class owner can end the session' });
  }

  await Meeting.updateMany(
    { classId: classDoc._id, status: 'live' },
    { status: 'ended' }
  );

  return res.json({ success: true, message: 'Session ended' });
});