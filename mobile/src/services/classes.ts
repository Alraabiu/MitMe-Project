import { api } from './api';
import type { Class } from '../types';

export async function listClasses(): Promise<Class[]> {
  const r = await api.get('/classes');
  const arr = (r.data as any)?.data?.classes ?? (r.data as any)?.classes ?? [];
  return Array.isArray(arr) ? arr : [];
}

export async function getClass(id: string): Promise<Class> {
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
}): Promise<Class> {
  const r = await api.post('/classes', payload);
  const cls = (r.data as any)?.data?.class ?? (r.data as any)?.class;
  if (!cls) throw new Error('Class was not returned');
  return cls;
}

export async function joinClass(code: string): Promise<Class> {
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

/**
 * Build a shareable link for a class.
 * Mobile uses a deep link with custom scheme (mitme://).
 * When a student taps it, the app opens and auto-joins.
 */
export function buildClassShareLink(code: string): string {
  return `mitme://join/${code}`;
}

/**
 * Build a friendly share message for the native share sheet.
 */
export function buildClassShareMessage(
  className: string,
  code: string
): string {
  return [
    `You're invited to join "${className}" on MitMe.`,
    '',
    `Class code: ${code}`,
    '',
    `Or tap this link to join instantly:`,
    buildClassShareLink(code),
    '',
    'If the link does not open the app, install MitMe and enter the code above.',
  ].join('\n');
}
