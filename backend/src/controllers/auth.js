import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { env } from '../config/env.js';
import {
  signAccess,
  signRefresh,
  verifyRefresh,
  hashToken,
} from '../utils/tokens.js';
import { asyncHandler } from '../middleware/error.js';

// ─── Google OAuth client ─────────────────────────────────────
const googleClient = new OAuth2Client(env.GOOGLE_WEB_CLIENT_ID);

// ─── Session issuer ─────────────────────────────────────────
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

// ─── Helper: generate a unique username from an email ───────
const generateUniqueUsername = async (email, name) => {
  let base = String(email?.split('@')[0] || name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 24);

  if (base.length < 3) base = 'user' + (base || Date.now().toString(36));

  let username = base;
  let attempt = 0;
  while (await User.exists({ username })) {
    attempt += 1;
    username = base + attempt;
    if (attempt > 100) {
      username = base + Date.now().toString(36);
      break;
    }
  }
  return username;
};

// ─── POST /api/auth/register ─────────────────────────────────
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
  if (phone && (await User.exists({ phone: phone.trim() }))) {
    return res.status(409).json({ message: 'Phone number is already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await User.create({
      displayName,
      username,
      email,
      phone,
      passwordHash,
      // No role sent — model default is 'member'
      authProvider: 'local',
    });
    return res.status(201).json(await issue(user, req));
  } catch (err) {
    if (err && err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      const label =
        field === 'phone'
          ? 'Phone number'
          : field === 'email'
          ? 'Email'
          : field === 'username'
          ? 'Username'
          : 'Value';
      return res.status(409).json({ message: label + ' is already in use' });
    }
    throw err;
  }
});

// ─── POST /api/auth/login ────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const id = String(identifier).toLowerCase();

  const user = await User.findOne({
    $or: [{ email: id }, { username: id }, { phone: identifier }],
  }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
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

// ─── POST /api/auth/google ───────────────────────────────────
export const googleAuth = asyncHandler(async (req, res) => {
  const { credential, idToken } = req.body;
  const token = credential || idToken;

  if (!token) {
    return res
      .status(400)
      .json({ message: 'Google credential or ID token is required' });
  }

  if (!env.GOOGLE_WEB_CLIENT_ID) {
    return res
      .status(500)
      .json({ message: 'Google Sign-In is not configured on the server' });
  }

  // Verify the Google ID token
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_WEB_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn('[googleAuth] token verification failed:', err?.message);
    return res.status(401).json({ message: 'Invalid Google token' });
  }

  if (!payload?.email) {
    return res.status(400).json({ message: 'Google account has no email' });
  }

  const { email, name, picture, sub: googleId } = payload;
  const normalizedEmail = email.toLowerCase();

  // Prefer googleId match, fallback to email match
  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Link Google account to existing email user
      user.googleId = googleId;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      await user.save();
    } else {
      // Create a new user (default role applies: 'member')
      const username = await generateUniqueUsername(normalizedEmail, name);
      user = await User.create({
        displayName: name || username,
        username,
        email: normalizedEmail,
        googleId,
        authProvider: 'google',
        avatarUrl: picture,
      });
    }
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Account is suspended' });
  }

  user.presence = 'online';
  user.lastSeen = new Date();
  await user.save();

  res.json(await issue(user, req));
});

// ─── POST /api/auth/refresh ──────────────────────────────────
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  const session = await Session.findOne({
    jti: payload.jti,
    tokenHash: hashToken(refreshToken),
    revokedAt: null,
  });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Refresh session expired' });
  }

  // Rotate
  session.revokedAt = new Date();
  await session.save();

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') {
    return res.status(401).json({ message: 'Account unavailable' });
  }

  res.json(await issue(user, req));
});

// ─── POST /api/auth/logout ───────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;

  if (refreshToken) {
    await Session.updateOne(
      { tokenHash: hashToken(refreshToken), user: req.user._id },
      { revokedAt: new Date() }
    );
  } else {
    // No token provided — revoke all sessions (safer default)
    await Session.updateMany(
      { user: req.user._id, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  res.json({ success: true });
});

// ─── GET /api/auth/me ────────────────────────────────────────
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});