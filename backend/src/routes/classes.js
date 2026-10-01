import { Router } from 'express';
import { z } from 'zod';
import {
  createClass,
  listClasses,
  getClass,
  joinClass,
  cancelJoinRequest,
  approveJoinRequest,
  rejectJoinRequest,
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

/* =========================================================
   Schemas
   ========================================================= */

const createBody = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  subject: z.string().max(60).optional(),
  coverColor: z.string().max(20).optional(),
  schoolId: z.string().optional(),
});

const joinBody = z.object({
  code: z.string().min(6).max(10),
  message: z.string().max(200).optional(),
});

/* =========================================================
   Class CRUD
   ========================================================= */

// Create a class (personal or inside a school)
r.post('/', validate(createBody), createClass);

// List classes for the current user
r.get('/', listClasses);

// Join a class by code (school → request; personal → instant)
r.post('/join', validate(joinBody), joinClass);

// Class detail
r.get('/:id', getClass);

// Leave a class
r.post('/:id/leave', leaveClass);

/* =========================================================
   Join-request flow (school classes)
   ========================================================= */

// Cancel my own pending request
r.delete('/:id/request', cancelJoinRequest);

// Owner / school owner approves a request
r.post('/:id/requests/:requestId/approve', approveJoinRequest);

// Owner / school owner rejects a request
r.post('/:id/requests/:requestId/reject', rejectJoinRequest);

/* =========================================================
   Live class sessions
   ========================================================= */

r.get('/:id/meeting', getActiveClassMeeting);
r.post('/:id/meeting', startClassMeeting);
r.post('/:id/meeting/end', endClassMeeting);

/* =========================================================
   Student management
   ========================================================= */

r.delete('/:id/students/:studentId', removeStudent);

// Archive class
r.delete('/:id', archiveClass);

export default r;