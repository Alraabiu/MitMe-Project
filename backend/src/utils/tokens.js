import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const signAccess = (user) =>
  jwt.sign(
    { sub: String(user._id), role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );

export const signRefresh = (user, jti) =>
  jwt.sign(
    { sub: String(user._id), jti },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES }
  );

export const verifyAccess = (token) => jwt.verify(token, env.JWT_SECRET);
export const verifyRefresh = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

export const randomToken = () => crypto.randomBytes(32).toString('hex');
export const hashToken = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');