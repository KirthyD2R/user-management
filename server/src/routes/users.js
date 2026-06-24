import { Router } from 'express';
import { notifyInvitedUser } from '../handlers.js';

const router = Router();

router.post('/invite-notify', async (req, res) => {
  const { email, firstName, orgName, roleName, loginUrl } = req.body || {};
  const result = await notifyInvitedUser({ email, firstName, orgName, roleName, loginUrl });
  if (result.ok) {
    return res.json({ success: true, data: { message: result.message } });
  }
  return res.status(result.status).json({ success: false, message: result.message });
});

export default router;
