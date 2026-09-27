// backend/src/controllers/users.js
import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';

const MAX_RESULTS = 30;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ users: [] });

  const limit = Math.min(
    Number.parseInt(String(req.query.limit ?? MAX_RESULTS), 10) || MAX_RESULTS,
    MAX_RESULTS
  );

  const regex = new RegExp(escapeRegex(q), 'i');

  const users = await User.find({
    status: 'active',
    _id: { $ne: req.user._id },
    $or: [{ displayName: regex }, { username: regex }],
  })
    .select('displayName username avatarUrl presence lastSeen')
    .sort({ presence: -1, displayName: 1 })
    .limit(limit)
    .lean();

  res.json({ users });
});

export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['displayName', 'bio', 'avatarUrl', 'phone'];
  const patch = {};

  for (const key of allowed) {
    const value = req.body?.[key];
    if (value === undefined) continue;

    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Empty strings clear optional fields — EXCEPT displayName
      if (trimmed.length === 0) {
        if (key === 'avatarUrl' || key === 'bio') {
          patch[key] = '';
        }
        // displayName and phone are required when set, so skip empty
        continue;
      }

      patch[key] = trimmed;
    } else {
      patch[key] = value;
    }
  }

  if (Object.keys(patch).length === 0) {
    return res.json({ user: req.user });
  }

  Object.assign(req.user, patch);
  await req.user.save();

  res.json({ user: req.user });
});