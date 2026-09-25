import { Router } from 'express';
import { z } from 'zod';
import { searchUsers, updateMe } from '../controllers/users.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

const avatarUrlSchema = z
  .string()
  .max(MAX_AVATAR_BYTES * 2) // ~2 MB base64 encodes to ~2.7 MB string
  .refine(
    (v) =>
      v.startsWith('data:image/') ||
      v.startsWith('http://') ||
      v.startsWith('https://'),
    { message: 'Avatar must be an image data URL or an http(s) URL' }
  );

r.get('/', requireAuth, searchUsers);

r.patch(
  '/me',
  requireAuth,
  validate(
    z.object({
      displayName: z.string().min(2).max(80).optional(),
      bio: z.string().max(240).optional(),
      avatarUrl: avatarUrlSchema.optional(),
      phone: z.string().min(7).optional(),
    })
  ),
  updateMe
);

export default r;