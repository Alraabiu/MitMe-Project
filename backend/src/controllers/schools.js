import bcrypt from 'bcryptjs';
import School from '../models/School.js';
import Class from '../models/Class.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { asyncHandler } from '../middleware/error.js';
import { generateSchoolCode } from '../utils/schoolCode.js';

const toId = (v) => String(v?._id || v || '');

/* =========================================================
   HELPERS
   ========================================================= */

const isSchoolOwner = (school, user) =>
  !!school && !!user && toId(school.owner) === toId(user._id);

/** Generate a unique username from a display name */
const generateUniqueUsername = async (base) => {
  let root = String(base || 'student')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 24);

  if (root.length < 3) root = 'student' + (root || Date.now().toString(36));

  let username = root;
  let attempt = 0;
  while (await User.exists({ username })) {
    attempt += 1;
    username = root + attempt;
    if (attempt > 100) {
      username = root + Date.now().toString(36);
      break;
    }
  }
  return username;
};

/** Create a class chat room and return it */
const ensureClassConversation = async (classDoc, school) => {
  let convo = await Conversation.findOne({ classId: classDoc._id });
  if (convo) return convo;

  convo = await Conversation.create({
    type: 'class',
    title: classDoc.name,
    classId: classDoc._id,
    schoolId: school?._id || null,
    members: [classDoc.teacher, ...(classDoc.students || [])],
    admins: [classDoc.teacher],
    createdBy: classDoc.teacher,
  });
  return convo;
};

/* =========================================================
   CREATE SCHOOL
   ========================================================= */

export const createSchool = asyncHandler(async (req, res) => {
  const { name, description, coverColor } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'School name is required' });
  }

  const code = await generateSchoolCode();

  const school = await School.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : '',
    coverColor: coverColor || '#4B24A8',
    owner: req.user._id,
    code,
  });

  await school.populate('owner', 'displayName username avatarUrl');

  return res.status(201).json({ success: true, data: { school } });
});

/* =========================================================
   LIST MY SCHOOLS
   ========================================================= */

export const listMySchools = asyncHandler(async (req, res) => {
  const schools = await School.find({
    owner: req.user._id,
    isArchived: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  // Attach quick stats per school
  const ids = schools.map((s) => s._id);
  const classCounts = await Class.aggregate([
    { $match: { schoolId: { $in: ids }, isArchived: false } },
    { $group: { _id: '$schoolId', count: { $sum: 1 } } },
  ]);
  const classMap = {};
  for (const row of classCounts) classMap[String(row._id)] = row.count;

  const withStats = schools.map((s) => ({
    ...s,
    classCount: classMap[String(s._id)] || 0,
  }));

  return res.json({ success: true, data: { schools: withStats } });
});

/* =========================================================
   SCHOOL DETAIL (with classes)
   ========================================================= */

export const getSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id)
    .populate('owner', 'displayName username avatarUrl');

  if (!school) {
    return res.status(404).json({ message: 'School not found' });
  }

  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'You do not have access to this school' });
  }

  const classes = await Class.find({
    schoolId: school._id,
    isArchived: false,
  })
    .sort({ createdAt: -1 })
    .populate('teacher', 'displayName username avatarUrl')
    .lean();

  // For each class: count messages + pending requests
  const classIds = classes.map((c) => c._id);
  const convos = await Conversation.find({
    classId: { $in: classIds },
  })
    .select('_id classId')
    .lean();

  const convoMap = {};
  for (const c of convos) convoMap[String(c.classId)] = c._id;

  const messageCounts = await Message.aggregate([
    { $match: { conversation: { $in: convos.map((c) => c._id) } } },
    { $group: { _id: '$conversation', count: { $sum: 1 } } },
  ]);
  const msgMap = {};
  for (const row of messageCounts) msgMap[String(row._id)] = row.count;

  const enriched = classes.map((c) => ({
    ...c,
    memberCount: Array.isArray(c.students) ? c.students.length : 0,
    pendingCount: Array.isArray(c.pendingRequests) ? c.pendingRequests.length : 0,
    messageCount: msgMap[String(convoMap[String(c._id)])] || 0,
  }));

  return res.json({
    success: true,
    data: { school, classes: enriched },
  });
});

/* =========================================================
   UPDATE SCHOOL
   ========================================================= */

export const updateSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School not found' });
  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'Only the owner can update this school' });
  }

  const allowed = ['name', 'description', 'coverColor'];
  for (const k of allowed) {
    if (req.body[k] !== undefined) school[k] = req.body[k];
  }

  await school.save();
  return res.json({ success: true, data: { school } });
});

/* =========================================================
   ARCHIVE SCHOOL
   ========================================================= */

export const archiveSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School not found' });
  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'Only the owner can archive this school' });
  }

  school.isArchived = true;
  school.archivedAt = new Date();
  await school.save();

  // Also archive every class inside
  await Class.updateMany(
    { schoolId: school._id, isArchived: false },
    { isArchived: true, archivedAt: new Date() }
  );

  return res.json({ success: true, message: 'School archived' });
});

/* =========================================================
   CREATE CLASS INSIDE SCHOOL
   ========================================================= */

