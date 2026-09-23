import dotenv from 'dotenv';
import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { ApiError, errorBody } from './shared/errors.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/auth/users.routes.js';

dotenv.config();


// Augment express-session's SessionData with the fields this app stores.
declare module 'express-session' {
  interface SessionData {
    userId: string;
    createdAt: string;
  }
}

const PgSession = connectPgSimple(session);

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // CORS: only the configured frontend origin may send credentialed requests
  // (required for the cookie-based session to cross the frontend/backend origin split).
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true
    })
  );

  // Session cookie is Secure only outside local development, so the documented
  // local (http://localhost) quickstart flow keeps working without HTTPS.
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        tableName: 'session'
      }),
      secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
      name: 'sid',
      resave: false,
      saveUninitialized: false,
      rolling: true, // sliding expiration: refresh on every request (FR-008)
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      }
    })
  );

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  // Centralized error handler: always responds with { error: { code, message } }.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json(errorBody(err.code, err.message));
      return;
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json(errorBody('INTERNAL_ERROR', 'Unexpected server error'));
  });

  return app;
}
