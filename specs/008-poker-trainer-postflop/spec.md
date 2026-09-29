# Feature Specification: Poker Trainer postflop completo

**Feature Branch**: `008-poker-trainer-postflop`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "008 — Poker Trainer postflop: combinar flop, turn y river en un solo spec. Escenarios postflop, board visible, rangos y decisiones posteriores al preflop."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Practicar decisiones en el flop (Priority: P1)

Como jugador del Trainer, quiero recibir una situación de flop posterior a una secuencia preflop válida, ver el board y las acciones relevantes, y elegir una acción legal para practicar decisiones postflop contextualizadas.

**Why this priority**: El flop es el primer punto de decisión postflop y amplía el Trainer más allá de las situaciones preflop sin perder el flujo de aprendizaje existente.

**Independent Test**: Iniciar una sesión con un escenario determinista de flop, verificar que el board y el contexto sean coherentes, enviar cada acción legal y comprobar que solo se persiste una evaluación por escenario.

**Acceptance Scenarios**:

1. **Given** una mano preflop completada y un escenario de flop válido, **When** el jugador abre el escenario, **Then** ve únicamente sus cartas autorizadas, el board visible, posición, stacks, bote, acciones previas y acciones legales.
2. **Given** un escenario de flop con una acción pendiente, **When** el jugador envía una acción legal, **Then** recibe una evaluación contextual que considera el board, la acción previa y los parámetros del escenario.
3. **Given** una acción ilegal, un escenario ajeno o un escenario que ya fue resuelto, **When** el jugador intenta enviarla, **Then** el sistema la rechaza sin mutar la evaluación original.

### User Story 2 - Continuar por turn y river (Priority: P1)

Como jugador del Trainer, quiero avanzar desde el flop al turn y del turn al river solo después de completar la decisión actual, para practicar la evolución de la mano calle por calle.

**Why this priority**: Turn y river completan el flujo postflop y permiten estudiar cómo cambian la equity, los rangos y las decisiones cuando aparecen nuevas cartas.

**Independent Test**: Completar un escenario determinista de flop, avanzar al turn, completar la decisión, avanzar al river y verificar que cada escenario conserve su board, secuencia, resultado y contexto independiente.

**Acceptance Scenarios**:

1. **Given** una decisión de flop persistida, **When** el jugador solicita continuar, **Then** recibe un escenario de turn coherente con el board, las acciones y las cartas ya conocidas.
2. **Given** una decisión de turn persistida, **When** el jugador solicita continuar, **Then** recibe un escenario de river con una carta comunitaria válida y acciones legales recalculadas.
3. **Given** que falta la decisión de la calle actual, **When** el jugador solicita la siguiente calle, **Then** el sistema no avanza ni crea un escenario incompleto.
4. **Given** que una mano termina antes de river por fold o all-in, **When** el jugador continúa, **Then** el sistema muestra el resultado terminal y no inventa calles posteriores.

### User Story 3 - Entender equity, rangos y estrategia por calle (Priority: P1)

Como jugador, quiero ver por separado la equity, las restricciones de rangos, las frecuencias estratégicas y la recomendación contextual de cada calle, para entender por qué una acción es preferida sin confundir probabilidad con obligación.

**Why this priority**: La integración de 007 debe conservar la separación entre cálculo matemático y estrategia mientras el contexto cambia entre flop, turn y river.

**Independent Test**: Evaluar una acción con contexto válido en cada calle, con estrategia disponible, estrategia ausente y rangos parcialmente bloqueados; comprobar que cada respuesta separa resultados cuantitativos, recomendación y limitaciones.

**Acceptance Scenarios**:

1. **Given** un contexto con equity y estrategia disponibles, **When** se evalúa una acción postflop, **Then** el resultado identifica la calle, board, método, equity, versión estratégica, frecuencias y factores explicativos por separado.
2. **Given** un rango con combos bloqueados por las cartas visibles, **When** se calcula la evaluación, **Then** solo se consideran combos legales y se informa la limitación o peso restante cuando corresponda.
3. **Given** que no existe una fila estratégica compatible para la calle o contexto, **When** se evalúa una acción, **Then** la equity disponible puede mostrarse, pero la recomendación queda explícitamente como `UNAVAILABLE`.
4. **Given** una estrategia mixta, **When** el jugador elige una acción menos frecuente pero válida, **Then** recibe una clasificación proporcional a las frecuencias sin presentar una única acción como obligatoria.

