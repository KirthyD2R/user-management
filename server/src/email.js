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

// Optional: verify SMTP at startup so misconfig surfaces early.
export async function verifyEmailTransport() {
  try {
    await getTransport().verify();
    console.log('[email] SMTP transport ready');
  } catch (err) {
    console.warn('[email] SMTP verify failed — emails may not send:', err.message);
  }
}
