// ── Password hashing ──────────────────────────────────────────────
// THIS IS THE ONLY PLACE HASHING LIVES. It MUST match how
// dream-platform-api hashes passwords at signup/login, otherwise users
// will be unable to log in after resetting their password.
//
// Default: bcrypt (most common for Node platforms). If dream-platform
// uses argon2 / scrypt / PBKDF2, swap the implementation below.
import bcrypt from 'bcryptjs';

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

// Not used by the reset flow, but handy for verification/testing.
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
