import { api } from './api';
import type {
  School,
  Class,
  SchoolResponse,
  SchoolListResponse,
  SchoolDetailResponse,
  SchoolRequestsResponse,
} from '../types';

/* =========================================================
   SCHOOL CRUD
   ========================================================= */

export async function listSchools(): Promise<School[]> {
  const r = await api.get<SchoolListResponse>('/schools');
  const arr =
    (r.data as any)?.data?.schools ??
    (r.data as any)?.schools ??
    [];
  return Array.isArray(arr) ? arr : [];
}

export async function createSchool(payload: {
  name: string;
  description?: string;
  coverColor?: string;
}): Promise<School> {
  const r = await api.post<SchoolResponse>('/schools', payload);
  const school = (r.data as any)?.data?.school ?? (r.data as any)?.school;
  if (!school) throw new Error('School was not returned by the server.');
  return school;
}

export async function getSchool(id: string): Promise<{
  school: School;
  classes: Class[];
}> {
  const r = await api.get<SchoolDetailResponse>(`/schools/${id}`);
  const school = (r.data as any)?.data?.school ?? (r.data as any)?.school;
  const classes = (r.data as any)?.data?.classes ?? (r.data as any)?.classes ?? [];
  if (!school) throw new Error('School not found.');
  return { school, classes: Array.isArray(classes) ? classes : [] };
}

export async function updateSchool(
  id: string,
  payload: {
    name?: string;
    description?: string;
    coverColor?: string;
  }
): Promise<School> {
  const r = await api.patch<SchoolResponse>(`/schools/${id}`, payload);
  const school = (r.data as any)?.data?.school ?? (r.data as any)?.school;
  if (!school) throw new Error('School was not returned by the server.');
  return school;
}

export async function archiveSchool(id: string): Promise<void> {
  await api.delete(`/schools/${id}`);
}

/* =========================================================
   CLASSES INSIDE A SCHOOL
   ========================================================= */

export async function createClassInSchool(
  schoolId: string,
  payload: {
    name: string;
    subject?: string;
    coverColor?: string;
  }
): Promise<Class> {
  const r = await api.post(`/schools/${schoolId}/classes`, payload);
  const cls = (r.data as any)?.data?.class ?? (r.data as any)?.class;
  if (!cls) throw new Error('Class was not returned by the server.');
  return cls;
}

/* =========================================================
   ADMIN CREATES A STUDENT DIRECTLY
   ========================================================= */

export async function createStudent(
  schoolId: string,
  payload: {
    displayName: string;
    username?: string;
    password: string;
    classId?: string;
  }
): Promise<{ student: any; message?: string }> {
  const r = await api.post(`/schools/${schoolId}/students`, payload);
  const student =
    (r.data as any)?.data?.student ?? (r.data as any)?.student;
  if (!student) throw new Error('Student was not returned by the server.');
  return {
    student,
    message: (r.data as any)?.message,
  };
}

/* =========================================================
   PENDING JOIN REQUESTS (school-wide)
   ========================================================= */

export async function listSchoolRequests(schoolId: string) {
  const r = await api.get<SchoolRequestsResponse>(
    `/schools/${schoolId}/requests`
  );
  const arr =
    (r.data as any)?.data?.requests ??
    (r.data as any)?.requests ??
    [];
  return Array.isArray(arr) ? arr : [];
}

export async function approveSchoolRequest(
  schoolId: string,
  classId: string,
  requestId: string
): Promise<void> {
  await api.post(
    `/schools/${schoolId}/classes/${classId}/requests/${requestId}/approve`
  );
}

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
   CLASS-LEVEL JOIN ACTIONS (student-facing)
   ========================================================= */

export async function cancelMyJoinRequest(classId: string): Promise<void> {
  await api.delete(`/classes/${classId}/request`);
}