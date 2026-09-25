import { log } from '../config/logger.js';

export const notFound = (req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' });

export const errorHandler = (err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) {
    log.error('unhandled_error', { id: req.id, path: req.path, err: err.message, stack: err.stack });
  }
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong.' : err.message,
    ...(status === 400 && err.issues ? { issues: err.issues } : {}),
  });
};

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);