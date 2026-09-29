const LOCAL_FRONTEND_ORIGIN = 'http://localhost:5173';

export function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['DATABASE_URL', 'SESSION_SECRET', 'FRONTEND_ORIGIN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing production configuration: ${missing.join(', ')}`);
  }

  if (process.env.SESSION_SECRET === 'dev-secret-change-me') {
    throw new Error('SESSION_SECRET must not use the development fallback in production');
  }

  if (process.env.FRONTEND_ORIGIN === LOCAL_FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN === '*') {
    throw new Error('FRONTEND_ORIGIN must be an explicit public origin in production');
  }
}