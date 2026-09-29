# Quickstart: Analytics de rendimiento de poker

## Prerequisites

- Node.js 20+ y npm; en Windows usar `npm.cmd`.
- PostgreSQL disponible mediante `backend/.env`.
- Migraciones de Feature 009 aplicadas.
- Un usuario autenticado con manos históricas terminales visibles.
- Para validar datos insuficientes, usar una mano sin bloque `publicSnapshot.analytics` o una muestra menor al umbral.

## Prepare the project

```powershell
Set-Location backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

No se espera una migración nueva para el MVP de analytics; el comando debe confirmar que la base está al día.

## Backend focused validation

```powershell
npm.cmd test -- --run tests/contract/hand-analytics.test.ts tests/unit/hand-history/analytics*.test.ts tests/integration/hand-analytics*.test.ts
npm.cmd run build
```

La suite debe demostrar:

1. Una consulta autenticada devuelve resumen, tendencia, métricas, desgloses y manos relacionadas.
2. Los filtros de fecha y modalidad se aplican al mismo alcance en todas las secciones.
3. VPIP, PFR, 3-bet y win rate conservan numerador, denominador y suficiencia.
4. Ganancia o EV ausentes producen limitaciones explícitas, nunca ceros inventados.
5. Las políticas de historial impiden agregar datos de otro usuario y no permiten enumerar IDs.
6. Una consulta de analytics no crea ni modifica historial, acciones o sesiones.

## Frontend focused validation

```powershell
Set-Location ..\frontend
npm.cmd test -- --run tests/analytics*.test.tsx
npm.cmd run build
```

La suite debe cubrir carga, filtros, estado vacío, muestra insuficiente, navegación a detalle/replay y ausencia de datos privados.

## Manual authenticated flow

1. Iniciar sesión y abrir `/analytics`.
2. Confirmar que el período y modalidad activos aparecen junto al resumen.
3. Cambiar fecha y modalidad y verificar que resumen, gráficas y desgloses cambian juntos.
4. Consultar VPIP, PFR, 3-bet y win rate por posición y calle.
5. Abrir una métrica con muestra insuficiente y confirmar la advertencia.
6. Abrir una mano relacionada y volver al analytics sin perder el contexto de filtros.
7. Abrir el replay de una mano relacionada cuando esté disponible.
8. Repetir con cero resultados y confirmar el estado vacío accionable.

## Full regression validation

```powershell
Set-Location ..\backend
npm.cmd test
npm.cmd run build

Set-Location ..\frontend
npm.cmd test
npm.cmd run build
```

Expected result: las funcionalidades existentes de autenticación, historial, replay, salas, multiplayer, trainer, equity y estrategia permanecen verdes.

See [hand-analytics-http.md](contracts/hand-analytics-http.md) and [data-model.md](data-model.md) for the response contract and derived entities.
