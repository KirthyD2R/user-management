// Core password-reset logic, shared by BOTH runtimes:
//   - the Vite dev plugin (server/src/routes/auth.js) for local dev
//   - the Vercel serverless functions (/api/auth/*) for production
// Keeping it here means dev and prod can never drift apart.
import crypto from 'node:crypto';
import { pool } from './db.js';
import { config } from './config.js';
import { hashPassword } from './passwords.js';
import { sendResetEmail } from './email.js';

const { table, idCol, emailCol, passwordCol } = config.users;

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

// Always succeeds silently — never reveals whether the email exists.
export async function requestPasswordReset(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email) return;

  try {
    const { rows } = await pool.query(
      `SELECT ${idCol} AS id FROM ${table} WHERE lower(${emailCol}) = $1 LIMIT 1`,
      [email]
    );
    if (!rows.length) return;

    const userId = rows[0].id;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + config.resetTokenTtlMinutes * 60_000);

    // Invalidate any outstanding tokens, then issue a fresh one.
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    const link = `${config.frontendUrl}/reset-password?token=${rawToken}`;
    await sendResetEmail(email, link);
  } catch (err) {
    // Log server-side, but the caller still returns a generic success.
    console.error('[forgot-password]', err);
  }
}

// Returns { ok, status, message } so each runtime can shape its own response.
export async function performPasswordReset(token, newPassword) {
  if (!token || !newPassword) {
    return { ok: false, status: 400, message: 'Token and new password are required.' };
  }
  if (String(newPassword).length < 8) {
    return { ok: false, status: 400, message: 'Password must be at least 8 characters long.' };
  }

  const tokenHash = sha256(token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [tokenHash]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return { ok: false, status: 400, message: 'This reset link is invalid or has expired.' };
    }

    const { id: tokenRowId, user_id: userId } = rows[0];
    const passwordHash = await hashPassword(String(newPassword));

    await client.query(
      `UPDATE ${table} SET ${passwordCol} = $1 WHERE ${idCol} = $2`,
      [passwordHash, userId]
    );
    await client.query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [tokenRowId]
    );

    await client.query('COMMIT');
    return { ok: true, status: 200, message: 'Password reset successful' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[reset-password]', err);
    return { ok: false, status: 500, message: 'Could not reset password. Please try again.' };
  } finally {
    client.release();
  }
}
