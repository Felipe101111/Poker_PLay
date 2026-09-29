# Feature Specification: Historial general de manos

**Feature Branch**: `009-hand-history`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "009"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar mis manos (Priority: P1)

Como jugador autenticado, quiero consultar el historial de mis manos terminadas para revisar qué ocurrió y localizar una mano concreta sin depender de la sesión de juego original.

**Why this priority**: El historial propio es la base para aprender de resultados anteriores y da continuidad entre sesiones.

**Independent Test**: Crear varias manos terminadas del usuario, abrir el historial y verificar que aparecen ordenadas con sus datos públicos principales y que las manos de otros usuarios no aparecen.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con manos terminadas, **When** abre su historial, **Then** ve una lista paginada con fecha, modalidad, participantes autorizados, resultado y estado de cada mano.
2. **Given** un usuario sin manos terminadas, **When** consulta el historial, **Then** recibe un estado vacío claro sin error.
3. **Given** manos de varios usuarios, **When** un jugador consulta su historial, **Then** solo se muestran manos que le pertenecen o que está autorizado a consultar.

### User Story 2 - Filtrar y ordenar el historial (Priority: P1)

Como jugador, quiero filtrar y ordenar mis manos por periodo, modalidad, resultado y participantes para encontrar rápidamente las sesiones relevantes.

**Why this priority**: Un historial sin navegación útil pierde valor cuando crece el número de manos.

**Independent Test**: Consultar el historial con cada filtro permitido, combinarlos y comprobar que todos los resultados cumplen los criterios y conservan un orden determinista.

**Acceptance Scenarios**:

1. **Given** un historial con manos de distintas fechas y modalidades, **When** aplico filtros válidos, **Then** solo aparecen coincidencias.
2. **Given** una consulta con orden y paginación, **When** avanzo entre páginas, **Then** no se duplican ni se omiten registros dentro de la misma consulta.
3. **Given** parámetros inválidos o límites excesivos, **When** consulto el historial, **Then** la petición se rechaza con un mensaje accionable y no cambia ningún registro.

### User Story 3 - Revisar el detalle de una mano (Priority: P1)

Como jugador autorizado, quiero abrir el detalle de una mano y revisar su estado final, board, acciones, apuestas y resultado con la privacidad correspondiente.

**Why this priority**: El detalle convierte un registro resumido en información útil para analizar una decisión.

**Independent Test**: Abrir una mano terminada propia y comprobar que el detalle conserva la secuencia de acciones y muestra únicamente las cartas y datos permitidos por las reglas de visibilidad.

**Acceptance Scenarios**:

1. **Given** una mano propia terminada, **When** abro su detalle, **Then** veo el board final, las acciones ordenadas, los botes, el resultado y las cartas legítimamente reveladas.
2. **Given** una mano en curso o una mano sin autorización, **When** intento abrir su detalle histórico, **Then** el sistema rechaza el acceso o muestra solo la proyección autorizada.
3. **Given** una mano persistida con datos incompletos o de una versión anterior, **When** abro su detalle, **Then** el sistema identifica la información no disponible sin inventar valores.

### User Story 4 - Eliminar o conservar registros según la política (Priority: P2)

Como jugador, quiero conocer y ejercer la política de conservación de mi historial para mantener control sobre mis datos sin afectar la integridad de las manos compartidas.

**Why this priority**: El historial contiene actividad personal y debe tener reglas claras de retención y privacidad.

**Independent Test**: Solicitar una operación de conservación o eliminación permitida y comprobar que se aplica solo a los registros autorizados, manteniendo referencias necesarias para otros participantes.

**Acceptance Scenarios**:

1. **Given** una mano histórica propia elegible, **When** solicito su eliminación, **Then** deja de aparecer en mis consultas y los datos que deban conservarse quedan anonimizados o restringidos.
2. **Given** una mano cuya integridad o participación compartida impide su eliminación total, **When** solicito eliminarla, **Then** el sistema explica la limitación y aplica la alternativa permitida.

### Edge Cases

