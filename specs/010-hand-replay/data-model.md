# Data Model: Replay de manos

Feature 010 no añade tablas ni modifica hechos históricos. Sus entidades son vistas efímeras construidas desde `HandHistory`, `HandAction` y `HistoryAccessPolicy` de Feature 009.

## ReplayDocument

Documento autorizado de una mano para reproducción.

| Field | Type | Rules |
|---|---|---|
| `historyId` | opaque identifier | Debe identificar una mano visible para el usuario; no se acepta un ID no autorizado. |
| `sourceType` | enum | Se conserva del historial: `LOCAL_GAME`, `MULTIPLAYER` o `TRAINER`. |
| `format` | string | Etiqueta histórica de la modalidad. |
| `status` | terminal status | Solo `COMPLETED`, `FOLDED`, `ALL_IN`, `ABANDONED` o `ANONYMIZED`. |
| `initialState` | structured projection | Estado visible antes del primer evento; no incluye mazo ni cartas privadas no autorizadas. |
| `events` | ordered list | Eventos visibles ordenados ascendentemente por `sequence`; la lista puede incluir limitaciones explícitas. |
| `terminalState` | structured projection nullable | Estado final autorizado cuando existe y puede reconstruirse. |
| `limitations` | list | Limitaciones generales y brechas de reconstrucción. |
| `sequenceVersion` | integer | Versión del snapshot usada para interpretar la proyección. |

## ReplayEvent

Proyección de un `HandAction` histórico.

| Field | Type | Rules |
|---|---|---|
| `sequence` | positive integer | Única por mano y conserva el orden histórico. |
| `street` | enum | `PREFLOP`, `FLOP`, `TURN`, `RIVER`, `SHOWDOWN` o `TERMINAL`. |
| `seatNumber` | integer nullable | La posición de actuación cuando es visible. |
| `actionType` | enum | Acción histórica ya publicada; nunca se recalcula. |
| `amount` | non-negative integer nullable | Importe autorizado cuando aplica. |
| `occurredAt` | timestamp | Marca histórica; no decide el orden cuando empata, `sequence` prevalece. |
| `stateAfter` | structured projection nullable | Estado autorizado después del evento; null si no puede reconstruirse o no es visible. |
| `limitation` | ReplayLimitation nullable | Explicación cuando el estado o la transición no puede mostrarse con certeza. |

## ReplayLimitation

Explicación de información no disponible.

| Field | Type | Rules |
|---|---|---|
| `code` | enum | `HIDDEN_PRIVATE_DATA`, `LEGACY_GAP`, `ANONYMIZED_DATA`, `UNAVAILABLE_STATE` o `NO_VISIBLE_EVENTS`. |
| `message` | safe display string | No contiene cartas privadas, IDs de otros usuarios ni detalles del almacenamiento. |
| `fromSequence` | positive integer nullable | Inicio de la brecha cuando aplica. |
| `toSequence` | positive integer nullable | Fin de la brecha cuando aplica. |

## ReplayViewPolicy

No se persiste; deriva de `HistoryAccessPolicy` y de la proyección de Feature 009.

- Solo puede crearse para una política con `canViewDetail = true`.
- `FULL_AUTHORIZED`, `PUBLIC_ONLY` y `ANONYMIZED` determinan cartas, identidades y metadatos visibles.
- Una política modificada por eliminación/anonimización se aplica al abrir el replay, no se cachea como permiso permanente.

## State model

```text
HISTORICAL RECORD
    |
    | authorized read
    v
REPLAY DOCUMENT (position 0)
    |
    | next / previous / select locally
    v
VISIBLE EVENT POSITION
    |
    | final event
    v
TERMINAL POSITION
```

La posición actual, modo de pausa/reproducción y velocidad son estado efímero del cliente. Ninguna transición del replay actualiza `HandHistory` o `HandAction`.

## Validation rules

- Rechazar manos activas, IDs inexistentes y registros sin publicación terminal autorizada.
- Ordenar siempre por `sequence`, con validación de unicidad y límites de posición en el cliente.
- No sintetizar `stateAfter` entre dos eventos ni sustituir un dato privado por un valor controlado por el cliente.
- Devolver una limitación segura cuando no haya eventos visibles o exista una brecha histórica.
- Aplicar la política de visibilidad al documento completo, incluido `initialState`, cada evento y `terminalState`.