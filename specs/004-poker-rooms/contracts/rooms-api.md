# Poker Rooms REST Contract

Base path: `/api/rooms`

All endpoints require the existing authenticated session unless stated otherwise. Errors use the existing envelope:

```json
{ "error": { "code": "STABLE_CODE", "message": "Human-readable explanation" } }
```

## Room representation

```json
{
  "id": "room-uuid",
  "name": "Friday Table",
  "visibility": "PUBLIC",
  "status": "WAITING",
  "hostId": "user-uuid",
  "seatLimit": 6,
  "minPlayers": 2,
  "startingStackBB": 100,
  "smallBlind": 1,
  "bigBlind": 2,
  "availableSeats": 4,
  "members": [
    {
      "userId": "user-uuid",
      "username": "PokerA",
      "seatNumber": 1,
      "ready": true,
      "isHost": true
    }
  ]
}
```

Private-room responses to unauthorized users use `404 ROOM_NOT_FOUND` rather than disclosing whether the room exists.

## Create a room

`POST /api/rooms`

Request:

```json
{
  "name": "Friday Table",
  "visibility": "PRIVATE",
  "seatLimit": 6,
  "minPlayers": 2,
  "startingStackBB": 100,
  "smallBlind": 1,
  "bigBlind": 2
}
```

Success: `201` with the room representation and creator membership.

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `409 ACTIVE_ROOM_EXISTS`.

## Discover waiting rooms

`GET /api/rooms`

Returns only public `WAITING` rooms with non-sensitive summaries: id, name, host display name, seat limit, occupied/available counts, blinds, starting stack, and creation time.

Success: `200` with `{ "rooms": [...] }`.

## Read a room

`GET /api/rooms/:roomId`

Returns the full roster only to members, the host, or a user with a valid invitation. Public waiting-room details may be read by authenticated users, but private membership is never exposed to unauthorized users.

Success: `200` with the room representation.

Errors: `401 UNAUTHENTICATED`, `404 ROOM_NOT_FOUND`.

## Join a room

`POST /api/rooms/:roomId/join`

For public rooms, no body is required. For private rooms, the request may include `{ "invitationId": "invitation-uuid" }`.

Success: `200` with the updated room representation and the caller's membership.

Errors: `401 UNAUTHENTICATED`, `404 ROOM_NOT_FOUND`, `409 ROOM_FULL`, `ROOM_STARTED`, `ROOM_CLOSED`, `ACTIVE_ROOM_EXISTS`, `ALREADY_ROOM_MEMBER`, or `INVITATION_NOT_FOUND`.

## Leave a room

`POST /api/rooms/:roomId/leave`

No body. The member's waiting-room seat is released. If the host leaves, ownership transfers to the earliest remaining member; if none remain, the room closes.

Success: `204`.

Errors: `401 UNAUTHENTICATED`, `404 ROOM_NOT_FOUND`, `403 NOT_ROOM_MEMBER`, `409 ROOM_STARTED`.

## Change readiness

`PATCH /api/rooms/:roomId/readiness`

Request: `{ "ready": true }`

Success: `200` with the updated room representation.

Errors: `400 VALIDATION_ERROR`, `403 NOT_ROOM_MEMBER`, `404 ROOM_NOT_FOUND`, `409 ROOM_STARTED` or `ROOM_CLOSED`.

## Invite an accepted friend

`POST /api/rooms/:roomId/invitations`

Request: `{ "userId": "friend-uuid" }`

Success: `201` with the invitation id, room id, recipient id, and `PENDING` status.

Errors: `403 NOT_ROOM_HOST`, `404 ROOM_NOT_FOUND` or `USER_NOT_FOUND`, `409 MUST_BE_FRIEND`, `INVITATION_EXISTS`, `ROOM_STARTED`, or `ROOM_CLOSED`.

## List invitations

`GET /api/rooms/invitations`

Returns pending invitations addressed to the authenticated user. It does not reveal invitations sent to other users.

Success: `200` with `{ "invitations": [...] }`.

## Accept or decline an invitation

`POST /api/rooms/invitations/:invitationId/accept` and `POST /api/rooms/invitations/:invitationId/decline`

Only the recipient may use these endpoints. Accepting atomically claims a seat and changes the invitation to `ACCEPTED`; declining changes it to `DECLINED`.

Errors: `403 NOT_INVITATION_RECIPIENT`, `404 INVITATION_NOT_FOUND`, `409 ROOM_FULL`, `ROOM_STARTED`, `ROOM_CLOSED`, or `ACTIVE_ROOM_EXISTS`.

## Start a room

`POST /api/rooms/:roomId/start`

No body. The host must have at least `minPlayers` members and every current member must be ready. The response is the fixed `STARTED` room representation.

Errors: `403 NOT_ROOM_HOST`, `404 ROOM_NOT_FOUND`, `409 NOT_ENOUGH_PLAYERS`, `MEMBERS_NOT_READY`, or `ROOM_CLOSED`.

## Close a room

`DELETE /api/rooms/:roomId`

Only the host may close a `WAITING` room. Pending invitations become `INVALIDATED` and no further joins are accepted.

Success: `204`.

Errors: `403 NOT_ROOM_HOST`, `404 ROOM_NOT_FOUND`, `409 ROOM_STARTED`.
