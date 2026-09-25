import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { env } from '../config/env.js';
import {
  signAccess, signRefresh, verifyRefresh, hashToken,
} from '../utils/tokens.js';
import { asyncHandler } from '../middleware/error.js';

const issue = async (user, req) => {
  const jti = crypto.randomUUID();
  const refresh = signRefresh(user, jti);

  await Session.create({
    user: user._id,
    tokenHash: hashToken(refresh),
    jti,
    deviceName: req.headers['x-device-name'] || 'Unknown device',
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt: new Date(Date.now() + env.REFRESH_TTL_MS),
  });

  // Prune old sessions beyond the limit
  const sessions = await Session.find({ user: user._id, revokedAt: null })
    .sort({ createdAt: -1 })
    .skip(env.MAX_SESSIONS_PER_USER)
    .select('_id');
  if (sessions.length) {
    await Session.updateMany(
      { _id: { $in: sessions.map((s) => s._id) } },
      { revokedAt: new Date() }
    );
  }

  return {
    accessToken: signAccess(user),
    refreshToken: refresh,
    user: user.toJSON(),
  };
};

export const register = asyncHandler(async (req, res) => {
  const { displayName, username, email, phone, password } = req.body;
  if (!email && !phone) {
    return res.status(400).json({ message: 'Email or phone is required' });
  }
  if (await User.exists({ username: username.toLowerCase() })) {
    return res.status(409).json({ message: 'Username is already in use' });
  }
  if (email && (await User.exists({ email: email.toLowerCase() }))) {
    return res.status(409).json({ message: 'Email is already in use' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ displayName, username, email, phone, passwordHash });
  res.status(201).json(await issue(user, req));
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const id = String(identifier).toLowerCase();
  const user = await User.findOne({
    $or: [{ email: id }, { username: id }, { phone: identifier }],
  }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Account is suspended' });
  }

  user.presence = 'online';
  user.lastSeen = new Date();
  await user.save();

  res.json(await issue(user, req));
});

export const refresh = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = verifyRefresh(req.body.refreshToken);
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  const session = await Session.findOne({
    jti: payload.jti,
    tokenHash: hashToken(req.body.refreshToken),
    revokedAt: null,
  });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Refresh session expired' });
  }

  // Rotation
  session.revokedAt = new Date();
  await session.save();

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') {
    return res.status(401).json({ message: 'Account unavailable' });
  }

  res.json(await issue(user, req));
});

export const logout = asyncHandler(async (req, res) => {
  if (req.body.refreshToken) {
    await Session.updateOne(
      { tokenHash: hashToken(req.body.refreshToken), user: req.user._id },
      { revokedAt: new Date() }
    );
  }
  res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => res.json({ user: req.user }));