import { Router } from 'express';
import { z } from 'zod';
import { list, create, messages, sendMessage } from '../controllers/conversations.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();
r.use(requireAuth);

r.get('/', list);
r.post(
  '/',
  validate(
    z.object({
      type: z.enum(['direct', 'group']).default('direct'),
      memberIds: z.array(z.string()).min(1),
      title: z.string().max(100).optional(),
    })
  ),
  create
);
r.get('/:id/messages', messages);
r.post(
  '/:id/messages',
  validate(
    z.object({
      text: z.string().max(4000).optional(),
      attachments: z.array(z.any()).max(10).optional(),
      replyTo: z.string().optional(),
    })
  ),
  sendMessage
);

export default r;