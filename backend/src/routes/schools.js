import { Router } from 'express';
import { z } from 'zod';
import {
  createSchool,
  listMySchools,
  getSchool,
  updateSchool,
  archiveSchool,
  createClassInSchool,
  createStudent,
  listPendingRequests,
  approveRequest,
  rejectRequest,
} from '../controllers/schools.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

r.use(requireAuth);

/* =========================================================
   Schemas
   ========================================================= */

const createSchoolBody = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  coverColor: z.string().max(20).optional(),
});

const updateSchoolBody = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  coverColor: z.string().max(20).optional(),
});

const createClassBody = z.object({
  name: z.string().min(2).max(120),
  subject: z.string().max(60).optional(),
  coverColor: z.string().max(20).optional(),
});

const createStudentBody = z.object({
  displayName: z.string().min(2).max(80),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_.-]{3,30}$/)
    .optional(),
  password: z.string().min(8).max(72),
  classId: z.string().optional(),
});

/* =========================================================
   Schools CRUD
   ========================================================= */

r.get('/', listMySchools);

r.post('/', validate(createSchoolBody), createSchool);

r.get('/:id', getSchool);

r.patch('/:id', validate(updateSchoolBody), updateSchool);

r.delete('/:id', archiveSchool);

/* =========================================================
   Classes inside a school
   ========================================================= */

r.post(
  '/:id/classes',
  validate(createClassBody),
  createClassInSchool
);

/* =========================================================
   Students
   ========================================================= */

r.post(
  '/:id/students',
  validate(createStudentBody),
  createStudent
);

/* =========================================================
   Pending join requests
   ========================================================= */

r.get('/:id/requests', listPendingRequests);

r.post(
  '/:id/classes/:classId/requests/:requestId/approve',
  approveRequest
);

r.post(
  '/:id/classes/:classId/requests/:requestId/reject',
  rejectRequest
);

export default r;