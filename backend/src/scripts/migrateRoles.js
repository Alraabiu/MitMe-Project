import User from '../models/User.js';
import { log } from '../config/logger.js';

export const migrateRoles = async () => {
  try {
    const result = await User.updateMany(
      { role: 'user' },
      { $set: { role: 'student' } }
    );

    if (result.modifiedCount > 0) {
      log.info('migrate_roles_done', { updated: result.modifiedCount });
    }
  } catch (err) {
    log.warn('migrate_roles_failed', { err: err?.message });
  }
};
