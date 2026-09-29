# Implementation Plan: Administración de estrategia versionada

**Branch**: `012-strategy-administration` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-strategy-administration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Feature 012 añade administración editorial para datasets estratégicos versionados: borradores editables, validación, publicación, retiro, permisos globales y auditoría. La implementación extenderá el módulo `strategy` existente y sus modelos Prisma, conservará las publicaciones históricas inmutables y expondrá rutas autenticadas para operadores autorizados. El Trainer seguirá resolviendo solo versiones publicadas y el lookup interno conservará la respuesta `UNAVAILABLE` cuando no exista una versión compatible.

## Technical Context

**Language/Version**: TypeScript sobre Node.js 20; React 18 para la interfaz administrativa existente

**Primary Dependencies**: Express 4, Prisma 5, PostgreSQL, Zod, Vitest, Supertest, React Testing Library y Vite existentes

**Storage**: PostgreSQL mediante Prisma; migración para datasets, borradores, roles editoriales, auditoría y control de versión; los snapshots de evaluación existentes permanecen append-only

**Testing**: Vitest unitario e integración, Supertest para contratos HTTP, pruebas de autorización/concurrencia y React Testing Library para estados y formularios administrativos

**Target Platform**: Servicio web autenticado y cliente browser del proyecto; desarrollo local en Windows con PostgreSQL

**Project Type**: Aplicación web con backend HTTP, frontend browser y persistencia relacional

**Performance Goals**: El 95% de las consultas de historial devuelve metadatos en menos de 2 segundos con 1.000 versiones; las operaciones de validación/publicación son atómicas y no crean versiones parcialmente publicadas

**Constraints**: Solo roles globales, sin ACL por dataset; servidor autoritativo; borradores editables y publicaciones/retirados inmutables; control optimista de concurrencia; no importar automáticamente desde solver; no modificar snapshots históricos

**Scale/Scope**: Catálogo de datasets estratégicos existentes, hasta 1.000 versiones en las consultas de historial y filas acotadas por publicación; operaciones editoriales autenticadas; sin administración general de cuentas, billing ni entrenamiento multijugador

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **PASS — Server authority and security**: El backend valida identidad, rol, transición de estado, contenido, autoría, versión activa y auditoría; el cliente no puede establecer valores confiables.
- **PASS — Domain separation**: La administración se mantiene en el módulo Strategy y no incorpora reglas del Poker Engine, cálculo de equity ni presentación dentro del dominio.
- **PASS — Data integrity and history**: Publicación, retiro y actualización de borradores usan operaciones atómicas; las versiones publicadas/retiradas y snapshots históricos permanecen inmutables.
- **PASS — Explicit authorization**: Roles globales separados (`EDITOR`, `REVIEWER`, `PUBLISHER`, `ADMIN`) se aplican en servidor; las operaciones no autorizadas no revelan contenido.
- **PASS — Testing and incremental delivery**: Se cubrirán validación, transiciones, concurrencia, auditoría, privacidad, contratos y regresión del lookup existente antes de la UI completa.
- **PASS — Scope and technology independence**: Se reutiliza Express/Prisma/PostgreSQL del proyecto sin introducir servicio externo ni proveedor adicional.

## Project Structure

### Documentation (this feature)

