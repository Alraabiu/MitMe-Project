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
 * Public HTTPS base for share links.
 * This is the SAME domain your backend runs on.
 */
const PUBLIC_WEB_BASE = 'https://mitme-project.onrender.com';

/**
 * Build a shareable link for a class.
 *
 * Uses HTTPS (NOT mitme://) so it's clickable in WhatsApp, SMS, email, etc.
 * Android App Links open the app directly when installed.
 * If the app isn't installed, the URL falls back to a web page.
 */
export function buildClassShareLink(code: string): string {
  return `${PUBLIC_WEB_BASE}/join/${code.toUpperCase()}`;
}

/**
 * Friendly share message for the native share sheet.
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
