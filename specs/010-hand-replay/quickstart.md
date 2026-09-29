# Quickstart: Replay de manos

## Prerequisites

- Node.js 20 o superior.
- PostgreSQL disponible mediante `backend/.env`.
- Migraciones de Feature 009 aplicadas y al menos una mano terminal con acciones ordenadas.
- Un usuario autenticado con autorización para ver esa mano y, para las pruebas de seguridad, un segundo usuario sin autorización.

## Prepare the project

```powershell
Set-Location backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

Expected result: el cliente Prisma se genera y las migraciones quedan al día sin reiniciar ni borrar la base existente.

## Focused backend validation

```powershell
npm.cmd test -- --run tests/unit/hand-history tests/contract/hand-replay tests/integration/hand-replay
npm.cmd run build
```

La suite debe verificar:

1. Una mano terminal autorizada devuelve estado inicial, eventos ordenados y estado terminal.
2. El orden usa `sequence` aunque `occurredAt` empate.
3. Las manos activas, incompletas, inexistentes o no autorizadas no se presentan como replay.
4. Cada `stateAfter` respeta cartas, identidades y metadatos visibles para el usuario.
5. Los registros con brechas devuelven limitaciones explícitas y nunca estados interpolados.
6. Repetir la lectura no crea copias, mutaciones ni acciones nuevas.
7. Los payloads no contienen mazo, cartas privadas no autorizadas ni identificadores internos.

## Frontend validation

```powershell
Set-Location ..\frontend
npm.cmd test -- --run tests/hand-replay.test.tsx
npm.cmd run build
```

La suite debe cubrir carga, estado vacío, error, reproducción, pausa, avance, retroceso, salto, límite inicial/final, limitaciones y ausencia de datos privados.

## Full regression validation

```powershell
Set-Location ..\backend
npm.cmd test -- --run
npm.cmd run build

Set-Location ..\frontend
npm.cmd test -- --run
npm.cmd run build
```

Expected result: las funcionalidades existentes de autenticación, amistades, salas, multiplayer, trainer, equity, estrategia e historial permanecen verdes.

## Authenticated flow

1. Iniciar sesión como un usuario autorizado y abrir una mano terminal desde el historial.
2. Seleccionar replay y confirmar que aparece el estado inicial antes de la primera acción.
3. Avanzar y retroceder; confirmar que el indicador de posición y el estado visible siguen la secuencia histórica.
4. Pausar y reanudar; confirmar que la pausa congela el estado y la reproducción termina en el evento terminal.
5. Saltar a una acción y confirmar que no se omiten las reglas de privacidad.
6. Repetir con una mano anonimizada o incompleta; confirmar las limitaciones explícitas.
7. Intentar abrir el ID con un usuario no autorizado; confirmar que la respuesta no revela existencia ni datos privados.

Consulta [contracts/hand-replay-http.md](contracts/hand-replay-http.md) y [data-model.md](data-model.md) para el contrato y las reglas de proyección.