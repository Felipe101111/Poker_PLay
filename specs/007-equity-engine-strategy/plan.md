# Implementation Plan: Equity Engine y estrategia versionada

**Branch**: `007-equity-engine-strategy` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

## Summary

Separar la matemática de equity, la representación de rangos y la resolución de estrategia en dominios independientes que puedan ser consumidos por el Poker Trainer. La primera entrega usará cálculo exacto y determinista, combos concretos con pesos explícitos, bloqueadores verificables y datasets estratégicos inmutables por versión. El Trainer combinará ambos resultados sin convertir equity en recomendación ni inventar datos ausentes.

## Technical Context

**Language/Version**: TypeScript on Node.js 20+

**Primary Dependencies**: Existing Poker Engine and hand evaluator, Express, Prisma, PostgreSQL, Zod, Vitest, Supertest

**Storage**: PostgreSQL for version metadata and immutable evaluation snapshots; versioned strategy source data retained with the backend dataset boundary

**Testing**: Vitest unit tests, Supertest contract/integration tests, TypeScript build, existing Poker Engine regression suite

**Target Platform**: Existing Node.js backend and authenticated browser Trainer

**Project Type**: Web application with pure domain engines, authenticated backend services, and existing React frontend integration

**Performance Goals**: At least 95% of normal equity queries under 2 seconds in the reference environment; deterministic calculations must not trade correctness for an undeclared approximation

**Constraints**: Server-authoritative inputs, no frontend poker calculations, no arbitrary recommendations, no private-data leakage, exact initial calculation method, explicit ties and precision, immutable strategy history, virtual chips only

**Scale/Scope**: Initial Texas Hold'em No-Limit support for heads-up and small multi-player hand/range analysis, preflop compatibility with Feature 006, and domain contracts extensible to flop/turn/river without implementing postflop Trainer flows here

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS: Equity and strategy are separate responsibilities, with the Trainer acting as orchestrator only (Principles 6, 8, 11, 14, 36).
- PASS: The Equity Engine reuses poker-domain card and hand evaluation concepts without depending on UI, persistence, or transport (Principles 7, 9, 33).
- PASS: Strategy data is explicit, versioned, documented, and returns `UNAVAILABLE` instead of invented advice (Principles 12, 13, 15, 31).
- PASS: Calculations are deterministic and server-authoritative; invalid cards, ranges, and actions are rejected (Principles 1, 3, 9, 10).
- PASS: Historical evaluations retain their source context and remain reproducible (Principles 24, 25).
- PASS: Unit, contract, integration, regression, and edge-case tests are required before completion (Principles 26, 27, 28).
- PASS: The scope excludes real money, live tournament behavior, and postflop user flows; those remain future features (Principles 2, 16, 29).

## Research Summary

Phase 0 decisions are recorded in [research.md](research.md). The main decisions are exact enumeration as the canonical first method, explicit weighted concrete combos, blocker filtering without silent redistribution, immutable strategy manifests, and snapshots of resolved rows for historical evaluations.

## Project Structure

### Documentation (this feature)

```text
specs/007-equity-engine-strategy/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── equity-strategy-contracts.md
└── tasks.md                  # generated later by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── equity/
│   │   │   ├── equity.types.ts
│   │   │   ├── equity.validation.ts
│   │   │   ├── equity.engine.ts
│   │   │   └── equity.projection.ts
│   │   ├── strategy/
│   │   │   ├── strategy.types.ts
│   │   │   ├── strategy.validation.ts
│   │   │   ├── strategy.repository.ts
│   │   │   └── strategy.service.ts
│   │   └── trainer/
│   │       └── existing trainer integration
│   ├── db/prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── poker-engine/
└── tests/
    ├── unit/equity/
    ├── unit/strategy/
    ├── contract/
    └── integration/

frontend/
├── src/services/
└── tests/
```

**Structure Decision**: Extend the existing backend with independent `equity` and `strategy` domain modules. The Equity Engine accepts immutable analysis DTOs and may reuse the pure Poker Engine evaluator. The Strategy Engine resolves versioned data and owns strategy semantics. Persistence stores immutable dataset metadata and evaluation snapshots. The Trainer remains the boundary that validates authenticated scenarios and combines outputs. Frontend changes are limited to rendering richer evaluation data after backend contracts are stable.

## Phase 0: Research

1. Confirm exact enumeration boundaries and benchmark representative hand/range cases against the 2-second target.
2. Define canonical card ordering, combo expansion, weight normalization, blocker filtering, empty-range behavior, ties, and precision metadata.
3. Define strategy dataset manifest, immutable publication identity, historical snapshot shape, and `UNAVAILABLE` semantics.
4. Confirm compatibility mapping from Feature 006 scenarios to the new evaluation context without exposing engine snapshots or opponent private cards.

## Phase 1: Design & Contracts

1. Define domain entities and validation rules in [data-model.md](data-model.md).
2. Define pure Equity Engine and Strategy Engine contracts plus Trainer integration in [contracts/equity-strategy-contracts.md](contracts/equity-strategy-contracts.md).
3. Define runnable unit, integration, regression, security, and performance checks in [quickstart.md](quickstart.md).
4. Re-check constitution gates after design: no violations identified; all future postflop and tournament behavior remains explicitly deferred.

## Implementation Sequence

1. Add canonical card/combo/range types and validation tests.
2. Implement exact equity calculation and its edge-case tests.
3. Add versioned strategy manifest/loader and immutable publication/read tests.
4. Add persistence for dataset metadata and evaluation snapshots with migration and ownership checks.
5. Integrate equity and strategy into Trainer evaluation while preserving Feature 006 behavior and redaction.
6. Add contract/integration/security tests and measure p95 performance.
7. Update documentation and generate implementation tasks with `/speckit-tasks`.

## Complexity Tracking

No constitution violations requiring a deviation are identified.
