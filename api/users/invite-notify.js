import { notifyInvitedUser } from '../../server/src/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { email, firstName, orgName, roleName, loginUrl } = body;
  const result = await notifyInvitedUser({ email, firstName, orgName, roleName, loginUrl });
  if (result.ok) {
    return res.status(200).json({ success: true, data: { message: result.message } });
  }
  return res.status(result.status).json({ success: false, message: result.message });
}
