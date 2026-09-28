import { Router } from 'express';
import { z } from 'zod';
import {
  create,
  list,
  get,
  join,
  leave,
  update,
  waiting,
  admit,
  reject,
} from '../controllers/meetings.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();
r.use(requireAuth);

r.post(
  '/',
  validate(
    z.object({
      title: z.string().min(1).max(160),
      description: z.string().max(1000).optional(),
      scheduledStart: z.string().datetime().optional(),
      scheduledEnd: z.string().datetime().optional(),
      timeZone: z.string().optional(),
      waitingRoom: z.boolean().optional(),
      whiteboardEnabled: z.boolean().optional(),
      chatEnabled: z.boolean().optional(),
      screenShareEnabled: z.boolean().optional(),
    })
  ),
  create
);

r.get('/', list);
r.get('/:id', get);
r.post('/:id/join', join);

// Waiting room (host-only)
r.get('/:id/waiting', waiting);
r.post('/:id/admit/:userId', admit);
r.post('/:id/reject/:userId', reject);

r.post('/:id/leave', leave);
r.patch('/:id', update);

export default r;