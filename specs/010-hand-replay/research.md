# Research: Replay de manos

## Decision: Proyección determinista sobre el historial existente

**Rationale**: Feature 009 ya conserva acciones ordenadas y `publicStateAfter` como hechos históricos. Reproducir esos estados evita que una versión posterior del Poker Engine cambie retrospectivamente una mano y cumple la exigencia de reproducibilidad.

**Alternatives considered**: Re-simular la mano desde acciones y cartas; descartado porque necesitaría datos privados o reglas históricas exactas, podría producir resultados distintos y convertiría el replay en una segunda autoridad.

## Decision: Un endpoint autenticado devuelve la línea temporal autorizada completa

**Rationale**: Una sola lectura permite que avanzar, retroceder y saltar sean operaciones locales, estables y rápidas. El endpoint reutiliza la autorización de historial y proyecta cada estado para el usuario solicitante.

**Alternatives considered**: Solicitar cada posición individualmente; descartado por latencia acumulada y porque facilita inconsistencias si cambia la política entre peticiones. Persistir una sesión de replay; descartado porque la posición es una preferencia efímera y no un hecho de dominio.

## Decision: Mantener la sesión de replay solo en el cliente

**Rationale**: La posición, el modo pausa/reproducción y la velocidad no cambian la mano ni deben generar datos persistentes. El cliente puede reiniciar la vista solicitando la misma proyección autorizada.

**Alternatives considered**: Guardar `currentPosition` en PostgreSQL; descartado como complejidad prematura y por no aportar valor a una primera versión.

## Decision: Redacción en cada evento y no solo en el resumen

**Rationale**: Una carta o identidad puede volverse visible en un momento concreto. La proyección debe aplicar la política al estado inicial y a cada `publicStateAfter`, omitiendo campos no autorizados en toda la línea temporal.

**Alternatives considered**: Enviar el snapshot completo y ocultar campos con la UI; descartado por violar la autoridad del servidor y permitir filtraciones mediante herramientas del navegador.

## Decision: Brechas históricas como limitaciones explícitas

**Rationale**: Los registros antiguos o anonimizados no deben rellenarse con estados inventados. La respuesta conserva eventos disponibles y declara las posiciones o transiciones que no pueden reconstruirse.

**Alternatives considered**: Interpolar el estado entre acciones; descartado porque parecería un hecho histórico y podría cambiar la interpretación de una decisión.

## Decision: Reutilizar el contrato de sesión, errores y rutas de historial

**Rationale**: El repositorio ya usa sesiones cookie, `requireAuth`, el envelope estándar de error y el módulo `hand-history`. Añadir una lectura especializada dentro de esa frontera minimiza superficie de seguridad y mantiene la separación de responsabilidades.

**Alternatives considered**: Crear un módulo `/replay` independiente; descartado porque duplicaría autorización, repositorio y proyecciones del historial.