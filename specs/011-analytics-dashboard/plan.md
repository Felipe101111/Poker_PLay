# Implementation Plan: Analytics de rendimiento de poker

**Branch**: `011-analytics-dashboard` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-analytics-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Feature 011 añade un dashboard personal de analytics sobre manos históricas terminales y autorizadas. El backend reutilizará la frontera de Feature 009, calculará métricas derivadas de forma read-only y devolverá un documento único con filtros, resumen, tendencias, métricas VPIP/PFR/3-bet/win rate, desgloses, limitaciones y manos relacionadas. El frontend presentará esos resultados y enlazará al detalle/replay existentes sin recalcular datos ni exponer información privada.

## Technical Context

**Language/Version**: TypeScript sobre Node.js 20; React 18 para la interfaz existente

**Primary Dependencies**: Express, Prisma 5, PostgreSQL, Zod, Vitest, Supertest, React Testing Library y Vite existentes en el repositorio

**Storage**: PostgreSQL existente; no se añade tabla de analytics ni sesión persistente. Se leen `HandHistory`, `HandAction` y `HistoryAccessPolicy`; los valores públicos opcionales de resultado/EV viven en el snapshot histórico existente.

**Testing**: Vitest unitario e integración, Supertest para contrato HTTP y React Testing Library para dashboard, filtros, estados vacíos, privacidad y navegación

**Target Platform**: Servicio web autenticado y cliente browser del proyecto; desarrollo local en Windows con PostgreSQL

**Project Type**: Aplicación web con backend HTTP y frontend browser

**Performance Goals**: El 95% de consultas habituales muestra el resumen inicial en menos de 2 segundos; filtros y navegación no deben disparar cálculos inconsistentes ni solicitudes por widget

**Constraints**: Solo datos terminales autorizados; privacidad server-side; métricas con denominador y umbral; `null` y limitaciones para datos ausentes; respuestas acotadas; no recomendaciones automáticas, rankings ni edición de manos

**Scale/Scope**: Dashboard personal, una consulta agregada por apertura, filtros por fecha/modalidad, desgloses por posición/calle y hasta 50 manos relacionadas por respuesta; no analytics entre jugadores

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **PASS — Server authority**: El servidor calcula y valida el alcance de analytics; el cliente solo presenta datos recibidos.
- **PASS — Privacy and authentication**: Solo se agregan manos cubiertas por la política del usuario y se excluyen campos privados antes de calcular o responder.
- **PASS — Domain separation**: Analytics vive junto al módulo de historial y no introduce reglas en Poker Engine, Equity Engine o Strategy Engine.
- **PASS — Data integrity**: La consulta es read-only; no modifica manos, acciones, políticas ni crea sesiones derivadas.
- **PASS — Determinism and testability**: Filtros, orden estable, numeradores/denominadores y umbral permiten reproducir cada métrica con fixtures.
- **PASS — Scope**: No se incluyen análisis de otros usuarios, recomendaciones automáticas, administración editorial ni entrenamiento multijugador.

## Project Structure

### Documentation (this feature)

```text
specs/011-analytics-dashboard/
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
│   │   ├── hand-history.analytics.ts
│   │   ├── hand-history.analytics.types.ts
│   │   ├── hand-history.repository.ts
│   │   ├── hand-history.service.ts
│   │   ├── hand-history.routes.ts
│   │   └── hand-history.validation.ts
│   └── app.ts
└── tests/
    ├── contract/
    ├── integration/
    ├── performance/
    └── unit/

frontend/
├── src/
│   ├── pages/AnalyticsPage.tsx
│   ├── pages/analyticsState.ts
│   ├── services/handAnalyticsApi.ts
│   ├── components/
│   └── App.tsx
└── tests/
```

**Structure Decision**: Se mantiene la aplicación web existente separada en `backend` y `frontend`. El backend añade cálculo, consulta y contrato de analytics dentro del módulo de historial; el frontend añade una página, estado de filtros y cliente API. No se crea un servicio ni almacenamiento separado.

## Phase 0: Research Summary

Las decisiones de alcance, privacidad, métricas, umbral, EV opcional, endpoint único y límites de respuesta están documentadas en [research.md](research.md). No quedan aclaraciones abiertas.

## Phase 1: Design Summary

- [data-model.md](data-model.md) define filtros, métricas con denominadores, limitaciones, tendencias, desgloses y manos relacionadas.
- [contracts/hand-analytics-http.md](contracts/hand-analytics-http.md) define el endpoint autenticado, respuesta, errores y reglas de privacidad.
- [quickstart.md](quickstart.md) define validación backend, frontend, flujo autenticado y regresión.

## Implementation Phases

### Phase 1: Backend analytics foundation

1. Añadir tipos de filtros, métricas, limitaciones, tendencias, breakdowns y documento de respuesta.
2. Añadir validación de fechas, formato y límite de manos relacionadas.
3. Implementar repositorio autorizado que consulte solo manos terminales/listables con acciones ordenadas y políticas.
4. Implementar proyección de snapshot público y cálculo determinista de resumen, tendencia, métricas y desgloses.
5. Añadir el servicio y `GET /api/hand-history/analytics` con el envelope de errores existente.
6. Cubrir orden, denominadores, muestras insuficientes, cero resultados, privacidad y no mutación.

### Phase 2: Frontend dashboard

1. Añadir tipos y cliente API para analytics con query parameters codificados.
2. Crear `/analytics` con carga, error, estado vacío y estado de limitaciones.
3. Mostrar resumen, tendencia real/EV, tarjetas VPIP/PFR/3-bet/win rate y tablas por posición/calle.
4. Añadir filtros de fecha/modalidad y sincronizar el alcance mostrado en todas las secciones.
5. Añadir enlaces acotados a detalle/replay y conservar o restablecer filtros de forma explícita.
6. Cubrir accesibilidad, privacidad, responsive básico, filtros y navegación.

### Phase 3: Cross-cutting validation

1. Ejecutar quickstart, builds y suites focalizadas.
2. Validar rendimiento con payload representativo y límites de manos relacionadas.
3. Ejecutar regresión completa de backend y frontend.
4. Actualizar documentación sin introducir migraciones si el diseño sigue siendo derivado.

## Post-Design Constitution Check

*GATE: PASS*

- **Server authority and privacy**: PASS. El servidor filtra, calcula y redacta; el cliente no agrega datos ni recibe información ajena.
- **Data integrity**: PASS. El endpoint es read-only y las métricas son derivadas de snapshots y acciones existentes.
- **Determinism and testing**: PASS. El contrato exige orden estable, denominadores, umbral y estados explícitos para datos faltantes.
- **Domain separation**: PASS. No se modifican reglas del Poker Engine ni se mezclan recomendaciones estratégicas con analytics descriptivo.
- **Performance and scope**: PASS. Una respuesta agregada, límites explícitos y sin tabla de precálculo para el MVP mantienen la complejidad acotada.

## Complexity Tracking

No constitution violations. The design reuses the existing history repository, authorization policy, API error envelope, and frontend routing; it adds no project, service, migration, or persistent analytics session.
