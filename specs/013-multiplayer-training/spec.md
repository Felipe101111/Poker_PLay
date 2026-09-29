# Feature Specification: Entrenamiento multijugador

**Feature Branch**: `013-multiplayer-training`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "013" (interpretado según el roadmap existente como entrenamiento multijugador)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y unirse a una sesión de entrenamiento (Priority: P1)

Como jugador autenticado, quiero crear o unirme a una sesión de entrenamiento multijugador para practicar decisiones de poker con otras personas en una misma mano.

**Why this priority**: Sin una sesión compartida no existe el producto principal de esta feature. Debe reutilizar las salas y la identidad existentes sin convertir el entrenamiento en una partida por dinero real.

**Independent Test**: Crear una sesión con dos jugadores autenticados, unir ambos jugadores, iniciar una mano y comprobar que cada participante ve el mismo estado público con sus propios datos privados.

**Acceptance Scenarios**:

1. **Given** una sala de entrenamiento disponible y un jugador autenticado, **When** crea una sesión o se une a una sesión abierta, **Then** aparece como participante autorizado y recibe el estado público inicial.
2. **Given** una sesión que aún no cumple el mínimo de participantes, **When** un jugador intenta iniciar la mano, **Then** la operación se rechaza y la sesión permanece esperando.
3. **Given** una sesión iniciada, **When** un usuario que no pertenece a ella solicita el estado, **Then** recibe acceso denegado sin cartas privadas ni datos internos.
4. **Given** una sesión llena, **When** otro jugador intenta unirse, **Then** la solicitud se rechaza sin alterar los participantes actuales.

### User Story 2 - Jugar una mano con información privada correcta (Priority: P1)

Como participante de una sesión, quiero enviar mis acciones y recibir actualizaciones en tiempo real para tomar decisiones válidas sin conocer las cartas privadas de otros jugadores.

**Why this priority**: La práctica solo es válida si las reglas, turnos, apuestas y privacidad se comportan como en una mesa real, bajo autoridad del servidor.

**Independent Test**: Ejecutar una mano con acciones válidas e inválidas de varios jugadores, verificar turnos, progresión de calles, botes, showdown y proyecciones privadas desde cada sesión autenticada.

**Acceptance Scenarios**:

1. **Given** que es el turno de un jugador, **When** envía una acción legal, **Then** el servidor actualiza el estado y notifica a los participantes autorizados.
2. **Given** que no es el turno de un jugador, **When** envía una acción, **Then** la acción se rechaza sin modificar el estado de la mano.
3. **Given** una mano en progreso, **When** un jugador consulta el estado, **Then** ve sus cartas privadas, las cartas públicas permitidas y solo las acciones legales para su turno.
4. **Given** cartas privadas aún no reveladas, **When** otro participante consulta el estado, **Then** esas cartas permanecen ocultas.
5. **Given** que termina el showdown, **When** se proyecta el resultado, **Then** se revelan únicamente las cartas y resultados que las reglas permiten revelar.
6. **Given** una solicitud repetida con la misma identidad de operación, **When** llega nuevamente al servidor, **Then** no duplica la transición ni distribuye dos veces un bote.

### User Story 3 - Recibir evaluación estratégica individual (Priority: P2)

Como jugador, quiero revisar la evaluación de mis decisiones durante la mano para aprender sin exponer la evaluación privada de otros participantes.

**Why this priority**: El valor diferencial del modo entrenamiento es conectar una partida compartida con feedback estratégico, manteniendo separadas las experiencias privadas de aprendizaje.

**Independent Test**: Completar una mano con decisiones de dos jugadores, consultar la evaluación de cada uno y verificar que cada jugador solo ve sus decisiones, equity, disponibilidad estratégica y explicación autorizada.

**Acceptance Scenarios**:

1. **Given** una acción propia registrada en un contexto con estrategia publicada compatible, **When** el jugador consulta su feedback, **Then** recibe la evaluación basada en la versión estratégica usada por esa decisión.
2. **Given** un contexto sin estrategia compatible o sin datos suficientes, **When** se solicita feedback, **Then** se muestra disponibilidad explícita y no se inventa una recomendación.
3. **Given** que otro jugador tiene una evaluación distinta, **When** el jugador consulta su sesión, **Then** no puede leer cartas privadas, decisiones detalladas ni feedback privado del otro jugador.
4. **Given** que se publica una versión estratégica posterior, **When** se consulta una decisión ya registrada, **Then** conserva la versión y los datos estratégicos originales.

### User Story 4 - Recuperar y cerrar una sesión de forma segura (Priority: P2)

Como jugador, quiero reconectarme o abandonar una sesión sin perder la integridad de la mano ni dejar estados imposibles.

**Why this priority**: Las interrupciones de red son normales en una experiencia en tiempo real. La recuperación y el cierre correcto protegen tanto la partida como el historial de entrenamiento.

