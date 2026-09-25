export const validate = (schema, source = 'body') => (req, res, next) => {
  const r = schema.safeParse(req[source]);
  if (!r.success) {
    return res.status(400).json({ message: 'Invalid input', issues: r.error.issues });
  }
  req[source] = r.data;
  next();
};