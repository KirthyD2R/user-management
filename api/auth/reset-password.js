// Vercel serverless function — production handler for POST /api/auth/reset-password.
// Local dev is served by the Vite plugin; both share server/src/handlers.js.
import { performPasswordReset } from '../../server/src/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const result = await performPasswordReset(body.token, body.newPassword);
  if (result.ok) {
    return res.status(200).json({ success: true, data: { message: result.message } });
  }
  return res.status(result.status).json({ success: false, message: result.message });
}
