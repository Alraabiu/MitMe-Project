import { Router } from 'express';
import { z } from 'zod';
import { searchUsers, updateMe } from '../controllers/users.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();

/**
 * Maximum raw image size = 2 MB.
 * Base64 expands ~4/3, so the encoded string can be up to ~2.7 MB.
 * We allow 3 MB to leave headroom for the data-URL prefix.
 */
const MAX_AVATAR_STRING = 3 * 1024 * 1024;

const avatarUrlSchema = z
  .string()
  .max(MAX_AVATAR_STRING, {
    message: 'Avatar is too large (max 2 MB image).',
  })
  .refine(
    (v) =>
      v === '' ||
      v.startsWith('data:image/') ||
      v.startsWith('http://') ||
      v.startsWith('https://'),
    {
      message: 'Avatar must be an image data URL, an http(s) URL, or empty to remove.',
    }
  );

r.get('/', requireAuth, searchUsers);

r.patch(
  '/me',
  requireAuth,
  validate(
    z.object({
      displayName: z.string().trim().min(2).max(80).optional(),
      bio: z.string().trim().max(240).optional(),
      avatarUrl: avatarUrlSchema.optional(),
      phone: z.string().trim().min(7).max(20).optional(),
    })
  ),
  updateMe
);

export default r;