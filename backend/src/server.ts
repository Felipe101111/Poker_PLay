import { createServer } from 'node:http';
import { createApp } from './app.js';
import { sessionMiddleware } from './app.js';
import { Server } from 'socket.io';
import { registerMultiplayerSocket } from './modules/multiplayer/multiplayer.socket.js';

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true
  }
});
io.engine.use(sessionMiddleware);
registerMultiplayerSocket(io);
const port = Number(process.env.PORT ?? 3000);

httpServer.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
