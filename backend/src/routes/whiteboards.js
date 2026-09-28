import { Router } from 'express';
import { z } from 'zod';
import { get, addEvent, update } from '../controllers/whiteboards.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();
r.use(requireAuth);

r.get('/:meetingId', get);

r.post(
  '/:meetingId/events',
  validate(
    z.object({
      pageId: z.string().optional(),
      type: z.string().min(1),
      payload: z.any(),
    })
  ),
  addEvent
);

r.patch('/:meetingId', update);

export default r;