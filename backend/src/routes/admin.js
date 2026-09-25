import { Router } from 'express';
import User from '../models/User.js';
import Meeting from '../models/Meeting.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const r = Router();
r.use(requireAuth, requireRole('admin', 'moderator'));

r.get(
  '/stats',
  asyncHandler(async (_req, res) =>
    res.json({
      users: await User.countDocuments(),
      activeUsers: await User.countDocuments({ presence: 'online' }),
      meetings: await Meeting.countDocuments(),
      liveMeetings: await Meeting.countDocuments({ status: 'live' }),
      auditLogs: await AuditLog.countDocuments(),
    })
  )
);

r.get(
  '/users',
  asyncHandler(async (_req, res) =>
    res.json({
      users: await User.find()
        .select('displayName username email phone role status presence createdAt')
        .sort({ createdAt: -1 })
        .limit(200),
    })
  )
);

r.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const u = await User.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).select('-passwordHash');

    await AuditLog.create({
      actor: req.user._id,
      action: 'user.status',
      targetType: 'User',
      targetId: req.params.id,
      metadata: { status: req.body.status },
      ip: req.ip,
    });

    res.json({ user: u });
  })
);

export default r;