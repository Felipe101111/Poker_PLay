import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma/client.js';

const app = createApp();

describe('GET /health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports ready without requiring a session', async () => {
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([] as never);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'poker-play-backend',
      dependencies: { database: 'ok' }
    });
  });

  it('reports an unavailable dependency without leaking operational secrets', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('DATABASE_URL=secret-value'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unavailable',
      service: 'poker-play-backend',
      dependencies: { database: 'unavailable' }
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-value');
  });
});
