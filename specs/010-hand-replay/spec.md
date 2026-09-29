# Feature Specification: Replay de manos

**Feature Branch**: `010-hand-replay`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "010"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reproducir una mano terminada (Priority: P1)

Como jugador autorizado, quiero reproducir una mano terminada paso a paso para entender cómo evolucionó la acción desde el inicio hasta el resultado final.

**Why this priority**: La reproducción convierte el historial estático en una herramienta de revisión y aprendizaje sin permitir alterar los hechos de la partida.

**Independent Test**: Seleccionar una mano terminada autorizada, iniciar la reproducción y avanzar por cada evento hasta comprobar que se muestran el estado inicial, las acciones y el resultado en el orden correcto.

**Acceptance Scenarios**:

1. **Given** una mano terminada autorizada con acciones ordenadas, **When** el jugador inicia el replay, **Then** ve el estado inicial y puede avanzar al siguiente momento sin saltarse el orden de la mano.
2. **Given** el replay detenido en cualquier acción, **When** el jugador avanza, **Then** el estado visible cambia únicamente al estado posterior de esa acción.
3. **Given** el replay alcanza el final, **When** el jugador continúa avanzando, **Then** permanece en el estado terminal y se muestra claramente que no quedan eventos.

### User Story 2 - Controlar la navegación temporal (Priority: P1)

Como jugador, quiero pausar, reanudar, retroceder y saltar a una acción concreta para revisar momentos relevantes de una mano sin repetir todo el recorrido.

**Why this priority**: La navegación flexible permite analizar decisiones concretas y hace que el replay sea útil tanto para una revisión rápida como para un estudio detallado.

**Independent Test**: Reproducir una mano y verificar que pausa, reanudación, retroceso, avance y selección de una acción producen exactamente el estado correspondiente de la secuencia.

**Acceptance Scenarios**:

1. **Given** un replay en reproducción, **When** el jugador pausa, **Then** el estado queda congelado hasta que solicite otra navegación.
2. **Given** un replay detenido en una acción posterior, **When** el jugador retrocede, **Then** vuelve al estado inmediatamente anterior sin cambiar los datos históricos.
3. **Given** una lista de acciones disponible, **When** el jugador selecciona una acción concreta, **Then** el replay muestra el estado de esa posición y actualiza el indicador de progreso.

### User Story 3 - Ver información según autorización (Priority: P1)

Como jugador o espectador autorizado, quiero que el replay respete las mismas reglas de privacidad de la mano original para analizarla sin revelar cartas o identidades que no puedo ver.

**Why this priority**: Una herramienta de revisión no puede convertirse en un canal para descubrir información privada de otros participantes.

**Independent Test**: Abrir la misma mano con perfiles de autorización distintos y comprobar que cada replay contiene solo cartas, nombres y metadatos permitidos para ese perfil.

**Acceptance Scenarios**:

1. **Given** una mano con cartas privadas no reveladas, **When** un usuario sin permiso reproduce la mano, **Then** esas cartas no aparecen en ningún momento del replay.
2. **Given** una mano compartida con participantes anonimizados, **When** un participante reproduce la mano, **Then** ve las etiquetas y limitaciones de privacidad aplicables sin recuperar la identidad eliminada.
3. **Given** un identificador de una mano no autorizada, **When** el usuario intenta iniciar el replay, **Then** recibe el mismo resultado de inexistencia que para una referencia no válida y no puede inferir que el registro existe.

### User Story 4 - Gestionar datos históricos incompletos (Priority: P2)

Como jugador, quiero entender cuándo una mano antigua no contiene suficiente información para reproducirse completamente, sin que el sistema invente estados o acciones.

**Why this priority**: Los registros históricos pueden proceder de versiones anteriores o de políticas de privacidad diferentes; comunicar sus límites evita conclusiones falsas.

**Independent Test**: Abrir una mano con eventos faltantes o datos anonimizados y comprobar que el replay indica la limitación, conserva el orden disponible y no fabrica valores.

**Acceptance Scenarios**:

1. **Given** una mano con una brecha histórica identificada, **When** el replay llega a esa posición, **Then** muestra la limitación y no presenta un estado posterior como si fuera exacto.
2. **Given** una mano con datos suficientes solo hasta su resultado terminal, **When** el jugador alcanza el último evento disponible, **Then** el replay termina con la información disponible y explica qué no puede reconstruirse.

### Edge Cases

