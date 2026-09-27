import crypto from 'crypto';
import Class from '../models/Class.js';

export const generateClassCode = async () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
    const exists = await Class.exists({ code });
    if (!exists) return code;
  }

  return 'CLS-' + Date.now().toString(36).toUpperCase().slice(-6);
};
