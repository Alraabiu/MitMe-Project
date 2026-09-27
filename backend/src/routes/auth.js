import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refresh,
  logout,
  me,
  googleAuth,
} from '../controllers/auth.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

const r = Router();

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const creds = z.object({
  identifier: z.string().min(2),
  password: z.string().min(8),
});

const reg = z.object({
  displayName: z.string().min(2).max(80),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{3,30}$/),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  password: z.string().min(8),
});

const googleBody = z.object({
  idToken: z.string().min(20),
});

r.post('/register', authLimiter, validate(reg), register);
r.post('/login', authLimiter, validate(creds), login);
r.post('/google', authLimiter, validate(googleBody), googleAuth);
r.post('/refresh', validate(z.object({ refreshToken: z.string().min(20) })), refresh);
r.post('/logout', requireAuth, logout);
r.get('/me', requireAuth, me);

export default r;