- Una mano tiene cero acciones visibles para el espectador, pero conserva un resumen terminal autorizado.
- Una mano termina por fold, all-in, showdown o abandono y cada final debe ser reproducible sin asumir showdown.
- Dos acciones tienen el mismo instante registrado; el orden de secuencia debe prevalecer.
- El jugador intenta avanzar antes del inicio, retroceder después del inicio o saltar fuera del rango.
- El jugador abandona y vuelve a abrir el replay mientras estaba pausado.
- La mano fue anonimizada después de su publicación y cambió la visibilidad de un participante.
- El origen de la mano ya no está activo, pero el registro histórico sigue siendo válido.
- Una petición de replay llega para una mano todavía activa o para un registro parcialmente publicado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir iniciar un replay únicamente para una mano histórica terminal y autorizada.
- **FR-002**: El replay MUST presentar un estado inicial, una secuencia ordenada de eventos y un estado terminal cuando esos datos estén disponibles.
- **FR-003**: El usuario MUST poder avanzar y retroceder una posición a la vez sin modificar el registro histórico.
- **FR-004**: El usuario MUST poder pausar y reanudar la reproducción automática de la secuencia.
- **FR-005**: El usuario MUST poder seleccionar una posición visible de la secuencia y recibir el estado correspondiente a esa posición.
- **FR-006**: El replay MUST indicar la posición actual, el total de posiciones disponibles y si existen eventos pendientes.
- **FR-007**: El sistema MUST conservar el orden histórico de acciones incluso cuando varias acciones compartan la misma marca temporal.
- **FR-008**: El sistema MUST aplicar en cada posición la autorización y redacción correspondiente al usuario que consulta el replay.
- **FR-009**: El replay MUST omitir cartas privadas, identidades, mazo y metadatos que el usuario no esté autorizado a ver.
- **FR-010**: El sistema MUST impedir que una mano no autorizada, inexistente, activa o incompletamente publicada se presente como replay válido.
- **FR-011**: El sistema MUST comunicar de forma visible las limitaciones, brechas o campos no disponibles de un registro histórico.
- **FR-012**: El sistema MUST mantener idénticos los hechos históricos al repetir, pausar, retroceder o volver a abrir el replay.
- **FR-013**: El sistema MUST devolver un estado vacío o una explicación accionable cuando no existan eventos visibles para el usuario.
- **FR-014**: El sistema MUST tratar las solicitudes repetidas de apertura del mismo replay como lecturas y no crear copias ni acciones nuevas.
- **FR-015**: El sistema MUST dejar fuera de esta feature la edición de manos, la generación de análisis agregados, la administración editorial y el entrenamiento multijugador.

### Key Entities *(include if feature involves data)*

- **Replay Session**: Vista temporal de una mano histórica para un usuario autorizado; contiene la posición actual, el modo de reproducción y las limitaciones visibles, pero no cambia la mano.
- **Replay Event**: Proyección autorizada de una acción o transición histórica en una posición estable de la secuencia.
- **Replay View Policy**: Reglas que determinan qué datos puede ver el usuario en cada estado del replay.
- **Replay Limitation**: Explicación de una brecha, anonimización o dato no disponible que impide una reconstrucción completa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los replays de prueba autorizados presenta sus eventos visibles exactamente en el orden histórico publicado.
- **SC-002**: El 100% de las operaciones de avance, retroceso y salto de prueba termina en la posición solicitada o en el límite válido más cercano, sin modificar la mano.
- **SC-003**: El 100% de las vistas de replay de prueba respeta la redacción de cartas, identidades y metadatos definida para el perfil consultante.
- **SC-004**: Al menos el 95% de los replays habituales muestra el primer estado visible en menos de 1 segundo en el entorno de referencia.
- **SC-005**: Al menos el 90% de los usuarios de prueba puede localizar y revisar una acción objetivo sin asistencia.
- **SC-006**: El 100% de las manos con datos incompletos de prueba muestra una limitación explícita y no inventa eventos o estados.
- **SC-007**: El 100% de los intentos de reproducir manos no autorizadas, activas o inexistentes evita revelar su existencia o información privada.

## Assumptions

- La autenticación, autorización y consulta de historial de Feature 009 están disponibles y siguen siendo la fuente de acceso a manos.
- El replay inicial cubre manos virtuales terminales con acciones históricas publicadas; no reconstruye sesiones activas.
- La secuencia histórica es inmutable y cualquier corrección de privacidad se aplica como redacción de la vista, no como alteración de los hechos.
- La reproducción automática usa una velocidad predeterminada comprensible y permite control manual; no se requiere edición de velocidad avanzada en la primera versión.
- Un registro antiguo puede ofrecer un replay parcial siempre que comunique sus limitaciones con claridad.
- Analytics, administración editorial y entrenamiento multijugador se especificarán en Features 011, 012 y 013 respectivamente.