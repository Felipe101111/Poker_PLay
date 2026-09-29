# Implementation Plan: Replay de manos

**Branch**: `010-hand-replay` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-hand-replay/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Feature 010 añade una reproducción determinista y autorizada de manos históricas terminales. El backend leerá el registro inmutable de Feature 009, proyectará cada estado posterior de acción según la política de privacidad del usuario y devolverá una línea temporal completa para la navegación del cliente. Pausa, avance, retroceso y salto serán operaciones de lectura sobre esa línea temporal; no se re-simulará el motor de póker ni se persistirá una sesión de replay.

## Technical Context

**Language/Version**: TypeScript sobre Node.js 20; React 18 para la interfaz existente

**Primary Dependencies**: Express, Prisma, PostgreSQL, Zod, Vitest, Supertest, React Testing Library y Vite existentes en el repositorio

**Storage**: PostgreSQL existente; no se añaden entidades persistentes para la sesión de replay. Se leen `HandHistory`, `HandAction` y `HistoryAccessPolicy`.

**Testing**: Vitest unitario e integración, Supertest para el contrato HTTP y React Testing Library para controles de reproducción, navegación, limitaciones y privacidad

**Target Platform**: Servicio web autenticado y cliente browser del proyecto; desarrollo local en Windows con PostgreSQL

**Project Type**: Aplicación web con backend HTTP y frontend browser

**Performance Goals**: Al menos 95% de las aperturas de replay habituales muestra el primer estado visible en menos de 1 segundo; navegación local entre posiciones sin nueva petición ni latencia perceptible

**Constraints**: Solo manos terminales y autorizadas; proyección privada por usuario; no revelar mazo ni cartas no autorizadas; orden histórico por `sequence`; no modificar ni re-simular hechos; payload acotado por el límite de acciones de una mano; sesiones de replay no persistentes

**Scale/Scope**: Manos con miles de acciones como límite operativo; una línea temporal por apertura; incluye backend, cliente API, página de replay y pruebas, sin analytics, administración ni entrenamiento multijugador

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **PASS**: La autoridad de reglas permanece en el backend; replay solo proyecta hechos terminales ya publicados y nunca ejecuta transiciones del Poker Engine.
- **PASS**: El acceso requiere sesión y política de historial; cada estado y evento se redacta antes de llegar al cliente.
- **PASS**: La funcionalidad se separa en proyección/servicio de historial y presentación frontend, sin mezclar reglas de póker con UI.
- **PASS**: La secuencia histórica sigue siendo inmutable; la navegación mantiene la reproducibilidad y no crea registros.
- **PASS**: Se cubrirán autorización, privacidad, orden, estados incompletos, límites de navegación y regresión con pruebas automatizadas.
- **PASS**: El alcance excluye edición, analytics, administración editorial y entrenamiento multijugador.

## Project Structure

### Documentation (this feature)

```text
specs/010-hand-replay/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
```text
backend/
├── src/
│   ├── modules/hand-history/
│   │   ├── hand-history.replay.ts
│   │   ├── hand-history.projection.ts
│   │   ├── hand-history.routes.ts
│   │   └── hand-history.service.ts
│   └── app.ts
└── tests/
    ├── contract/
    ├── integration/
    ├── performance/
    └── unit/

frontend/
├── src/
│   ├── pages/HandReplayPage.tsx
│   ├── services/handHistoryApi.ts
│   └── App.tsx
└── tests/
```

**Structure Decision**: Se mantiene la aplicación web existente separada en `backend` y `frontend`. El backend añade la lectura/proyección del replay dentro del módulo de historial; el frontend añade la página y controles de navegación reutilizando el cliente de historial. No se crea un servicio, motor ni almacenamiento separado.

## Phase 0: Research Summary

Las decisiones quedan documentadas en [research.md](research.md): el replay es una proyección determinista de `HandHistory`, no una simulación; la autorización se reutiliza desde `HistoryAccessPolicy`; los eventos incompletos se expresan como limitaciones explícitas; y la navegación se mantiene como estado local del cliente.

## Phase 1: Design Summary

- [data-model.md](data-model.md) define las vistas efímeras `ReplayDocument`, `ReplayEvent` y `ReplayLimitation` sobre las entidades existentes.
- [contracts/hand-replay-http.md](contracts/hand-replay-http.md) define el endpoint autenticado de lectura y sus respuestas de privacidad/error.
- [quickstart.md](quickstart.md) define validación backend, frontend, seguridad y regresión.

## Post-Design Constitution Check

*GATE: PASS*

- **Server authority and privacy**: PASS. El servidor autoriza la apertura y genera una proyección por usuario; el cliente solo navega estados recibidos.
- **Determinism and historical integrity**: PASS. Los eventos se ordenan por `sequence`, se leen sin mutación y una brecha se muestra como limitación, nunca como estado inventado.
- **Domain separation**: PASS. La proyección de replay no ejecuta Poker Engine, Equity Engine ni Strategy Engine.
- **Testing and edge cases**: PASS. El diseño cubre manos terminales, estados sin eventos visibles, anonimización, IDs no autorizados, límites de posición y re-apertura.
- **Scope discipline**: PASS. No se añaden edición, analytics, administración editorial ni entrenamiento multijugador.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | La feature usa las fronteras existentes y no introduce un nuevo proyecto, servicio o almacenamiento. |
