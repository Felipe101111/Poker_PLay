import request, { type Test } from 'supertest';
import type { Express } from 'express';
import { io, type Socket } from 'socket.io-client';
import { startHand } from '../../src/poker-engine/engine.js';
import type { HandState } from '../../src/poker-engine/types.js';

export const multiplayerRoomInput = {
  name: 'Multiplayer Test Table', visibility: 'PUBLIC', seatLimit: 2, minPlayers: 2,
  startingStackBB: 100, smallBlind: 1, bigBlind: 2
};

export async function registerAndLoginMultiplayerUser(app: Express, prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  const username = suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  const registered = await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, id: registered.body.id as string, cookie: login.headers['set-cookie']?.[0] ?? '' };
}

export async function createStartedMultiplayerRoom(app: Express, prefix = 'multiplayer', seatLimit = 2) {
  const host = await registerAndLoginMultiplayerUser(app, `${prefix}-host`);
  const guests = await Promise.all(Array.from({ length: seatLimit - 1 }, (_, index) =>
    registerAndLoginMultiplayerUser(app, `${prefix}-guest-${index + 1}`)));
  const created = await host.agent.post('/api/rooms').send({ ...multiplayerRoomInput, seatLimit });
  const roomId = created.body.id as string;
  for (const guest of guests) await guest.agent.post(`/api/rooms/${roomId}/join`).send({});
  await host.agent.patch(`/api/rooms/${roomId}/readiness`).send({ ready: true });
  for (const guest of guests) await guest.agent.patch(`/api/rooms/${roomId}/readiness`).send({ ready: true });
  const started = await host.agent.post(`/api/rooms/${roomId}/start`);
  if (started.status !== 200) throw new Error(`Unable to start multiplayer fixture: ${started.status}`);
  return { host, guest: guests[0], guests, roomId };
}

export function connectMultiplayerSocket(baseUrl: string, cookie: string): Socket {
  return io(baseUrl, { autoConnect: false, withCredentials: true, extraHeaders: { Cookie: cookie } });
}

export function createDeterministicHand(seed = 7, seatCount = 2, startingStackBB = 100): HandState {
  return startHand('multiplayer-test-owner', seatCount, startingStackBB, seed);
}

export function waitForSocketEvent<T>(socket: Socket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
  });
}

export type SupertestAgent = ReturnType<typeof request.agent>;
export type SupertestRequest = Test;