**Independent Test**: Interrumpir y restablecer la conexión de un participante, comprobar que recibe el estado más reciente, y finalizar la sesión por showdown, abandono o timeout con un resultado único.

**Acceptance Scenarios**:

1. **Given** una sesión activa y un jugador desconectado temporalmente, **When** vuelve a autenticarse y reconectarse, **Then** recibe el estado más reciente autorizado sin retroceder la mano.
2. **Given** que un jugador abandona o supera el tiempo permitido para actuar, **When** se aplica la política de ausencia, **Then** el servidor ejecuta una transición válida y notifica a los demás participantes.
3. **Given** una mano terminada, **When** un participante intenta enviar otra acción, **Then** la acción se rechaza y el resultado permanece inmutable.
4. **Given** una mano terminada, **When** se consulta el historial, replay o analytics autorizados, **Then** el registro se publica una sola vez con sus límites de privacidad.

## Edge Cases

- Un jugador intenta falsificar otro jugador, asiento, versión de estado o importe de acción.
- Dos acciones concurrentes llegan para el mismo turno; solo una transición válida puede confirmarse.
- El host abandona antes de iniciar o durante una mano.
- Un jugador desconectado vuelve después de que su turno haya expirado.
- La conexión se pierde durante el reparto, cambio de calle, showdown o publicación del resultado.
- Una sesión queda con un solo jugador antes de iniciar la mano.
- Un jugador intenta consultar cartas privadas, evaluaciones o decisiones de otro participante mediante identificadores alternativos.
- Una mano termina por fold, all-in, timeout o abandono y cada final debe producir un único resultado.
- El contexto no tiene estrategia publicada, la versión se retira durante una sesión o el dataset deja de ser compatible.
- Se intenta abrir una sesión o consultar una mano ya cerrada, inexistente o perteneciente a otro ámbito.
- Se repite una acción con la misma solicitud después de un timeout de red.
- Un cliente envía un estado antiguo después de haber recibido una actualización más reciente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a usuarios autenticados crear, descubrir y unirse a sesiones de entrenamiento multijugador dentro de los límites de capacidad definidos para la sesión.
- **FR-002**: El sistema MUST distinguir sesiones abiertas, iniciadas, pausadas por recuperación, terminadas y canceladas.
- **FR-003**: El sistema MUST permitir iniciar una sesión únicamente cuando se cumplan el mínimo de participantes, la preparación de la sala y las condiciones de juego definidas.
- **FR-004**: El sistema MUST usar el estado de la partida mantenido por el servidor como única autoridad para turnos, acciones legales, calles, cartas, apuestas, stacks, botes, showdown y resultados.
- **FR-005**: El sistema MUST validar autenticación, pertenencia a la sesión, asiento, turno, versión de estado, acción, importe y transición solicitada en cada operación.
- **FR-006**: El sistema MUST rechazar acciones inválidas sin modificar ningún estado persistido o visible de la mano.
- **FR-007**: El sistema MUST mantener ocultas las cartas privadas de otros participantes hasta que una regla legítima de showdown permita revelarlas.
- **FR-008**: El sistema MUST excluir del estado proyectado el mazo restante, snapshots internos, cartas privadas ajenas y cualquier campo no autorizado para el participante que consulta.
- **FR-009**: El sistema MUST entregar a cada participante únicamente sus acciones legales, su información privada y la información pública común autorizada.
- **FR-010**: El sistema MUST procesar acciones repetidas de forma idempotente y evitar transiciones duplicadas, dobles botes o resultados inconsistentes.
- **FR-011**: El sistema MUST resolver solicitudes concurrentes sobre el mismo turno de forma que como máximo una transición válida avance el estado.
- **FR-012**: El sistema MUST soportar reconexión autenticada y devolver el estado autorizado más reciente sin permitir retrocesos ni alterar la secuencia de la mano.
- **FR-013**: El sistema MUST aplicar una política explícita para abandono, desconexión prolongada y timeout de turno, incluyendo el resultado visible para los participantes restantes.
- **FR-014**: El sistema MUST registrar las acciones y decisiones de cada participante asociadas con la mano, el contexto, la secuencia y la identidad de quien actuó.
- **FR-015**: El sistema MUST calcular o consultar la evaluación individual de una decisión usando únicamente equity y estrategia disponibles para el contexto, sin fabricar consejos cuando falten datos.
- **FR-016**: El sistema MUST mantener separadas las evaluaciones privadas de los participantes y denegar el acceso cruzado no autorizado.
- **FR-017**: El sistema MUST conservar en cada evaluación la identidad exacta de la versión estratégica y los snapshots utilizados originalmente.
- **FR-018**: El sistema MUST mantener inmutables las decisiones, evaluaciones y resultados de una mano terminada.
- **FR-019**: El sistema MUST publicar una mano terminada en los consumidores autorizados de historial, replay y analytics como máximo una vez.
- **FR-020**: El sistema MUST conservar las limitaciones de disponibilidad y privacidad al consultar una mano desde historial, replay o analytics.
- **FR-021**: El sistema MUST impedir que el cliente establezca por sí mismo el ganador, cartas, stacks, botes, resultado, evaluación, usuario actuante o versión estratégica.
- **FR-022**: El sistema MUST impedir que usuarios no pertenecientes a una sesión descubran o infieran su información privada mediante errores, identificadores o respuestas parciales.
- **FR-023**: El sistema MUST aplicar límites de capacidad, frecuencia y tamaño de mensajes para evitar que una sesión degrade a otros participantes.
- **FR-024**: El sistema MUST permitir que un participante abandone una sesión y que la sesión se cierre o continúe conforme a una política visible y determinista.
- **FR-025**: El sistema MUST mantener fuera de esta feature el dinero real, los torneos, el matchmaking avanzado, el chat, las nuevas reglas de poker y la edición de evaluaciones históricas.