- El historial contiene miles de manos y la consulta debe seguir siendo navegable.
- Dos manos tienen la misma fecha y deben mantener un orden estable.
- Una mano termina por fold, all-in, showdown o abandono.
- La consulta combina filtros que no producen resultados.
- Se solicita una página fuera del rango disponible.
- Un usuario intenta enumerar IDs de manos ajenas.
- Una mano histórica pertenece a una modalidad que ya no está activa.
- Un participante abandona su cuenta después de una mano compartida.
- La misma consulta se repite mientras se registra una nueva mano terminada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a un usuario autenticado consultar sus manos históricas autorizadas.
- **FR-002**: El sistema MUST mostrar una lista resumida con fecha, modalidad, estado final, resultado y referencia estable de cada mano.
- **FR-003**: El sistema MUST devolver resultados paginados con límites explícitos y un orden determinista.
- **FR-004**: El sistema MUST permitir filtrar por periodo, modalidad, resultado y participante cuando esos datos estén disponibles.
- **FR-005**: El sistema MUST permitir ordenar por fecha y soportar una dirección de orden declarada.
- **FR-006**: El sistema MUST permitir abrir el detalle de una mano histórica autorizada.
- **FR-007**: El detalle MUST conservar board, acciones, apuestas, botes, posiciones y resultado final en el orden en que ocurrieron.
- **FR-008**: El sistema MUST aplicar la misma frontera de privacidad de las partidas al historial y no revelar cartas privadas no autorizadas, mazo ni datos internos.
- **FR-009**: El sistema MUST rechazar consultas y detalles de manos de otros usuarios cuando no exista autorización explícita.
- **FR-010**: El sistema MUST distinguir una mano terminada de una sesión en curso y no presentar una sesión activa como resultado histórico completo.
- **FR-011**: El sistema MUST devolver un estado vacío válido cuando no existan coincidencias.
- **FR-012**: El sistema MUST devolver errores claros para filtros inválidos, paginación inválida y referencias inexistentes.
- **FR-013**: El sistema MUST mantener la integridad y el orden de una mano histórica aunque se consulten simultáneamente varias páginas o detalles.
- **FR-014**: El sistema MUST definir una política de conservación y eliminación que respete las obligaciones de privacidad y las dependencias de participantes.
- **FR-015**: El sistema MUST evitar que los parámetros de consulta permitan enumerar o inferir datos de manos no autorizadas.
- **FR-016**: El sistema MUST dejar fuera de esta feature el replay paso a paso, analytics agregados, administración editorial y entrenamiento multijugador.

### Key Entities *(include if feature involves data)*

- **Hand History Record**: Registro inmutable o auditado de una mano terminada, con modalidad, participantes autorizados, tiempos, estado y resultado.
- **Hand Action Record**: Acción ordenada de una mano, vinculada a una calle, participante, importe y estado posterior permitido.
- **Hand History Query**: Criterios de filtrado, orden y paginación usados para consultar el historial.
- **History Access Policy**: Reglas que determinan qué datos puede consultar cada participante y cuándo pueden anonimizarse o eliminarse.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las manos terminadas de prueba aparece una sola vez en la consulta correspondiente y conserva un orden estable.
- **SC-002**: Al menos el 95% de las consultas habituales del historial devuelve la primera página en menos de 1 segundo en el entorno de referencia.
- **SC-003**: El 100% de las consultas con filtros válidos devuelve únicamente registros que cumplen todos los filtros aplicados.
- **SC-004**: El 100% de los intentos de acceso a manos no autorizadas es rechazado o reducido a una proyección autorizada sin filtrar existencia ni datos privados.
- **SC-005**: El 100% de los detalles de prueba conserva la secuencia completa de acciones y el resultado final sin reordenamientos.
- **SC-006**: Al menos el 90% de los usuarios de prueba puede localizar una mano objetivo usando filtros y orden sin asistencia.
- **SC-007**: El 100% de los casos de eliminación o anonimización de prueba respeta la política declarada y no rompe la integridad de los registros compartidos.

## Assumptions

- La autenticación, autorización básica y las partidas existentes se reutilizan.
- El historial inicial cubre manos terminadas de partidas virtuales y sesiones de entrenamiento que tengan un resultado persistible.
- Las manos en curso permanecen fuera del historial hasta alcanzar un estado terminal.
- La primera versión ofrece paginación y filtros básicos; replay y analytics se especifican por separado.
- Las cartas privadas solo se muestran cuando las reglas de la mano y la autorización del consultante lo permiten.
- La retención predeterminada conserva los registros necesarios para auditoría e integridad, mientras que los datos personales eliminables se anonimizan cuando corresponda.
