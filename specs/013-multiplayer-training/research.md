# Feature 013 Research: Entrenamiento multijugador

## Decision 1: Separar la sesión multijugador del TrainingSession individual

**Decision**: Crear una entidad de sesión específica para entrenamiento multijugador enlazada a `MultiplayerTable`. Enlazar cada participante de entrenamiento con su `TableParticipant` y crear decisiones específicas para acciones aceptadas de esa mano.

**Rationale**: El `TrainingSession` existente representa una sesión de un único usuario con escenarios ordenados y una relación `User -> TrainingSession`. Reutilizarlo directamente obligaría a cambiar invariantes del Trainer individual y mezclar sesiones de usuarios distintos. Una entidad separada preserva compatibilidad y mantiene la frontera entre simulación individual y mesa compartida.

**Alternatives considered**:

- Extender `TrainingSession` con varios usuarios: rechazado porque rompe la propiedad de usuario único y la semántica de escenarios.
- Guardar las decisiones solo en `TableAction`: rechazado porque no ofrece un límite privado para feedback, snapshots estratégicos ni evaluación por participante.
- Crear una aplicación o módulo de poker separado: rechazado porque duplica la autoridad del Poker Engine y la infraestructura de salas existente.

## Decision 2: Mantener MultiplayerTable y Poker Engine como autoridad de la mano

**Decision**: La sesión de entrenamiento se adhiere a una mesa ya iniciada; acciones, turnos, cartas, stacks, calles, botes y resultados continúan pasando por `multiplayerService.act()` y el Poker Engine. El entrenamiento solo captura contexto y feedback de acciones aceptadas.

**Rationale**: Feature 005 ya posee serialización transaccional, proyecciones privadas, reconexión, presencia y publicación de manos. Crear un segundo estado de partida produciría divergencia y violaría los principios de autoridad y separación de responsabilidades.

**Alternatives considered**:

- Crear un motor de entrenamiento paralelo: rechazado por duplicación de reglas y riesgo de resultados distintos.
- Permitir que el cliente envíe board, cartas o estrategia para evaluar: rechazado por seguridad y por la prohibición constitucional de confiar en el cliente.

## Decision 3: Capturar decisiones en la misma transición aceptada

**Decision**: Cuando un participante está inscrito en una sesión de entrenamiento, la aceptación de su acción crea exactamente una `MultiplayerTrainingDecision` en la misma transacción que `TableAction` y el nuevo snapshot de la mano. La decisión almacena lo que el participante podía conocer en ese momento; el resultado de evaluación y su snapshot son server-owned.

**Rationale**: La atomicidad evita decisiones sin acción o acciones sin contexto. La deduplicación por `tableActionId` y por `(handId, userId, requestId)` hace que reintentos de red no creen feedback duplicado.

**Alternatives considered**:

- Capturar decisiones en un proceso posterior al cierre de mano: rechazado para el feedback durante la sesión y porque puede perder el contexto exacto de decisión.
- Crear la decisión antes de aceptar la acción: rechazado porque una acción inválida no debe producir entrenamiento ni historial.

## Decision 4: Separar contexto visible de snapshot de evaluación

**Decision**: Cada decisión conserva `decisionContextSnapshot` con las cartas propias, board, apuestas, stacks y acciones públicas disponibles antes de actuar. El `EvaluationSnapshot` asociado conserva solo datos derivados server-side necesarios para explicar la evaluación y la versión estratégica utilizada; nunca contiene cartas privadas ajenas ni el mazo completo.

**Rationale**: La evaluación puede usar datos derivados que el jugador no podía inspeccionar directamente, pero la proyección nunca debe confundir conocimiento del evaluador con información visible del jugador. Esta separación permite auditar la decisión sin filtrar secretos.

**Alternatives considered**:

- Guardar el snapshot completo del motor dentro de la decisión: rechazado porque incluye mazo y cartas privadas ajenas.
- Recalcular el contexto histórico desde la mano actual: rechazado porque el estado posterior puede diferir y no preserva fielmente lo que se sabía al decidir.

## Decision 5: Evaluación síncrona y disponibilidad explícita

**Decision**: Tras validar y aplicar una acción, el servicio deriva la evaluación de forma determinista usando equity y la versión estratégica compatible. Si no hay estrategia o una dependencia de evaluación no está disponible, la decisión se conserva con estado `UNAVAILABLE`, limitación explícita y sin recomendación inventada.

**Rationale**: El contrato de la plataforma ya distingue equity, estrategia y disponibilidad. La evaluación inmediata simplifica la vista privada y evita un estado intermedio que el cliente tendría que reconciliar; la acción de poker no se deshace por falta de estrategia.

**Alternatives considered**:

- Bloquear la acción hasta disponer de una recomendación: rechazado porque la falta de estrategia no debe impedir jugar.
- Inventar una recomendación por heurística: rechazado por la constitución y el contrato de Trainer.
- Añadir un estado público `PENDING`: reservado para una futura evaluación asíncrona; no es necesario para el alcance inicial.

## Decision 6: Reutilizar historial, replay y analytics mediante publicación terminal idempotente

**Decision**: Al terminar la mano, el módulo multiplayer publica un `TerminalHandSnapshot` con `sourceType=MULTIPLAYER`; el registro de entrenamiento añade acceso privado a las decisiones, no modifica la proyección pública de historial/replay. La unicidad existente `(sourceType, sourceId)` es la barrera contra publicaciones duplicadas.

**Rationale**: Hand History ya conoce la privacidad por participante y los consumidores posteriores. Mantener el feedback de entrenamiento fuera de la proyección pública evita que replay o analytics filtren evaluación privada.

**Alternatives considered**:

- Crear un historial paralelo de entrenamiento: rechazado por duplicación y divergencia de políticas de privacidad.
- Incluir recomendaciones en cada evento público de replay: rechazado porque el feedback es por usuario.

## Decision 7: Reforzar invariantes heredadas antes de ampliar el flujo

**Decision**: El plan incluye pruebas y correcciones focalizadas para deduplicación por mano, coherencia entre `MultiplayerTable.stateVersion` y `MultiplayerHand.stateVersion`, reconexión de participantes eliminados y limpieza del enlace de mano actual cuando la mesa termina.

**Rationale**: Feature 013 añade decisiones y feedback sobre el camino crítico de acciones. Si el camino base permite duplicados, versiones divergentes o reconexiones indebidas, el entrenamiento conservaría datos incorrectos aunque su propia tabla fuera consistente.

**Alternatives considered**:

- Ignorar los invariantes existentes y probar solo la nueva tabla: rechazado porque no demuestra integridad end-to-end.
- Reescribir todo multiplayer: rechazado por alcance y por el principio de desarrollo incremental.
