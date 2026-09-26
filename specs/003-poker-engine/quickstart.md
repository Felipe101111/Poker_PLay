# Quickstart: Validating the Poker Engine (Local Single-Hand Play)

Validation guide for `003-poker-engine`, building on feature 001's running backend/frontend (login required). Maps to [contracts/local-games-api.md](./contracts/local-games-api.md) and [data-model.md](./data-model.md).

## Prerequisites

- Feature 001's backend running and a logged-in session (cookie jar) — this feature adds no new database migrations (in-memory only).

## Setup

```powershell
cd backend
npm.cmd run dev
```

## Validation Scenarios

### 1. Start a hand and see the initial deal (User Story 1)

```powershell
curl.exe -s -b cookies.txt -X POST http://localhost:3000/api/local-games -H "Content-Type: application/json" -d '{\"seatCount\":3,\"startingStackBB\":100}'
curl.exe -s -b cookies.txt "http://localhost:3000/api/local-games/current?asSeat=1"
curl.exe -s -b cookies.txt "http://localhost:3000/api/local-games/current?asSeat=2"
```

**Expected**: `201`/`200` with `bettingRound: "preflop"`; seat 1's view shows seat 1's own `holeCards` and `null` for seats 2/3; seat 2's view shows the reverse. `legalActions` names the correct first-to-act seat.

### 2. Play a full hand with no all-in (User Story 2 + 3)

Repeatedly call `POST /api/local-games/current/actions` using the `legalActions` from the previous response to pick a valid action (e.g., `call` then `check` through each street) until `bettingRound` becomes `complete`.

**Expected**: the engine auto-deals the flop (3 cards)/turn (1)/river (1) once each betting round closes, without a separate "deal" request; the final response's `result` shows the correct winner and revealed hole cards for every non-folded seat (US3).

### 3. Illegal action rejection (SC-002)

```powershell
# Attempt to check when a call is owed, or act for the wrong seat.
curl.exe -s -b cookies.txt -w "`nSTATUS:%{http_code}`n" -X POST http://localhost:3000/api/local-games/current/actions -H "Content-Type: application/json" -d '{\"seatNumber\":<wrong-seat>,\"type\":\"check\"}'
```

**Expected**: `400 ILLEGAL_ACTION`, and a subsequent `GET .../current` shows the game state unchanged.

### 4. All-in with side pots (User Story 4)

Start a 3-seat hand, have one seat go all-in for less than a subsequent bet from the other two, and have both remaining seats call the full bet.

**Expected**: the resulting `pots` array has two entries — a main pot (all three seats eligible) and a side pot (only the two full-stack seats eligible); at showdown, the all-in seat can only be awarded the main pot even if it has the best hand.

### 5. Abandon a hand (FR-016)

```powershell
curl.exe -s -b cookies.txt -w "`nSTATUS:%{http_code}`n" -X DELETE http://localhost:3000/api/local-games/current
curl.exe -s -b cookies.txt -X POST http://localhost:3000/api/local-games -H "Content-Type: application/json" -d '{\"seatCount\":2}'
```

**Expected**: `204`, then the new `POST /api/local-games` succeeds (`201`) instead of returning `409 HAND_IN_PROGRESS`.

## Definition of Done for this quickstart

- [ ] All 5 scenarios above produce the expected status codes and bodies.
- [ ] Automated unit tests (`backend/tests/unit/poker-engine/`) cover deck/shuffle determinism, betting legality, pot/side-pot math, and hand evaluation independently of any HTTP server.
- [ ] Automated contract/integration tests cover the same 5 scenarios through the HTTP layer.
- [ ] No response ever includes another seat's hole cards before showdown, or the remaining deck, at any point.
