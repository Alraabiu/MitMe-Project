import { Router } from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const r = Router();
r.use(requireAuth);

r.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json({
      notifications: await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(100),
    })
  )
);

r.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await Notification.updateOne(
      { _id: req.params.id, user: req.user._id },
      { readAt: new Date() }
    );
    res.json({ success: true });
  })
);

r.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { user: req.user._id, readAt: null },
      { readAt: new Date() }
    );
    res.json({ success: true });
  })
);

export default r;