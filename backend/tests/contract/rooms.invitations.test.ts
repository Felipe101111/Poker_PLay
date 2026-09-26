import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  const registered = await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, id: registered.body.id as string };
}

async function becomeFriends(first: { agent: request.SuperAgentTest }, second: { agent: request.SuperAgentTest; id: string }) {
  const sent = await first.agent.post('/api/friends/requests').send({ receiverId: second.id });
  await second.agent.post(`/api/friends/requests/${sent.body.id}/accept`);
}

describe('Poker room invitations', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('invites an accepted friend and accepts atomically into a private room', async () => {
    const host = await registerAndLogin('invite-host@example.com', 'InviteHost');
    const friend = await registerAndLogin('invite-friend@example.com', 'InviteFriend');
    await becomeFriends(host, friend);
    const room = await host.agent.post('/api/rooms').send({ name: 'Private Invite', visibility: 'PRIVATE', seatLimit: 4, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 });

    const invitation = await host.agent.post(`/api/rooms/${room.body.id}/invitations`).send({ userId: friend.id });
    expect(invitation.status).toBe(201);
    expect(invitation.body.status).toBe('PENDING');

    const listed = await friend.agent.get('/api/rooms/invitations');
    expect(listed.body.invitations).toHaveLength(1);
    const accepted = await friend.agent.post(`/api/rooms/invitations/${invitation.body.id}/accept`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.members).toContainEqual(expect.objectContaining({ userId: friend.id }));
  });

  it('rejects invitations to non-friends and protects recipient actions', async () => {
    const host = await registerAndLogin('invite-host2@example.com', 'InviteHost2');
    const stranger = await registerAndLogin('invite-stranger@example.com', 'InviteStranger');
    const room = await host.agent.post('/api/rooms').send({ name: 'Private Invite 2', visibility: 'PRIVATE', seatLimit: 4, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 });

    const notFriend = await host.agent.post(`/api/rooms/${room.body.id}/invitations`).send({ userId: stranger.id });
    expect(notFriend.status).toBe(409);
    expect(notFriend.body.error.code).toBe('MUST_BE_FRIEND');

    const missing = await stranger.agent.post('/api/rooms/invitations/00000000-0000-0000-0000-000000000000/accept');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('INVITATION_NOT_FOUND');
  });
});
