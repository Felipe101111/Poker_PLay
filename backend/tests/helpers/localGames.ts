import request from 'supertest';
import { buildTestApp } from './testApp.js';

export const localGamesApp = buildTestApp();

export async function registerAndLoginLocalGame(email: string, username: string) {
  await request(localGamesApp).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(localGamesApp);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}
