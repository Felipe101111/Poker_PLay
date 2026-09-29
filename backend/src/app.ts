import dotenv from 'dotenv';
import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { ApiError, errorBody } from './shared/errors.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/auth/users.routes.js';
import { friendsRouter } from './modules/friends/friends.routes.js';
import { localGamesRouter } from './modules/local-games/local-games.routes.js';
import { roomsRouter } from './modules/rooms/rooms.routes.js';
import { multiplayerRouter } from './modules/multiplayer/multiplayer.routes.js';
import { multiplayerTrainingRouter } from './modules/multiplayer/multiplayer.training.routes.js';
import { trainerRouter } from './modules/trainer/trainer.routes.js';
import { handHistoryRouter } from './modules/hand-history/hand-history.routes.js';
import { strategyAdminRouter } from './modules/strategy/strategy.admin.routes.js';
import { prisma } from './db/prisma/client.js';
import { validateProductionConfig } from './config.js';

dotenv.config();


// Augment express-session's SessionData with the fields this app stores.
declare module 'express-session' {
  interface SessionData {
    userId: string;
    createdAt: string;
  }
}

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  name: 'sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});

export function createApp() {
  validateProductionConfig();
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

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ok',
        service: 'poker-play-backend',
        dependencies: { database: 'ok' }
      });
    } catch {
      res.status(503).json({
        status: 'unavailable',
        service: 'poker-play-backend',
        dependencies: { database: 'unavailable' }
      });
    }
  });

  // The same session middleware is mounted on HTTP and Socket.IO.
  app.use(sessionMiddleware);

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/local-games', localGamesRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/rooms', multiplayerRouter);
  app.use('/api/rooms', multiplayerTrainingRouter);
  app.use('/api/trainer', trainerRouter);
  app.use('/api/hand-history', handHistoryRouter);
  app.use('/api/strategy/admin', strategyAdminRouter);

  // Centralized error handler: always responds with { error: { code, message } }.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json(errorBody(err.code, err.message));
      return;
    }
    // Malformed JSON bodies are a client error (400), not a server fault (500).
    if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
      res.status(400).json(errorBody('VALIDATION_ERROR', 'Malformed JSON body'));
      return;
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json(errorBody('INTERNAL_ERROR', 'Unexpected server error'));
  });

  return app;
}
