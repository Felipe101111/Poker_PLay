# Feature 004 Quickstart: Poker Rooms

## Prerequisites

- Node.js 20 or newer
- PostgreSQL 16 running locally
- Backend dependencies installed
- `DATABASE_URL` configured for the test database
- Existing Prisma migrations applied

From the repository root:

```powershell
Set-Location backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

## Automated validation

Run the complete backend suite:

```powershell
npm.cmd test
npm.cmd run build
```

Expected result: all existing authentication, friends, poker-engine, and rooms tests pass, and the backend TypeScript build succeeds.

## Manual REST flow

1. Register and log in two users using the existing authentication endpoints.
2. As user A, create a public room with six seats, two minimum players, a 100 BB stack, and 1/2 blinds.
3. As user B, list waiting rooms and join the room.
4. Read the room as each member and verify both members see the roster and their own seat.
5. Set both members ready and start the room as user A.
6. Verify the room is `STARTED`, no new join succeeds, and the roster/configuration remain fixed.
7. Create a private room as user A, invite an accepted friend, accept the invitation as that friend, and verify the invitation changes to `ACCEPTED`.
8. Attempt the same actions as an unauthorized user and verify stable errors without private-room disclosure.
9. Race two users for the final open seat and verify exactly one succeeds.

Contract details and error codes are documented in [contracts/rooms-api.md](contracts/rooms-api.md). Entity rules and state transitions are documented in [data-model.md](data-model.md).

## Expected outcomes

- Invalid room settings are rejected without creating records.
- Duplicate membership and duplicate seat assignments cannot occur.
- Leaving a waiting room releases the seat and transfers host ownership deterministically.
- Starting or closing a room invalidates pending invitations as specified.
- This feature never deals cards or starts a poker hand.
