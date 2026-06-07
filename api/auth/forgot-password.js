// Vercel serverless function — production handler for POST /api/auth/forgot-password.
// Local dev is served by the Vite plugin; both share server/src/handlers.js.
import { requestPasswordReset } from '../../server/src/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  await requestPasswordReset(body.email);
  return res.status(200).json({
    success: true,
    data: { message: 'Password reset email sent if account exists' },
  });
}
