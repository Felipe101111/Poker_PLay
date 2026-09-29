# Research: Analytics de rendimiento de poker

## Decision 1: Calcular analytics bajo demanda a partir del historial autorizado

- **Decision**: El MVP consultará `HandHistory`, `HandHistoryParticipant`, `HandAction` y `HistoryAccessPolicy`, aplicará filtros de fecha/modalidad y calculará la respuesta en memoria. No se crea una tabla de analytics ni una sesión persistente.
- **Rationale**: Feature 009 ya contiene la frontera de privacidad y la fuente de manos terminales. Las métricas derivadas deben mantenerse consistentes con los hechos históricos y evitar una segunda fuente que pueda quedar obsoleta.
- **Alternatives considered**: Crear tablas agregadas o jobs de precálculo. Se pospone porque no existe todavía un volumen medido que justifique complejidad, invalidación y migraciones adicionales.

## Decision 2: Reutilizar la autorización del historial

- **Decision**: El endpoint solo agrega manos con una `HistoryAccessPolicy` del usuario con permiso de visualización/listado. Las acciones y snapshots se proyectan antes del cálculo; no se agregan datos privados o de participantes que el usuario no puede ver.
- **Rationale**: Mantiene la regla de no confiar en el cliente y evita que una métrica agregada se convierta en un canal de inferencia sobre otro jugador.
- **Alternatives considered**: Calcular sobre todas las manos y redactar la respuesta final. Se rechaza porque los conteos y porcentajes podrían revelar la existencia de datos no autorizados.

## Decision 3: Definir métricas con denominadores explícitos

- **Decision**: VPIP, PFR, 3-bet y win rate se devuelven como valor, numerador, denominador y suficiencia de muestra. Un denominador cero se representa como `null` con una limitación, nunca como 0%.
- **Rationale**: Permite auditar los cálculos y evita conclusiones engañosas en muestras pequeñas o contextos que no aplican.
- **Alternatives considered**: Devolver solo porcentajes redondeados. Se rechaza porque impide explicar muestras insuficientes y comparar resultados con cálculos independientes.

## Decision 4: Usar umbral conservador de muestra en el MVP

- **Decision**: El umbral predeterminado será de 30 observaciones para métricas de frecuencia; el contrato devolverá el umbral junto con cada métrica. El dashboard puede mostrar el valor descriptivo, pero debe marcarlo como insuficiente cuando el denominador sea menor.
- **Rationale**: Es un valor inicial comprensible y evita presentar una sola mano como una tendencia. Podrá parametrizarse posteriormente sin cambiar el contrato conceptual.
- **Alternatives considered**: Umbrales distintos por métrica desde la primera versión. Se pospone hasta tener datos reales de uso y validación estadística.

## Decision 5: Ganancia y EV serán datos analíticos opcionales del snapshot público

- **Decision**: El modelo de snapshot admitirá un bloque público de analytics con `netResult`, `evResult` y metadatos de cálculo por mano cuando el productor disponga de ellos. Si una mano no contiene esos valores, se excluye del denominador de esa métrica y se devuelve una limitación `DATA_UNAVAILABLE`.
- **Rationale**: El esquema actual no tiene columnas de beneficio ni EV, y no es válido reconstruirlos con el pot o el resultado textual. El contrato debe ser honesto con datos históricos que no pueden calcularse.
- **Alternatives considered**: Inferir ganancias desde `pot`, `result` o estados de acciones. Se rechaza porque no representa aportes, stacks, side pots ni EV de forma fiable.

## Decision 6: Endpoint único para dashboard y manos relacionadas

- **Decision**: Exponer `GET /api/hand-history/analytics` con filtros de fecha y modalidad, resumen, series de tendencia, métricas, desgloses, limitaciones y una lista acotada de manos relacionadas. La navegación a detalle/replay usará los endpoints existentes.
- **Rationale**: Mantiene una única definición de filtros y evita que el cliente combine respuestas con alcances distintos.
- **Alternatives considered**: Un endpoint por widget. Se rechaza para el MVP porque aumenta solicitudes, estados de carga y riesgo de inconsistencias entre tarjetas.

## Decision 7: Navegación al replay sin reconstrucción cliente

- **Decision**: Cada mano relacionada incluirá solo su identificador, fecha, modalidad, contribución visible y disponibilidad de replay. El cliente enlazará a detalle/replay; no recalculará métricas ni reconstruirá estados.
- **Rationale**: Respeta la separación entre backend autoritativo y presentación, y reutiliza Feature 010.
- **Alternatives considered**: Incluir snapshots completos dentro de analytics. Se rechaza por tamaño, duplicación y riesgo de filtrar información.

## Decision 8: Respuesta determinista y acotada

- **Decision**: Los resultados se ordenarán de forma estable por `endedAt` e `id`, tendrán límite para manos relacionadas y devolverán el alcance efectivo de filtros. El objetivo del primer estado visible será menor de 2 segundos para la consulta habitual definida en la especificación.
- **Rationale**: Hace reproducibles las pruebas y evita payloads sin límite.
- **Alternatives considered**: Devolver todas las manos relacionadas en una sola respuesta. Se rechaza por crecimiento de payload y coste de renderizado.
