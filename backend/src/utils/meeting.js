import crypto from 'crypto';

export const createMeetingCode = () =>
  crypto.randomBytes(6).toString('hex').toUpperCase();

export const createInvitationToken = () =>
  crypto.randomBytes(24).toString('base64url');