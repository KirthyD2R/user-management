// Centralised, validated config derived from environment variables.

function ident(value, fallback) {
  const v = (value || fallback || '').trim();
  // Guard against SQL identifier injection — env is operator-trusted, but
  // a typo shouldn't become an injection vector.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v)) {
    throw new Error(`Invalid SQL identifier in config: "${v}"`);
  }
  return v;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),

  resetTokenTtlMinutes: parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '60', 10),

  users: {
    table: ident(process.env.USERS_TABLE, 'users'),
    idCol: ident(process.env.USERS_ID_COL, 'id'),
    emailCol: ident(process.env.USERS_EMAIL_COL, 'email'),
    passwordCol: ident(process.env.USERS_PASSWORD_COL, 'password'),
  },
};
