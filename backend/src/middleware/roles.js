export const requireRole = (allowed) => (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  const list = Array.isArray(allowed) ? allowed : [allowed];

  if (!list.includes(role)) {
    return res.status(403).json({
      message: 'Access denied. Requires role: ' + list.join(' or '),
    });
  }

  return next();
};

export const requireAnyRole = (req, res, next) => next();
