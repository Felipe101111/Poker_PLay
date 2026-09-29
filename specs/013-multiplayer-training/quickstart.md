# Quickstart: Feature 013 Entrenamiento multijugador

## Prerrequisitos

- Node.js 20+.
- PostgreSQL disponible y `DATABASE_URL` configurado en `backend/.env`.
- Dependencias instaladas en `backend` y `frontend`.
- Dos o más usuarios autenticados que sean miembros de una sala iniciada.
- La sala usa fichas virtuales y el Poker Engine existente.

## Preparación

Desde PowerShell:

```powershell
Set-Location C:\Users\Felipe\Desktop\Poker_PLay\backend
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run build
```

La migración debe conservar las mesas, manos, acciones, sesiones individuales del Trainer, snapshots de evaluación e historiales existentes.

## Validación HTTP

1. Crear o iniciar una sala con al menos dos miembros y obtener la mesa autorizada mediante `GET /api/rooms/:roomId/table`.
2. Inscribir al primer jugador con `POST /api/rooms/:roomId/training` usando `{ "mode": "CREATE_OR_JOIN" }`.
3. Inscribir al segundo jugador con el mismo endpoint y confirmar que ambos tienen su propio estado de participante.
4. Consultar `GET /api/rooms/:roomId/training` desde cada sesión y comprobar que cada respuesta contiene solo las decisiones propias.
5. Enviar una acción legal mediante `POST /api/rooms/:roomId/table/actions`; confirmar el cambio de mesa y una decisión de entrenamiento únicamente para el actor.
6. Repetir el mismo `requestId`; confirmar que no se crea una transición ni una decisión duplicada.
7. Intentar una acción con `expectedVersion` antiguo o desde un usuario fuera de la sala; confirmar rechazo sin cambio de estado ni filtración.
8. Enviar acciones hasta completar una calle y una mano; confirmar feedback disponible cuando existe estrategia compatible y `UNAVAILABLE` explícito cuando no existe.
9. Publicar o retirar una versión estratégica después de una decisión; consultar la decisión y confirmar que conserva sus snapshots originales.
10. Ejecutar `POST /api/rooms/:roomId/training/leave`; confirmar que el jugador sigue en la mesa pero no recibe nuevas decisiones de entrenamiento.

Los detalles de payload y errores están en [contracts/multiplayer-training-http.md](contracts/multiplayer-training-http.md).

## Validación realtime

Desde dos clientes autenticados:

- Unirse con `training:join` y comprobar que el evento privado no llega al otro jugador.
- Enviar `table:action` y comprobar que ambos reciben la actualización de mesa, pero solo el actor recibe `training:decision-evaluated`.
- Desconectar y reconectar un cliente; confirmar que recupera el snapshot más reciente y sus decisiones mediante HTTP.
- Repetir una acción concurrentemente desde dos clientes; confirmar que como máximo una avanza la versión.
- Completar la mano y confirmar un único `training:completed` y una única entrada visible en Hand History.

Los eventos están definidos en [contracts/multiplayer-training-realtime.md](contracts/multiplayer-training-realtime.md).

## Validación de seguridad y privacidad

- Forjar `userId`, `seatNumber`, cartas, board, stack, estrategia, equity o categoría en cualquier solicitud.
- Intentar leer las decisiones de otro participante con otro `userId`, `participantId`, `handId` o paginación.
- Revisar respuestas de error para confirmar que no revelan si existe una sesión privada fuera del ámbito autorizado.
- Verificar que las proyecciones públicas no contienen mazo, cartas privadas ajenas, snapshots internos ni feedback privado.
- Verificar que una versión retirada no se usa para nuevas evaluaciones y que las decisiones anteriores conservan su snapshot.

## Validación automatizada

```powershell
Set-Location C:\Users\Felipe\Desktop\Poker_PLay\backend
npm.cmd test -- --run tests/contract/multiplayer-training.test.ts tests/integration/multiplayer-training.test.ts tests/security/multiplayer-training.test.ts tests/performance/multiplayer-training.test.ts
npm.cmd run build
npm.cmd run lint

Set-Location C:\Users\Felipe\Desktop\Poker_PLay\frontend
npm.cmd test -- --run tests/multiplayer-training.test.tsx
npm.cmd run build
npm.cmd run lint
```

La cobertura debe incluir acciones válidas e inválidas, concurrencia, idempotencia, privacidad entre participantes, reconexión, timeout/abandono, evaluación disponible/no disponible, snapshots históricos y publicación terminal.

## Criterio de salida

La feature está lista cuando las migraciones son aplicables sin pérdida, el flujo de mesa continúa siendo server-authoritative, las decisiones privadas se aíslan por participante, los reintentos no duplican estados ni feedback, las manos terminadas se publican una sola vez y las suites enfocadas y de regresión permanecen verdes.
