import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { connectMultiplayerSocket, createStartedMultiplayerRoom, waitForSocketEvent } from '../helpers/multiplayer.js';
import { sessionMiddleware } from '../../src/app.js';
import { registerMultiplayerSocket } from '../../src/modules/multiplayer/multiplayer.socket.js';

const app = buildTestApp();
let httpServer: HttpServer;
let socketServer: Server;
let baseUrl: string;

describe('multiplayer Socket.IO contract', () => {
  beforeAll(async () => {
    httpServer = createServer(app);
    socketServer = new Server(httpServer, { cors: { origin: true, credentials: true } });
    socketServer.engine.use(sessionMiddleware);
    registerMultiplayerSocket(socketServer);
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    const address = httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Socket test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  beforeEach(() => resetDatabase());
  afterAll(async () => {
    socketServer.close();
    await new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
    await disconnectDatabase();
  });

  it('joins an authorized table and receives a viewer-redacted snapshot', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'socket-contract');
    const socket = connectMultiplayerSocket(baseUrl, fixture.host.cookie);
    const snapshotPromise = waitForSocketEvent<{ table: { roomId: string; currentHand: { privateCards: unknown[]; players: Array<{ userId: string; holeCards: unknown[] | null }> } } }>(socket, 'table:snapshot');
    socket.connect();
    await new Promise<void>((resolve, reject) => socket.once('connect_error', reject).once('connect', () => {
      socket.emit('table:join', { roomId: fixture.roomId, lastSeenVersion: 1 }, (response: { ok: boolean }) => response.ok ? resolve() : reject(new Error('join rejected')));
    }));
    const snapshot = await snapshotPromise;

    expect(snapshot.table.roomId).toBe(fixture.roomId);
    expect(snapshot.table.currentHand.privateCards).toHaveLength(2);
    expect(snapshot.table.currentHand.players.find((player) => player.userId === fixture.guest.id)?.holeCards).toBeNull();
    const secondSnapshot = waitForSocketEvent(socket, 'table:snapshot');
    await new Promise<void>((resolve, reject) => socket.emit('table:join', { roomId: fixture.roomId, lastSeenVersion: snapshot.table.stateVersion }, (response: { ok: boolean }) => response.ok ? resolve() : reject(new Error('rejoin rejected'))));
    await expect(secondSnapshot).resolves.toBeDefined();
    socket.disconnect();
  });

  it('rejects a non-member socket join without exposing a snapshot', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'socket-access');
    const outsider = await (await import('../helpers/multiplayer.js')).registerAndLoginMultiplayerUser(app, 'socket-outsider');
    const socket = connectMultiplayerSocket(baseUrl, outsider.cookie);
    socket.connect();
    const response = await new Promise<{ ok: boolean; code?: string }>((resolve, reject) => {
      socket.once('connect_error', reject).once('connect', () => socket.emit('table:join', { roomId: fixture.roomId, lastSeenVersion: 1 }, resolve));
    });

    expect(response).toEqual(expect.objectContaining({ ok: false, code: 'ROOM_ACCESS_DENIED' }));
    socket.disconnect();
  });
});
