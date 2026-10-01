import crypto from 'crypto';
import Class from '../models/Class.js';

/**
 * Generates a unique class join code like: KAD-ABC
 * This is what admins share with students so they can request to join.
 * - Skips easily confused characters (0/O, 1/I/L)
 * - Retries up to 20 times on collision
 */
export const generateClassJoinCode = async () => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  const make = () => {
    const bytes = crypto.randomBytes(6);
    let out = '';
    for (let i = 0; i < 6; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out.slice(0, 3) + '-' + out.slice(3);
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = make();
    const exists = await Class.exists({ joinCode: code });
    if (!exists) return code;
  }

  return 'CLS-' + Date.now().toString(36).toUpperCase().slice(-6);
};
