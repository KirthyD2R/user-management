import { Router } from 'express';
import { requestPasswordReset, performPasswordReset } from '../handlers.js';

// Express router used by the Vite dev plugin (local dev only).
// Production uses the Vercel functions in /api/auth/* — both call the same
// handlers in server/src/handlers.js.
const router = Router();

router.post('/forgot-password', async (req, res) => {
  await requestPasswordReset(req.body?.email);
  return res.json({
    success: true,
    data: { message: 'Password reset email sent if account exists' },
  });
});

router.post('/reset-password', async (req, res) => {
  const result = await performPasswordReset(req.body?.token, req.body?.newPassword);
  if (result.ok) {
    return res.json({ success: true, data: { message: result.message } });
  }
  return res.status(result.status).json({ success: false, message: result.message });
});

export default router;
