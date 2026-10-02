/* =========================================================
   SCHOOLS SERVICE
   Matches mobile/src/services/schools.ts
   ========================================================= */

import { api } from './api';
import type {
  School,
  SchoolResponse,
  SchoolListResponse,
  SchoolDetailResponse,
  SchoolRequestsResponse,
  SchoolJoinRequest,
  ClassItem,
  ClassResponse,
} from '../types';

/* =========================================================
   SCHOOLS
   ========================================================= */

/**
 * List all schools owned by / accessible to the current user.
 */
export async function listSchools(): Promise<School[]> {
  const r = await api.get<SchoolListResponse>('/schools');
  return r.data?.data?.schools ?? [];
}

/**
 * Fetch a single school + its classes.
 */
export async function getSchool(
  id: string
): Promise<{ school: School; classes: ClassItem[] }> {
  const r = await api.get<SchoolDetailResponse>(`/schools/${id}`);
  return {
    school: r.data.data.school,
    classes: r.data.data.classes ?? [],
  };
}

/**
 * Create a new school. Caller becomes the owner.
 */
export async function createSchool(payload: {
  name: string;
  description?: string;
  coverColor?: string;
}): Promise<School> {
  const r = await api.post<SchoolResponse>('/schools', payload);
  return r.data.data.school;
}

/**
 * Create a class inside a school.
 */
export async function createClassInSchool(
  schoolId: string,
  payload: { name: string; subject?: string; description?: string }
): Promise<ClassItem> {
  const r = await api.post<ClassResponse>(
    `/schools/${schoolId}/classes`,
    payload
  );
  return r.data.data.class;
}

/* =========================================================
   JOIN REQUESTS (school-wide view)
   ========================================================= */

/**
 * Flat list of all pending class join requests for a school.
 * Used on the school detail page.
 */
export async function listSchoolRequests(
  schoolId: string
): Promise<SchoolJoinRequest[]> {
  const r = await api.get<SchoolRequestsResponse>(
    `/schools/${schoolId}/requests`
  );
  return r.data?.data?.requests ?? [];
}

/**
 * Approve a pending request.
 */
export async function approveSchoolRequest(
  schoolId: string,
  classId: string,
  requestId: string
): Promise<void> {
  await api.post(
    `/schools/${schoolId}/classes/${classId}/requests/${requestId}/approve`
  );
}

/**
 * Reject a pending request.
 */
export async function rejectSchoolRequest(
  schoolId: string,
  classId: string,
  requestId: string
): Promise<void> {
  await api.post(
    `/schools/${schoolId}/classes/${classId}/requests/${requestId}/reject`
  );
}

/* =========================================================
   ADMIN — CREATE STUDENT DIRECTLY
   ========================================================= */

export async function createStudent(
  schoolId: string,
  payload: {
    displayName: string;
    username?: string;
    password: string;
    classId?: string;
    email?: string;
    phone?: string;
  }
): Promise<{ message?: string; user?: unknown }> {
  const r = await api.post(`/schools/${schoolId}/students`, payload);
  return r.data ?? {};
}

/* =========================================================
   CLASS — LEAVE / ARCHIVE / REMOVE (used from school detail)
   ========================================================= */

export async function archiveClass(classId: string): Promise<void> {
  await api.post(`/classes/${classId}/archive`);
}

export async function leaveClass(classId: string): Promise<void> {
  await api.post(`/classes/${classId}/leave`);
}

export async function removeStudent(
  classId: string,
  studentId: string
): Promise<void> {
  await api.delete(`/classes/${classId}/students/${studentId}`);
}