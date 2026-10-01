import crypto from 'crypto';
import School from '../models/School.js';

/**
 * Generates a unique school code like: SCH-X7K9Q2
 * - Uses crypto for randomness
 * - Skips easily confused characters (0/O, 1/I/L)
 * - Retries up to 20 times on collision
 */
export const generateSchoolCode = async () => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  const make = () => {
    const bytes = crypto.randomBytes(6);
    let out = '';
    for (let i = 0; i < 6; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return 'SCH-' + out;
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = make();
    const exists = await School.exists({ code });
    if (!exists) return code;
  }

  return 'SCH-' + Date.now().toString(36).toUpperCase().slice(-6);
};