export const createClassInSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School not found' });
  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'Only the owner can create classes' });
  }

  const { name, subject, coverColor } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Class name is required' });
  }

  // Import inside to avoid circular deps
  const { generateClassJoinCode } = await import('../utils/classJoinCode.js');
  const { generateClassCode } = await import('../utils/classCode.js');

  const joinCode = await generateClassJoinCode();
  const internalCode = await generateClassCode();

  const classDoc = await Class.create({
    name: String(name).trim(),
    subject: subject ? String(subject).trim() : '',
    code: internalCode,
    joinCode,
    schoolId: school._id,
    teacher: req.user._id,
    students: [],
    pendingRequests: [],
    coverColor: coverColor || '#4B24A8',
  });

  // Create the class chat room
  await ensureClassConversation(classDoc, school);

  await classDoc.populate('teacher', 'displayName username avatarUrl');

  return res.status(201).json({ success: true, data: { class: classDoc } });
});

/* =========================================================
   ADMIN CREATES STUDENT DIRECTLY
   ========================================================= */

export const createStudent = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School not found' });
  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'Only the owner can add students' });
  }

  const { displayName, username, password, classId } = req.body;

  if (!displayName || !String(displayName).trim()) {
    return res.status(400).json({ message: 'Student name is required' });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  // Resolve username
  const cleanUsername = username
    ? String(username).trim().toLowerCase()
    : await generateUniqueUsername(displayName);

  if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
    return res.status(400).json({
      message: 'Username may only contain letters, numbers, dot, dash, underscore',
    });
  }
  if (await User.exists({ username: cleanUsername })) {
    return res.status(409).json({ message: 'Username is already in use' });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);

  const student = await User.create({
    displayName: String(displayName).trim(),
    username: cleanUsername,
    passwordHash,
    authProvider: 'local',
    role: 'member',
  });

  // Optionally enroll into a class right away
  if (classId) {
    const classDoc = await Class.findOne({
      _id: classId,
      schoolId: school._id,
      isArchived: false,
    });
    if (classDoc) {
      if (!classDoc.students.some((s) => toId(s) === toId(student._id))) {
        classDoc.students.push(student._id);
        await classDoc.save();
      }

      // Add them to the class chat
      await Conversation.updateOne(
        { classId: classDoc._id },
        { $addToSet: { members: student._id } }
      );
    }
  }

  return res.status(201).json({
    success: true,
    data: { student: student.toJSON() },
    message: `Student ${displayName} created. They can log in with username "${cleanUsername}".`,
  });
});

/* =========================================================
   LIST PENDING JOIN REQUESTS ACROSS SCHOOL
   ========================================================= */

export const listPendingRequests = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School not found' });
  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'Only the owner can view pending requests' });
  }

  const classes = await Class.find({
    schoolId: school._id,
    isArchived: false,
    'pendingRequests.0': { $exists: true },
  })
    .populate('pendingRequests.user', 'displayName username avatarUrl')
    .select('name joinCode pendingRequests')
    .lean();

  const flat = [];
  for (const c of classes) {
    for (const r of c.pendingRequests || []) {
      flat.push({
        classId: String(c._id),
        className: c.name,
        classCode: c.joinCode,
        user: r.user,
        requestedAt: r.requestedAt,
        message: r.message || '',
        requestId: String(r._id),
      });
    }
  }

  flat.sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  return res.json({ success: true, data: { requests: flat } });
});

/* =========================================================
   APPROVE / REJECT JOIN REQUEST
   ========================================================= */

export const approveRequest = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School not found' });
  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'Only the owner can approve requests' });
  }

  const { classId, requestId } = req.params;

  const classDoc = await Class.findOne({
    _id: classId,
    schoolId: school._id,
  });
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });

  const request = classDoc.pendingRequests.id(requestId);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  const studentId = request.user;

  if (!classDoc.students.some((s) => toId(s) === toId(studentId))) {
    classDoc.students.push(studentId);
  }
  classDoc.pendingRequests.pull(requestId);
  await classDoc.save();

  // Add them to the class chat
  await Conversation.updateOne(
    { classId: classDoc._id },
    { $addToSet: { members: studentId } }
  );

  // Notify the student
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${studentId}`).emit('class:approved', {
      classId: String(classDoc._id),
      className: classDoc.name,
      schoolName: school.name,
    });
  }

  return res.json({ success: true, message: 'Request approved' });
});

export const rejectRequest = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ message: 'School not found' });
  if (!isSchoolOwner(school, req.user)) {
    return res.status(403).json({ message: 'Only the owner can reject requests' });
  }

  const { classId, requestId } = req.params;

  const classDoc = await Class.findOne({
    _id: classId,
    schoolId: school._id,
  });
  if (!classDoc) return res.status(404).json({ message: 'Class not found' });

  const request = classDoc.pendingRequests.id(requestId);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  const studentId = request.user;
  classDoc.pendingRequests.pull(requestId);
  await classDoc.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${studentId}`).emit('class:rejected', {
      classId: String(classDoc._id),
      className: classDoc.name,
      schoolName: school.name,
    });
  }

  return res.json({ success: true, message: 'Request rejected' });
});