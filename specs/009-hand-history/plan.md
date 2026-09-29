# Implementation Plan: Historial general de manos

**Branch**: `009-hand-history` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-hand-history/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Feature 009 añade un historial persistente y consultable de manos terminadas, con detalle ordenado, filtros, paginación y políticas de privacidad. Se usará un registro histórico canónico independiente del estado activo de una partida, escrito únicamente cuando una mano alcance un estado terminal y proyectado según la autorización del usuario. La eliminación se modelará como eliminación lógica o anonimización cuando existan participantes o referencias que deban conservarse.

## Technical Context

**Language/Version**: TypeScript sobre Node.js 20; React 18 para la interfaz existente

**Primary Dependencies**: Express, Prisma, PostgreSQL, Zod, Vitest, Supertest, React Testing Library y Vite existentes en el repositorio

**Storage**: PostgreSQL para registros históricos, acciones ordenadas, participantes y snapshots públicos; no se usará el estado activo en memoria como historial

**Testing**: Vitest unitario e integración, Supertest para contratos HTTP, React Testing Library para lista, filtros, detalle, estados vacíos y privacidad

**Target Platform**: Servicio web autenticado y cliente browser soportado por el proyecto; desarrollo local en Windows con PostgreSQL

**Project Type**: Aplicación web con backend HTTP y frontend browser

**Performance Goals**: Al menos 95% de las consultas habituales devuelve la primera página en menos de 1 segundo en el entorno de referencia, manteniendo orden determinista y filtros combinables

**Constraints**: Autenticación obligatoria; nunca revelar mazo, cartas privadas no autorizadas o existencia de manos ajenas; solo manos terminales; paginación con límites; detalle inmutable o auditado; no replay ni analytics en esta feature

**Scale/Scope**: Un historial por usuario con miles de manos, consultas paginadas y filtros básicos por periodo, modalidad, resultado y participante; incluye integración con fuentes de manos persistibles sin rediseñar el Poker Engine

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **PASS**: La autoridad de reglas y transiciones permanece en el backend/Poker Engine; el historial solo registra resultados terminales y no decide acciones.
- **PASS**: Toda consulta y operación de privacidad está autenticada y autorizada por el servidor; las proyecciones no incluyen información privada no permitida.
- **PASS**: El historial se separa de Poker Engine, Equity/Strategy, persistencia y presentación mediante un módulo y contratos propios.
- **PASS**: Los datos históricos mantienen integridad, orden de acciones, idempotencia de finalización y snapshots auditables.
- **PASS**: El diseño exige pruebas unitarias, de contrato, integración, seguridad y frontend antes de dar la feature por terminada.
- **PASS**: Replay, analytics, administración y multijugador quedan fuera del alcance de esta feature.

## Project Structure

### Documentation (this feature)

```text
specs/009-hand-history/
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
│   ├── db/prisma/
│   ├── modules/hand-history/
│   ├── modules/local-games/
│   ├── modules/multiplayer/
│   ├── modules/trainer/
│   └── shared/
└── tests/
  ├── contract/
  ├── integration/
  ├── performance/
  └── unit/

frontend/
├── src/
│   ├── pages/
│   ├── services/
│   └── components/
└── tests/

```

**Structure Decision**: Se mantiene la separación existente entre `backend` y `frontend`. El backend incorporará un módulo `hand-history` para persistencia, autorización, consultas y proyecciones, mientras que los productores de manos solo publicarán snapshots terminales mediante una frontera explícita. El frontend añadirá la vista y el cliente del historial sin duplicar reglas de póker.

## Post-Design Constitution Check

*GATE: PASS*

- **Server authority and privacy**: PASS. All list, detail, publication, and privacy operations are server-authorized; projections omit unauthorized private cards, decks, and internal engine state.
- **Domain separation**: PASS. History persistence and projection are separate from Poker Engine rules, strategy/equity calculations, and frontend presentation.
- **Data integrity**: PASS. Terminal publication is idempotent, action order is immutable, and shared records use explicit anonymization/restriction rules.
- **Testing and observability**: PASS. The quickstart requires unit, contract, integration, security, frontend, regression, and performance validation.
- **Scope discipline**: PASS. Replay, analytics, administration, and multiplayer training are explicitly deferred to Features 010–013.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | The feature fits the existing backend/frontend structure and does not introduce a new project or service. |
