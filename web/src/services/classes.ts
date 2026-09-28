import { api } from './api';
import type { ClassItem, Meeting } from '../types';

export async function listClasses(): Promise<ClassItem[]> {
  const r = await api.get('/classes');
  const arr = (r.data as any)?.data?.classes ?? (r.data as any)?.classes ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function getClass(id: string): Promise<ClassItem> {
  const r = await api.get(`/classes/${id}`);
  const cls = (r.data as any)?.data?.class ?? (r.data as any)?.class;
  if (!cls) throw new Error('Class not found');
  return cls;
}

export async function createClass(payload: {
  name: string;
  description?: string;
  subject?: string;
  coverColor?: string;
}): Promise<ClassItem> {
  const r = await api.post('/classes', payload);
  const cls = (r.data as any)?.data?.class ?? (r.data as any)?.class;
  if (!cls) throw new Error('Class was not returned');
  return cls;
}

export async function joinClass(code: string): Promise<ClassItem> {
  const r = await api.post('/classes/join', {
    code: code.trim().toUpperCase(),
  });
  const cls = (r.data as any)?.data?.class ?? (r.data as any)?.class;
  if (!cls) throw new Error('Join response missing class');
  return cls;
}

export async function leaveClass(id: string): Promise<void> {
  await api.post(`/classes/${id}/leave`);
}

export async function archiveClass(id: string): Promise<void> {
  await api.delete(`/classes/${id}`);
}

export async function removeStudent(
  classId: string,
  studentId: string
): Promise<void> {
  await api.delete(`/classes/${classId}/students/${studentId}`);
}

export async function getActiveClassMeeting(
  classId: string
): Promise<Meeting | null> {
  const r = await api.get(`/classes/${classId}/meeting`);
  return (r.data as any)?.data?.meeting ?? null;
}

export async function startClassMeeting(classId: string): Promise<Meeting> {
  const r = await api.post(`/classes/${classId}/meeting`);
  const m = (r.data as any)?.data?.meeting;
  if (!m) throw new Error('Meeting was not created');
  return m;
}

export async function endClassMeeting(classId: string): Promise<void> {
  await api.post(`/classes/${classId}/meeting/end`);
}

export async function joinMeeting(meetingId: string): Promise<Meeting> {
  const r = await api.post(`/meetings/${meetingId}/join`);
  const m = (r.data as any)?.meeting ?? (r.data as any)?.data?.meeting;
  if (!m) throw new Error('Meeting join failed');
  return m;
}

/* =========================================================
   SHARE HELPERS
   ========================================================= */

/**
 * Public HTTPS base for share links.
 * Web share links use the same public base as mobile so
 * the URL works everywhere (WhatsApp, SMS, email, etc.).
 */
const PUBLIC_WEB_BASE = 'https://mitme-project.onrender.com';

/**
 * Build a shareable link for a class.
 * On web we use the ?join=CODE query string so the receiving
 * browser/tab can auto-open the join form.
 */
export function buildClassShareLink(code: string): string {
  return `${PUBLIC_WEB_BASE}/join/${code.toUpperCase()}`;
}

/**
 * Friendly message for share sheets and clipboard copies.
 */
export function buildClassShareMessage(
  className: string,
  code: string
): string {
  const link = buildClassShareLink(code);
  return [
    `You're invited to join "${className}" on MitMe.`,
    '',
    `Tap this link to join:`,
    link,
    '',
    `Or enter the class code manually: ${code}`,
  ].join('\n');
}