### User Story 4 - Revisar explicaciones acumuladas (Priority: P2)

Como jugador, quiero revisar las decisiones de flop, turn y river dentro de la misma mano de entrenamiento, para relacionar mis acciones con los cambios del board, rangos y contexto.

**Why this priority**: La explicación acumulada convierte las calles separadas en una experiencia pedagógica continua sin anticipar el alcance del historial completo de manos de Feature 009.

**Independent Test**: Completar una secuencia de calles y volver a cargar la sesión; comprobar que cada resultado permanezca visible en orden y que no se filtren cartas privadas futuras ni datos de otros participantes.

**Acceptance Scenarios**:

1. **Given** una mano con decisiones completadas en varias calles, **When** el jugador vuelve a la sesión, **Then** puede consultar los resultados en orden de calle y secuencia.
2. **Given** una evaluación anterior guardada, **When** se publica una nueva versión estratégica, **Then** el resultado anterior conserva su versión, supuestos y cálculo originales.
3. **Given** un escenario con datos insuficientes para una evaluación exacta, **When** se muestra el resultado, **Then** la explicación identifica la limitación y no presenta una aproximación no declarada como certeza.

### Edge Cases

- El flop, turn o river contiene cartas duplicadas o incompatibles con las cartas privadas conocidas.
- La acción preflop termina la mano antes de crear una calle postflop.
- Un jugador queda all-in y no quedan decisiones posteriores para ese participante.
- La mano termina por fold en flop o turn.
- Un rango queda vacío después de aplicar blockers del board y cartas conocidas.
- La estrategia no contiene una fila compatible con calle, posición, número de jugadores, stack o acción previa.
- La petición de continuar se repite o llega de forma concurrente.
- Se reintenta una decisión con el mismo identificador después de que el resultado ya fue persistido.
- Se intenta acceder a un escenario o resultado de otra sesión.
- El cliente intenta enviar un board, rango, carta futura, equity o versión estratégica diferente de los derivados por el servidor.
- La vista se recarga durante una transición entre calles.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST generar escenarios postflop válidos para flop, turn y river a partir de una secuencia preflop coherente.
- **FR-002**: El sistema MUST derivar en el servidor el board, las cartas privadas autorizadas, las acciones previas, los stacks, el bote, la calle y las acciones legales.
- **FR-003**: El sistema MUST mostrar al jugador el board visible y el contexto necesario para tomar una decisión sin revelar el mazo, cartas futuras ni cartas privadas ajenas.
- **FR-004**: El sistema MUST validar cada acción contra la calle, el estado de la mano, el turno, el historial y los límites legales almacenados en el escenario.
- **FR-005**: El sistema MUST persistir como máximo una decisión efectiva por jugador y escenario, devolviendo el resultado original ante reintentos idempotentes.
- **FR-006**: El sistema MUST permitir avanzar de flop a turn y de turn a river solo después de persistir la decisión requerida de la calle actual.
- **FR-007**: El sistema MUST impedir la creación de calles posteriores cuando la mano termine por fold, all-in, showdown u otra condición terminal.
- **FR-008**: El sistema MUST recalcular las acciones legales y el contexto de evaluación después de cada carta comunitaria y acción válida.
- **FR-009**: El sistema MUST separar en la respuesta la equity, los rangos y blockers considerados, la recomendación estratégica, las frecuencias, los supuestos y las limitaciones.
- **FR-010**: El sistema MUST conservar el método, precisión, fingerprint, versión estratégica y contexto utilizado en cada evaluación postflop.
- **FR-011**: El sistema MUST declarar `UNAVAILABLE` cuando no exista una estrategia compatible con la calle o el contexto y no debe fabricar recomendaciones.
- **FR-012**: El sistema MUST tratar las estrategias mixtas como frecuencias explícitas y no como una única acción correcta.
- **FR-013**: El sistema MUST mantener inmutables las decisiones y evaluaciones de calles anteriores aunque se publiquen nuevas versiones estratégicas.
- **FR-014**: El sistema MUST permitir recuperar una sesión postflop y mostrar los resultados previos en orden de calle sin exponer información no autorizada.
- **FR-015**: El sistema MUST rechazar intentos de modificar desde el cliente el board, cartas privadas, rangos, equity, método, precisión, versión estratégica o resultado.
- **FR-016**: El sistema MUST proporcionar explicaciones que relacionen la evaluación con board, posición, stack efectivo, bote, acciones previas, rangos y calle.
- **FR-017**: El sistema MUST identificar explícitamente las limitaciones cuando una evaluación exacta no sea posible por falta de holdings, rangos o contexto suficiente.
- **FR-018**: El sistema MUST mantener fuera de esta feature los torneos, el historial general de manos, las estadísticas avanzadas, las partidas multijugador en vivo, el dinero real y la administración editorial completa de estrategias.

