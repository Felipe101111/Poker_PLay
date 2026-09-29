# Feature Specification: Analytics de rendimiento de poker

**Feature Branch**: `011-analytics-dashboard`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Feature 011: dashboard personal de rendimiento con gráficas de ganancias y EV, métricas VPIP, PFR, 3-bet y win rate, desglose por posición y calle, filtros por fecha y modalidad, acceso a manos y replays relacionados, y mensajes de muestra insuficiente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el rendimiento general (Priority: P1)

Como jugador autenticado, quiero consultar un resumen de mi rendimiento para entender rápidamente cómo estoy jugando y cómo evolucionan mis resultados.

**Why this priority**: El resumen es la entrada principal al analytics y permite detectar tendencias sin revisar cada mano individualmente.

**Independent Test**: Con un conjunto de manos terminadas, abrir el dashboard y comprobar que muestra las métricas generales, la evolución de ganancias y la diferencia entre resultado real y EV.

**Acceptance Scenarios**:

1. **Given** un jugador con manos terminadas, **When** abre analytics, **Then** ve manos jugadas, ganancias o pérdidas, win rate, ROI y EV con un período claramente identificado.
2. **Given** un jugador sin manos en el período seleccionado, **When** abre analytics, **Then** ve un estado vacío explicativo y no se muestran métricas inventadas.
3. **Given** un jugador con resultados en varios períodos, **When** consulta la gráfica de evolución, **Then** puede distinguir ganancias reales de EV sin ambigüedad.

### User Story 2 - Analizar patrones de decisión (Priority: P1)

Como jugador, quiero revisar mis métricas VPIP, PFR, 3-bet y win rate por posición y calle para identificar patrones que debo mejorar.

**Why this priority**: Las métricas agregadas convierten el historial de manos en información accionable sobre decisiones preflop y postflop.

**Independent Test**: Consultar un período con datos suficientes y verificar que las métricas se desglosan por posición y calle, conservando denominadores y cantidades de muestra.

**Acceptance Scenarios**:

1. **Given** datos suficientes para varias posiciones, **When** el jugador abre el desglose por posición, **Then** ve las métricas de cada posición y el volumen usado para calcularlas.
2. **Given** datos disponibles en preflop, flop, turn y river, **When** el jugador cambia de calle, **Then** ve únicamente las métricas correspondientes a esa calle.
3. **Given** una posición o calle con pocos casos, **When** el jugador la consulta, **Then** el dashboard marca la muestra como insuficiente y evita presentar una conclusión fuerte.

### User Story 3 - Filtrar y comparar períodos (Priority: P1)

Como jugador, quiero filtrar analytics por fecha y modalidad para comparar contextos de juego concretos.

**Why this priority**: Separar sesiones, formatos y períodos evita mezclar muestras distintas y mejora la utilidad de las conclusiones.

**Independent Test**: Aplicar filtros de fecha y modalidad, comprobar que todas las métricas, gráficas y listas relacionadas se actualizan al mismo alcance.

**Acceptance Scenarios**:

1. **Given** manos de varias fechas y modalidades, **When** el jugador selecciona un rango de fechas y una modalidad, **Then** todas las métricas reflejan únicamente ese subconjunto.
2. **Given** filtros activos, **When** el jugador los elimina, **Then** el dashboard vuelve al período y modalidad predeterminados sin conservar resultados antiguos.
3. **Given** un rango de fechas inválido o una combinación sin resultados, **When** el jugador aplica el filtro, **Then** recibe una validación clara o un estado vacío accionable.

### User Story 4 - Investigar manos relacionadas (Priority: P2)

Como jugador, quiero llegar desde una métrica a las manos que la originaron y abrir su replay para estudiar decisiones concretas.

**Why this priority**: El analytics es más útil cuando permite pasar de una señal agregada a la evidencia histórica que la explica.

**Independent Test**: Seleccionar una métrica o fila del desglose y comprobar que la lista de manos relacionadas respeta los filtros y permite abrir el detalle o replay autorizado.

**Acceptance Scenarios**:

1. **Given** una métrica calculada sobre manos visibles, **When** el jugador solicita sus manos relacionadas, **Then** ve solo manos que contribuyen a esa métrica y al alcance filtrado.
2. **Given** una mano relacionada con replay disponible, **When** el jugador la abre, **Then** navega al detalle o replay sin perder el contexto del analytics.
3. **Given** una mano sin datos suficientes para una métrica, **When** el jugador la revisa, **Then** el dashboard no la presenta como evidencia completa y explica la limitación.

### Edge Cases

