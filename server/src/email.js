import nodemailer from 'nodemailer';

let transport;

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const useOAuth = String(process.env.EMAIL_USE_OAUTH).toLowerCase() === 'true';

  if (useOAuth) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        type: 'OAuth2',
        user,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessUrl: process.env.OAUTH_TOKEN_URL,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: process.env.SMTP_PASSWORD },
  });
}

function getTransport() {
  return (transport ||= buildTransport());
}

export async function sendResetEmail(to, link) {
  const ttl = process.env.RESET_TOKEN_TTL_MINUTES || '60';
  const fromName = process.env.SMTP_FROM_NAME;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

  await getTransport().sendMail({
    from,
    to,
    subject: 'Reset your password',
    text:
      `We received a request to reset your password.\n\n` +
      `Reset it using the link below (valid for ${ttl} minutes):\n${link}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<p>We received a request to reset your password.</p>` +
      `<p><a href="${link}">Click here to reset your password</a> ` +
      `(valid for ${ttl} minutes).</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

export async function sendInviteNotification({ to, firstName, orgName, roleName, loginUrl }) {
  const fromName = process.env.SMTP_FROM_NAME;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  const url = loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

  await getTransport().sendMail({
    from,
    to,
    subject: `You've been invited to join ${orgName} on Dream Books`,
    text:
      `Hi ${firstName},\n\n` +
      `You have been invited by the admin of ${orgName} to join their Dream Books.\n\n` +
      `Role: ${roleName}\n\n` +
      `This invitation will expire in 25 days.\n\n` +
      `Regards,\nThe Dream Books`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#1e40af;margin:0 0 20px;">You're Invited!</h2>
        <p style="color:#475569;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
        <p style="color:#475569;margin:0 0 20px;">
          You have been invited by the admin of <strong>${orgName}</strong> to join their Dream Books.
        </p>
        <p style="color:#475569;margin:0 0 8px;">Role:</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;margin:0 0 20px;display:inline-block;">
          <span style="color:#1d4ed8;font-weight:600;font-size:15px;">${roleName}</span>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 24px;">
          This invitation will expire in <strong style="color:#64748b;">25 days</strong>.
        </p>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 32px;">
          Regards,<br/>
          <strong style="color:#64748b;">The Dream Books</strong>
        </p>
      </div>`,
  });
}

// Optional: verify SMTP at startup so misconfig surfaces early.
export async function verifyEmailTransport() {
  try {
    await getTransport().verify();
    console.log('[email] SMTP transport ready');
  } catch (err) {
    console.warn('[email] SMTP verify failed — emails may not send:', err.message);
  }
}
