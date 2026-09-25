import { verifyAccess } from '../utils/tokens.js';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const payload = verifyAccess(h.slice(7));
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Account unavailable' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ message: 'Permission denied' });