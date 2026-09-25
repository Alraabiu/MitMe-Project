import { Router } from 'express';
import { z } from 'zod';
import { list, requests, send, accept, remove } from '../controllers/contacts.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();
r.use(requireAuth);

r.get('/', list);
r.get('/requests', requests);
r.post('/requests', validate(z.object({ userId: z.string().min(1) })), send);
r.post('/requests/:id/accept', accept);
r.delete('/:userId', remove);

export default r;