- El jugador tiene cero manos, una sola mano o una muestra inferior al mínimo definido para una métrica.
- Una mano histórica está incompleta, anonimizada o no tiene replay disponible.
- Existen acciones con datos insuficientes para calcular EV o una métrica por calle.
- El rango de fechas cruza meses, años o una zona horaria distinta.
- Una modalidad antigua ya no está activa, pero sus manos históricas siguen siendo visibles.
- El jugador cambia filtros mientras se están cargando resultados.
- Una métrica tiene denominador cero, por ejemplo, ningún enfrentamiento a 3-bet.
- El usuario intenta consultar analytics sin autenticarse o acceder a datos de otro jugador.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a un jugador autenticado consultar analytics únicamente sobre sus manos históricas autorizadas.
- **FR-002**: El dashboard MUST mostrar el período y la modalidad a los que corresponden sus métricas.
- **FR-003**: El sistema MUST mostrar como mínimo manos jugadas, ganancias o pérdidas, win rate, ROI y EV cuando existan datos suficientes.
- **FR-004**: El dashboard MUST representar la evolución de ganancias reales y EV de forma diferenciable y comprensible.
- **FR-005**: El sistema MUST calcular y mostrar VPIP, PFR, 3-bet y win rate con su volumen o denominador correspondiente.
- **FR-006**: El jugador MUST poder consultar las métricas desglosadas por posición.
- **FR-007**: El jugador MUST poder consultar las métricas desglosadas por calle: preflop, flop, turn y river, cuando existan datos aplicables.
- **FR-008**: El jugador MUST poder filtrar analytics por rango de fechas y modalidad.
- **FR-009**: Al aplicar filtros, el sistema MUST actualizar de forma coherente el resumen, las gráficas, los desgloses y las manos relacionadas.
- **FR-010**: El sistema MUST indicar cuándo una métrica tiene una muestra insuficiente y MUST evitar presentarla como una conclusión fiable.
- **FR-011**: El sistema MUST representar explícitamente estados vacíos, denominadores cero y datos no disponibles sin sustituirlos por ceros engañosos.
- **FR-012**: El jugador MUST poder consultar las manos que contribuyen a una métrica o desglose visible.
- **FR-013**: El jugador MUST poder abrir el detalle o replay de una mano relacionada cuando tenga autorización y el recurso esté disponible.
- **FR-014**: El sistema MUST aplicar las reglas de privacidad del historial y no revelar cartas privadas, identidades anonimizadas ni datos de otros jugadores.
- **FR-015**: El sistema MUST conservar los filtros o comunicar claramente su restablecimiento al navegar entre analytics, detalle y replay.
- **FR-016**: El sistema MUST rechazar consultas no autenticadas y no permitir inferir métricas o existencia de datos de otro usuario.
- **FR-017**: El sistema MUST mantener fuera de esta feature la edición de manos, las recomendaciones estratégicas automáticas, los análisis de manos de otros usuarios y el entrenamiento multijugador.

### Key Entities *(include if feature involves data)*

- **Analytics View**: Consulta personal de métricas para un período, modalidad y alcance de datos determinados.
- **Performance Summary**: Conjunto de resultados generales, incluyendo volumen, ganancias, win rate, ROI y EV.
- **Decision Metric**: Métrica de comportamiento como VPIP, PFR o 3-bet, con su valor, denominador y nivel de suficiencia.
- **Position/Street Breakdown**: Desglose de métricas por posición y calle de la mano.
- **Analytics Filter**: Rango de fechas y modalidad usados para limitar la consulta.
- **Related Hand**: Mano histórica visible que contribuye a una métrica y puede enlazar a detalle o replay.
- **Sample Limitation**: Estado que explica que una métrica no tiene suficientes observaciones o datos válidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al menos el 95% de los jugadores de prueba con datos válidos puede identificar sus ganancias, EV y período consultado en menos de 30 segundos.
- **SC-002**: El 100% de las métricas de prueba coincide con un cálculo independiente sobre el mismo conjunto filtrado de manos.
- **SC-003**: El 100% de las vistas con muestra insuficiente, denominador cero o datos no disponibles muestra una explicación explícita y no un valor engañoso.
- **SC-004**: Al menos el 95% de las consultas habituales muestra el resumen inicial en menos de 2 segundos en el entorno de referencia.
- **SC-005**: El 90% de los jugadores de prueba puede aplicar un filtro de fecha y modalidad y reconocer que todas las secciones reflejan ese filtro.
- **SC-006**: Al menos el 90% de los jugadores de prueba puede llegar desde una métrica a una mano relacionada o a su replay en menos de tres interacciones.
- **SC-007**: El 100% de las pruebas de privacidad evita mostrar métricas, cartas, identidades o manos pertenecientes exclusivamente a otro usuario.
- **SC-008**: El 100% de las consultas sin resultados presenta un estado vacío accionable y permite modificar o limpiar los filtros.

## Assumptions

- Las manos terminales de Feature 009 son la fuente histórica disponible para analytics.
- Las métricas se calculan únicamente sobre datos visibles y válidos para el jugador autenticado.
- La primera versión ofrece un dashboard personal; no incluye comparaciones públicas ni rankings entre jugadores.
- El sistema define un umbral de muestra suficiente por métrica y lo comunica junto con el resultado.
- Las ganancias y el EV se expresan en fichas virtuales y respetan la modalidad seleccionada.
- Los replays de Feature 010 se reutilizan cuando una mano relacionada tiene replay disponible.
- El período predeterminado será el último período con actividad del jugador, con una opción clara para cambiarlo.
- Las métricas históricas no se recalculan a partir de información privada que el jugador no podría ver en el historial.
