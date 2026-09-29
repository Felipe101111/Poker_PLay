# Data Model: Administración de estrategia versionada

## StrategyDataset

Familia lógica de versiones estratégicas administrada globalmente.

- `id`: UUID estable.
- `key`: identificador único y legible usado por el Trainer y las rutas administrativas.
- `name`: nombre visible.
- `description`: descripción opcional.
- `createdAt`, `updatedAt`: timestamps.

Relationships:

- Tiene muchas `StrategyDatasetVersion`.
- No contiene ACL por dataset; la autorización se deriva del rol global del usuario.

## StrategyDatasetVersion

Publicación o borrador coherente de un dataset.

- `id`: UUID estable.
- `datasetId`: dataset padre.
- `version`: identificador único dentro del dataset.
- `schemaVersion`: versión del formato de filas.
- `gameFormat`, `street`, `tableSize`: contexto de compatibilidad.
- `stackAssumptions`, `blindAssumptions`, `assumptions`: JSON documentado.
- `compatibilityKey`: representación canónica del contexto usado para unicidad activa.
- `source`: procedencia editorial.
- `contentHash`: hash estable de metadata y filas normalizadas.
- `status`: `DRAFT`, `PUBLISHED` o `RETIRED`.
- `revision`: entero para control optimista de edición.
- `validationReport`: último reporte serializado, si existe.
- `createdById`, `publishedById`, `retiredById`: usuarios responsables, opcionales según estado.
- `createdAt`, `updatedAt`, `publishedAt`, `retiredAt`.

Rules:

- Solo `DRAFT` admite metadata y filas editables.
- `PUBLISHED` y `RETIRED` son inmutables.
- Solo una versión publicada puede estar activa por `compatibilityKey`.
- `version` es único dentro de `datasetId`; el `contentHash` permite identificar contenido repetido.
- Las evaluaciones existentes conservan su snapshot aunque la relación de versión sea retirada.

## StrategyRow

Fila de recomendación contextual dentro de una versión.

- `id`: UUID estable.
- `datasetVersionId`: versión padre.
- `contextKey`: clave canónica del contexto.
- `rangeSnapshot`: rango opcional.
- `actions`: acciones y frecuencias explícitas.
- `factors`, `assumptions`, `conditions`: metadata educativa y restricciones.

Rules:

- `contextKey` es único dentro de una versión.
- Cada acción tiene frecuencia finita en `[0, 1]`.
- Una fila debe contener al menos una acción y la suma debe ser `1` dentro de `0.000001`.
- Dos filas con el mismo contexto lógico se rechazan aunque cambie el orden textual de acciones.

## ValidationReport

Resultado de validar una versión completa.

- `status`: `PASSED` o `FAILED`.
- `validatedAt`, `validatedById`.
- `rowCount`, `errorCount`, `warningCount`.
- `issues[]`: `code`, `path`, `severity`, `message` y `rowId` opcional.

Validation errors include missing metadata, duplicate contexts, invalid frequencies, incompatible context, empty draft, and unsupported action/format combinations.

## EditorialRole

Rol global almacenado en `User`.

- `USER`: sin operaciones editoriales.
- `EDITOR`: crear y modificar borradores.
- `REVIEWER`: validar borradores y consultar reportes.
- `PUBLISHER`: publicar y retirar versiones válidas.
- `ADMIN`: gestionar roles, consultar auditoría y ejecutar capacidades administrativas.

The service maps each role to allowed operations; role checks are server-side and never accepted from request bodies.

## PublicationRecord

Registro inmutable de activación o retiro.

- `id`, `datasetVersionId`, `actorId`, `action` (`PUBLISH`/`RETIRE`), `reason` opcional para publish y obligatorio para retire.
- `previousActiveVersionId`, `createdAt`.

## EditorialAuditEntry

Registro append-only de una operación editorial.

- `id`, `actorId`, `actorRole`.
- `action`: create, update, validate, publish, retire, role-change o denied.
- `entityType`, `entityId`, `requestId`, `expectedRevision`.
- `result`: success, rejected o conflict.
- `reason`, `metadata` sin secretos, `createdAt`.

## State Transitions

```text
DRAFT --validate/pass + publish--> PUBLISHED --retire + reason--> RETIRED
DRAFT --validate/fail-----------> DRAFT
DRAFT --stale revision----------> DRAFT (unchanged, DRAFT_CONFLICT)
PUBLISHED -----------------------> immutable
RETIRED -------------------------> immutable
```

All state-changing transitions and their audit entry occur in one database transaction. Publication replacement deactivates the prior active version for the same compatibility key in that transaction.

## Existing Relationships Preserved

- `EvaluationSnapshot.datasetVersionId` remains nullable and points to the original version when available.
- `strategyVersionSnapshot` and `strategyRowSnapshot` remain the historical source of truth for old evaluations.
- The existing `StrategyService.lookup()` reads only `PUBLISHED` compatible versions and returns `UNAVAILABLE` for absent or retired selections.