```text
specs/012-strategy-administration/
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
│   ├── db/prisma/schema.prisma
│   ├── modules/auth/
│   ├── modules/strategy/
│   │   ├── strategy.types.ts
│   │   ├── strategy.validation.ts
│   │   ├── strategy.repository.ts
│   │   ├── strategy.service.ts
│   │   ├── strategy.admin.repository.ts
│   │   ├── strategy.admin.service.ts
│   │   └── strategy.admin.routes.ts
│   └── app.ts
└── tests/
    ├── contract/
    ├── integration/
    ├── security/
    ├── unit/
    └── performance/

frontend/
├── src/
│   ├── pages/StrategyAdministrationPage.tsx
│   ├── services/strategyAdministrationApi.ts
│   ├── pages/strategyAdministrationState.ts
│   └── App.tsx
└── tests/
    └── strategy-administration.test.tsx

**Structure Decision**: Se mantiene la aplicación web existente separada en `backend` y `frontend`. La persistencia y reglas editoriales viven en el módulo Strategy; las rutas administrativas se registran antes de cualquier lookup dinámico. La UI administrativa consume contratos del backend y no recalcula validaciones ni decide transiciones.

## Phase 0: Research Summary

Las decisiones sobre persistencia, roles globales, control optimista, publicación atómica, hash de contenido y compatibilidad con el lookup existente están documentadas en [research.md](research.md). Las decisiones técnicas abiertas quedaron resueltas en Phase 0.

## Phase 1: Design Summary

- [data-model.md](data-model.md) define datasets, versiones, filas, reportes, permisos, publicaciones y auditoría, incluidos estados y conflictos concurrentes.
- [contracts/strategy-administration-http.md](contracts/strategy-administration-http.md) define rutas autenticadas, payloads, respuestas, errores y límites de privacidad.
- [quickstart.md](quickstart.md) define validación de migración, autorización, ciclo editorial, conflicto concurrente, regresión del Trainer y UI.

## Implementation Phases

### Phase 1: Persistence and domain foundation

1. Añadir `StrategyDataset`, estado `DRAFT`, metadatos de borrador, versión de contenido y rol editorial global al esquema Prisma.
2. Añadir `EditorialAuditEntry` y registros de publicación/retiro con relaciones e índices para historial y auditoría.
3. Crear la migración y preservar compatibilidad con las versiones publicadas existentes.
4. Extender tipos y validadores para metadatos, filas, duplicados, compatibilidad, frecuencias y reporte de validación.
5. Implementar transiciones atómicas `DRAFT -> PUBLISHED -> RETIRED` y control optimista por número de revisión.

### Phase 2: Authorized administration API

1. Implementar repositorio y servicio administrativo separados del lookup de estrategia usado por el Trainer.
2. Añadir middleware de roles globales y autorización por operación: editor, revisor, publicador y administrador.
3. Añadir creación/consulta de datasets y borradores, edición de filas y consulta de reportes de validación.
4. Añadir publicación, reemplazo de versión activa, retiro con motivo y respuesta explícita cuando no haya alternativa compatible.
5. Añadir historial de versiones, auditoría y asignación de rol editorial para administradores.
6. Redactar errores estables para acceso denegado, conflicto de revisión, estado inválido, validación fallida e inexistencia de recurso.

### Phase 3: Administration UI

1. Añadir página protegida de administración con catálogo, estados y filtros de versiones.
2. Añadir editor de borradores, carga/edición de filas, errores por fila y reporte de validación.
3. Añadir acciones de publicar, reemplazar y retirar con confirmación, motivo y estados de operación.
4. Añadir historial/auditoría, gestión de roles y estados de carga, vacío, error y acceso denegado.
5. Conservar mensajes y controles accesibles, navegación estable y ninguna exposición de filas a usuarios no autorizados.

### Phase 4: Cross-cutting validation

1. Ejecutar migración y quickstart con datos existentes y fixtures de versiones válidas/ inválidas.
2. Ejecutar pruebas unitarias, contractuales, integración, seguridad, concurrencia, auditoría y rendimiento.
3. Ejecutar regresión completa del Strategy Engine, Trainer y frontend existente.
4. Actualizar README/backend README y documentar la política de roles y estados.
```

## Post-Design Constitution Check

*GATE: PASS*

- **Server authority and security**: PASS. El servidor es la única autoridad para permisos, validación, autoría, estados, versión activa y auditoría; los payloads no pueden fijar esos valores.
- **Data integrity and reproducibility**: PASS. La publicación/retiro es atómica, los borradores tienen revisión, las versiones históricas son inmutables y los snapshots existentes no se reescriben.
- **Domain separation**: PASS. El módulo administrativo reutiliza el Strategy Engine mediante contratos, sin mezclar cálculo de equity, reglas de poker o UI con persistencia.
- **Testing**: PASS. El diseño incluye pruebas de autorización, privacidad, estados inválidos, duplicados, idempotencia, conflictos concurrentes y regresión del Trainer.
- **Incremental complexity**: PASS. Se añade una migración y un módulo administrativo dentro de la aplicación existente; no se crea un servicio externo ni ACL por dataset.

## Complexity Tracking

No constitution violations. The design adds persistence because drafts, roles, audit history, and atomic publication cannot be represented safely by the current in-memory repository; all additions remain inside the existing backend/frontend projects.