### Key Entities *(include if feature involves data)*

- **Postflop Training Scenario**: Situación de una mano en flop, turn o river con board, contexto derivado, acción pendiente, secuencia y estado terminal.
- **Street Decision**: Acción del jugador vinculada a una calle y escenario, con resultado, clasificación, explicación y referencia de idempotencia.
- **Visible Board State**: Cartas comunitarias legalmente visibles y calle actual, junto con las cartas conocidas que condicionan blockers y runouts.
- **Postflop Range Context**: Rangos y pesos aplicables a los participantes en una calle, con combos bloqueados y peso restante explícitos.
- **Evaluation Snapshot**: Copia inmutable del contexto, equity, estrategia, frecuencias, supuestos, limitaciones y fingerprint de una evaluación.
- **Postflop Training Sequence**: Orden de escenarios y decisiones de una misma mano de entrenamiento desde flop hasta river.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los escenarios válidos de prueba presenta una secuencia coherente de flop, turn y river, o un estado terminal explícito cuando la mano termina antes.
- **SC-002**: El 100% de las acciones ilegales, escenarios ajenos y payloads que intenten alterar datos derivados son rechazados sin modificar decisiones existentes.
- **SC-003**: Al menos el 95% de las evaluaciones postflop representativas se completa en menos de 2 segundos en el entorno de referencia definido para la feature.
- **SC-004**: El 100% de las evaluaciones postflop muestra por separado equity, estrategia, frecuencias, versión, supuestos y limitaciones, o marca cada elemento no disponible.
- **SC-005**: El 100% de los reintentos idempotentes devuelve el mismo resultado persistido y no crea decisiones duplicadas.
- **SC-006**: El 100% de las secuencias históricas de prueba conserva el orden de calles y los resultados originales después de publicar una nueva versión estratégica.
- **SC-007**: Al menos el 90% de los usuarios de prueba puede identificar qué parte del resultado corresponde a probabilidad, frecuencia estratégica y explicación contextual.
- **SC-008**: El 100% de las pruebas de privacidad no revela cartas futuras, mazo, cartas privadas ajenas ni valores estratégicos enviados por otro usuario.

## Assumptions

- Feature 006 proporciona autenticación, sesiones, decisiones preflop, continuidad e idempotencia que esta feature extenderá sin romper su contrato.
- Feature 007 proporciona equity exacta declarada, rangos ponderados, blockers, estrategias versionadas y snapshots inmutables.
- La primera versión postflop mantiene Texas Hold'em No-Limit con fichas virtuales y escenarios de entrenamiento, no partidas multijugador en vivo.
- El servidor sigue siendo la autoridad para generar cartas, board, rangos internos, acciones legales y resultados.
- Los escenarios se generan con datos suficientes para una evaluación exacta cuando el contexto lo permita; cualquier limitación se informa explícitamente.
- El alcance de esta feature incluye flop, turn y river en una sola secuencia, por lo que no se creará una Feature 009 separada.
- El historial general de manos y su revisión transversal pertenecen a Feature 010; esta feature solo conserva el contexto necesario para continuar y revisar la secuencia de entrenamiento actual.
- Los torneos, estadísticas avanzadas, seguridad operativa ampliada y pulido completo de UI quedan fuera de alcance y siguen el roadmap 010–013.
