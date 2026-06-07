// Creates the password_reset_tokens table. Safe to run repeatedly.
// Usage: npm run migrate
import 'dotenv/config';
import { pool } from './db.js';

const SQL = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_user  ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens (token_hash);
`;

try {
  await pool.query(SQL);
  console.log('✓ password_reset_tokens table is ready');
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
