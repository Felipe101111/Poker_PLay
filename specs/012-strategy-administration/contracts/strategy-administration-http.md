# Contract: Strategy Administration HTTP

All routes require an authenticated session. Role checks are server-side. Administrative routes are under `/api/strategy/admin`; the existing Trainer lookup is not changed into a public editor endpoint.

## Roles

| Role | Allowed operations |
|------|--------------------|
| `USER` | No editorial operations |
| `EDITOR` | Create datasets/drafts, edit draft metadata and rows |
| `REVIEWER` | Read drafts and run validation |
| `PUBLISHER` | Publish validated drafts and retire published versions |
| `ADMIN` | All administrative operations, role assignment and audit history |

## Dataset and version routes

### `GET /api/strategy/admin/datasets`

Returns dataset summaries and active version metadata. Requires `REVIEWER`, `PUBLISHER` or `ADMIN`.

### `POST /api/strategy/admin/datasets`

Creates a dataset family. Requires `EDITOR` or `ADMIN`.

```json
{
  "key": "six-max-postflop",
  "name": "Six-max postflop",
  "description": "Documented strategy dataset"
}
```

### `POST /api/strategy/admin/datasets/:datasetId/versions`

Creates a draft. Requires `EDITOR` or `ADMIN`.

```json
{
  "version": "postflop-v2",
  "schemaVersion": "1",
  "gameFormat": "SIX_MAX_100BB_POSTFLOP",
  "street": "flop",
  "tableSize": 6,
  "stackAssumptions": ["100bb"],
  "blindAssumptions": ["no-ante"],
  "source": "editorial-source",
  "assumptions": ["..."],
  "precision": 0.000001
}
```

Response: `201` with the draft and `revision: 0`.

### `GET /api/strategy/admin/versions/:versionId`

Returns metadata, rows, validation report and current revision. Requires any editorial read role.

### `PUT /api/strategy/admin/versions/:versionId`

Updates draft metadata and/or rows. Requires `EDITOR` or `ADMIN`.

```json
{
  "expectedRevision": 3,
  "metadata": { "source": "updated-source", "assumptions": ["..."] },
  "rows": [
    {
      "contextKey": "flop|BTN|100bb|checked-to-hero",
      "actions": [
        { "action": { "type": "check" }, "frequency": 0.2 },
        { "action": { "type": "bet", "amountBB": 3.3 }, "frequency": 0.8 }
      ],
      "range": null,
      "factors": ["position", "stack"],
      "assumptions": [],
      "conditions": []
    }
  ]
}
```

Response: `200` with incremented revision. A stale revision returns `409 DRAFT_CONFLICT` and does not change rows.

## Validation and lifecycle routes

### `POST /api/strategy/admin/versions/:versionId/validate`

Requires `REVIEWER` or `ADMIN`. Returns `200` with `ValidationReport`; validation failure is a report, not a transport error.

### `POST /api/strategy/admin/versions/:versionId/publish`

Requires `PUBLISHER` or `ADMIN`. The server requires the latest successful validation and optional expected revision.

```json
{ "expectedRevision": 4 }
```

Response: `200` with immutable published version, active compatibility key, content hash, and replaced version id if applicable. Invalid content returns `422 VALIDATION_FAILED`; stale draft returns `409 DRAFT_CONFLICT`.

### `POST /api/strategy/admin/versions/:versionId/retire`

Requires `PUBLISHER` or `ADMIN`.

```json
{ "reason": "Source superseded by corrected publication" }
```

Response: `200` with retired version and publication record. Missing reason returns `400 RETIRE_REASON_REQUIRED`.

### `GET /api/strategy/admin/datasets/:datasetId/history`

Requires `REVIEWER`, `PUBLISHER` or `ADMIN`. Returns stable chronological version history with state, author, source, compatibility, validation summary and retirement reason.

### `GET /api/strategy/admin/audit`

Requires `ADMIN`. Supports bounded filters `datasetId`, `actorId`, `action`, `from`, `to`, `limit` (default 50, max 100). Returns append-only audit entries without secrets or raw private game data.

### `PATCH /api/strategy/admin/users/:userId/role`

Requires `ADMIN`.

```json
{ "role": "REVIEWER" }
```

Response: `200` with user id and role. The request cannot assign an unknown role or set audit fields directly.

## Common errors

```json
{ "error": { "code": "FORBIDDEN", "message": "Editorial permission required" } }
```

Codes:

- `UNAUTHENTICATED` (`401`)
- `FORBIDDEN` (`403`)
- `NOT_FOUND` (`404`)
- `VALIDATION_FAILED` (`422`)
- `DRAFT_CONFLICT` (`409`)
- `INVALID_STATE_TRANSITION` (`409`)
- `ACTIVE_VERSION_CONFLICT` (`409`)
- `RETIRE_REASON_REQUIRED` (`400`)
- `INVALID_INPUT` (`400`)

The response never trusts client-supplied author, role, status, active version, validation result, content hash or audit actor.
