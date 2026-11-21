// Standard API envelopes (see docs/api/conventions.md).
export const sendSuccess = (req, res, data, { status = 200, meta = {} } = {}) =>
  res.status(status).json({ success: true, data, meta: { ...meta, requestId: req.id } });

export const errorBody = (req, code, message, details = []) => ({
  success: false,
  error: { code, message, details },
  meta: { requestId: req.id },
});