### Key Entities *(include if feature involves data)*

- **Training Session**: Sesión compartida de entrenamiento con estado, capacidad, participantes, reglas, timestamps y resultado de cierre.
- **Training Participant**: Relación entre usuario y sesión, con asiento, estado de conexión, permisos de consulta y estado de abandono.
- **Training Hand**: Mano jugada dentro de una sesión, con estado secuencial, estado público, resultado y referencias a su historial.
- **Participant Projection**: Vista autorizada del estado para un participante, que combina información pública con sus cartas y acciones legales.
- **Training Decision**: Acción de un participante asociada a un contexto, posición en la secuencia, estado de la mano y resultado de evaluación.
- **Evaluation Snapshot**: Copia inmutable de la equity, estrategia, disponibilidad, versión y datos usados para evaluar una decisión.
- **Connection and Turn Event**: Registro ordenado de reconexiones, expiraciones, abandonos y transiciones relevantes para recuperar la sesión y explicar su cierre.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las acciones inválidas, fuera de turno o con estado obsoleto de las pruebas se rechaza sin cambiar la mano.
- **SC-002**: En el 100% de las pruebas de privacidad, un participante no puede obtener cartas privadas, evaluaciones ni decisiones de otro participante antes de una revelación autorizada.
- **SC-003**: El 100% de las manos de prueba produce una única secuencia de resultado, incluso con reintentos y solicitudes concurrentes.
- **SC-004**: Al menos el 99% de las reconexiones de prueba devuelve al jugador el estado autorizado más reciente sin pérdida ni retroceso de transiciones.
- **SC-005**: El 100% de las decisiones con estrategia disponible conserva la versión estratégica y los datos usados originalmente después de publicar, reemplazar o retirar versiones posteriores.
- **SC-006**: El 100% de los contextos sin estrategia compatible devuelve una limitación explícita y ninguna recomendación inventada.
- **SC-007**: Al menos el 95% de las actualizaciones de estado de una sesión activa llega a los participantes autorizados en menos de 1 segundo en condiciones normales de red.
- **SC-008**: Al menos el 95% de los usuarios de prueba puede completar una sesión de dos jugadores, revisar su propio feedback y distinguir su información privada de la pública sin asistencia.
- **SC-009**: El 100% de las manos terminadas de prueba aparece una sola vez en historial, replay y analytics cuando el usuario está autorizado.
- **SC-010**: Las pruebas de carga mantienen sesiones de entrenamiento de hasta 1.000 participantes concurrentes distribuidos en sesiones sin exponer datos privados entre sesiones.

## Assumptions

- Los usuarios ya disponen de autenticación, amistad, salas y presencia del producto existente.
- Las sesiones iniciales usan partidas de Texas Hold'em No-Limit con fichas virtuales y el Poker Engine existente.
- La capacidad inicial por mesa es de 2 a 6 participantes; no se incluyen torneos ni mesas de más jugadores en esta versión.
- La comunicación en tiempo real existente se reutiliza para actualizaciones, pero todas las transiciones importantes siguen confirmándose mediante autoridad del servidor.
- Equity, estrategia publicada, historial, replay y analytics existentes conservan sus contratos y se amplían solo para aceptar el origen de entrenamiento multijugador.
- Una sesión utiliza un único conjunto de reglas y contexto de entrenamiento durante una mano; cambiar de formato requiere iniciar otra sesión.
- Las evaluaciones visibles para un participante se limitan a sus propias decisiones, salvo que una futura función de revisión grupal autorice otra cosa.
- La persistencia de una mano terminada puede ser consultada por los módulos existentes solo después de que la sesión confirme un resultado terminal.
- Las políticas de timeout, abandono y cierre se documentarán para los participantes y serán deterministas.
- La privacidad de cartas, decisiones y feedback tiene prioridad sobre la comodidad de depuración o la exposición de datos internos.
