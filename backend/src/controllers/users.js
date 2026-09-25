import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';

const MAX_RESULTS = 30;

// Escape user input for use inside a RegExp, prevents ReDoS / regex injection
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/users?q=<query>&limit=<n>
 * Case-insensitive search across displayName and username.
 * Excludes the requesting user from results (by design).
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ users: [] });
  }

  const limit = Math.min(
    Number.parseInt(String(req.query.limit ?? MAX_RESULTS), 10) || MAX_RESULTS,
    MAX_RESULTS
  );

  const safe = escapeRegex(q);
  const regex = new RegExp(safe, 'i');

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

/**
 * PATCH /api/users/me
 * Only whitelisted fields can be updated. Trims strings, drops empties.
 */
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['displayName', 'bio', 'avatarUrl', 'phone'];
  const patch = {};

  for (const key of allowed) {
    const value = req.body?.[key];
    if (value === undefined) continue;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Skip empty strings so we never accidentally wipe a field with ''
      if (trimmed.length === 0) continue;
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