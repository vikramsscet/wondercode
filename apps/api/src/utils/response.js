// Standard API envelopes (see blueprint section 7.7).
export const sendSuccess = (req, res, data, status = 200) =>
  res.status(status).json({ success: true, data, meta: { requestId: req.id } });

export const errorBody = (req, code, message, details = []) => ({
  success: false,
  error: { code, message, details },
  meta: { requestId: req.id },
});
