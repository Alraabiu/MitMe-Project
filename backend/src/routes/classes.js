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

/* ─── Class CRUD ───────────────────────────────── */

// Create a class — anyone authenticated can
r.post('/', validate(createBody), createClass);

// List classes for the current user
r.get('/', listClasses);

// Join a class by code — anyone authenticated
r.post('/join', validate(joinBody), joinClass);

// Class detail
r.get('/:id', getClass);

// Leave a class
r.post('/:id/leave', leaveClass);

/* ─── Live class sessions ──────────────────────── */

r.get('/:id/meeting', getActiveClassMeeting);
r.post('/:id/meeting', startClassMeeting);
r.post('/:id/meeting/end', endClassMeeting);

/* ─── Student management ───────────────────────── */

r.delete('/:id/students/:studentId', removeStudent);

// Archive class
r.delete('/:id', archiveClass);

export default r;
