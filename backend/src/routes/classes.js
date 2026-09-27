import { Router } from 'express';
import { z } from 'zod';
import {
  createClass,
  listClasses,
  getClass,
  joinClass,
  leaveClass,
  removeStudent,
  archiveClass,
  startClassMeeting,
  getActiveClassMeeting,
  endClassMeeting,
} from '../controllers/classes.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const r = Router();

r.use(requireAuth);

const createBody = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  subject: z.string().max(60).optional(),
  coverColor: z.string().max(20).optional(),
});

const joinBody = z.object({
  code: z.string().min(6).max(10),
});

r.get('/', listClasses);

r.post('/', requireRole(['teacher', 'admin']), validate(createBody), createClass);

r.post('/join', requireRole(['student']), validate(joinBody), joinClass);

r.get('/:id', getClass);

r.post('/:id/leave', requireRole(['student']), leaveClass);

/* ─── Live class sessions ─── */
r.get('/:id/meeting', getActiveClassMeeting);
r.post(
  '/:id/meeting',
  requireRole(['teacher', 'admin']),
  startClassMeeting
);
r.post(
  '/:id/meeting/end',
  requireRole(['teacher', 'admin']),
  endClassMeeting
);

r.delete(
  '/:id/students/:studentId',
  requireRole(['teacher', 'admin']),
  removeStudent
);

r.delete('/:id', requireRole(['teacher', 'admin']), archiveClass);

export default r;
