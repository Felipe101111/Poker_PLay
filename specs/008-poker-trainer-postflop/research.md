# Research: Poker Trainer postflop completo

## Decision 1: Extender el Poker Engine existente para avanzar calles

- **Decision**: Los escenarios de flop, turn y river se construirán a partir de `HandState`, `submitAction` y las transiciones de calle ya existentes. La generación postflop reproducirá acciones previas deterministas y conservará el snapshot resultante.
- **Rationale**: El engine ya conoce blinds, turnos, apuestas, board, all-in, fold, showdown y estados terminales. Reimplementarlos en Trainer duplicaría reglas y violaría la autoridad del dominio.
- **Alternatives considered**: Crear un generador postflop independiente fue rechazado porque permitiría estados que el engine real no aceptaría.

## Decision 2: Mantener una sola secuencia de entrenamiento para flop, turn y river

- **Decision**: Una sesión postflop tendrá escenarios ordenados por `sequence`; cada decisión completada habilita la siguiente calle o el siguiente punto de decisión. No se crea una Feature 009 separada.
- **Rationale**: Permite recuperar la progresión completa y conservar resultados por calle sin mezclarla con el historial general de manos de Feature 010.
- **Alternatives considered**: Tres sesiones independientes por calle fueron rechazadas porque rompen continuidad y dificultan la explicación acumulada.

## Decision 3: El servidor deriva todos los datos sensibles y legales

- **Decision**: El cliente solo envía la intención de acción y el identificador de escenario/request. El servidor deriva board, cartas privadas autorizadas, rangos internos, street, equity, estrategia, acciones legales y estado terminal.
- **Rationale**: Cumple la constitución de autoridad del servidor y evita que el jugador fabrique una situación favorable o revele información privada.
- **Alternatives considered**: Aceptar board, rangos o estrategia desde el cliente fue rechazado por riesgo de manipulación y fuga de información.

## Decision 4: Estrategia postflop versionada por calle y contexto

- **Decision**: Las filas estratégicas se resuelven usando una clave que incluye formato, street, posición, número de jugadores, tamaño de stack y contexto de acciones. La ausencia de una fila produce `UNAVAILABLE`.
- **Rationale**: Evita aplicar recomendaciones preflop a calles posteriores y conserva el comportamiento explícito de 007 cuando faltan datos.
- **Alternatives considered**: Heredar automáticamente la fila de otra calle fue rechazado porque produciría recomendaciones no respaldadas.

## Decision 5: Persistir snapshots inmutables junto con la decisión

- **Decision**: Cada decisión postflop conserva el contexto, equity, blockers, fingerprint, versión estratégica, fila, frecuencias, clasificación y limitaciones usadas en el momento de evaluación.
- **Rationale**: Una nueva publicación estratégica no debe cambiar resultados históricos y la revisión por calle necesita reproducibilidad.
- **Alternatives considered**: Resolver siempre contra la versión vigente fue rechazado por no ser auditable.

## Decision 6: Final de mano explícito

- **Decision**: Fold, all-in, showdown y estados completos se representan como terminales. No se crea una calle posterior cuando el engine ya no permite decisiones.
- **Rationale**: Evita inventar turn/river y permite explicar por qué una secuencia terminó antes.
- **Alternatives considered**: Completar siempre hasta river fue rechazado porque contradice la acción y el resultado real de la mano.

## Decision 7: Rendimiento y exactitud

- **Decision**: Equity postflop seguirá declarando método `EXACT` y precision. Se medirán p50/p95 con boards de flop, turn y river; escenarios multiway sin holdings suficientes conservarán una limitación explícita.
- **Rationale**: La constitución prohíbe ocultar aproximaciones y 007 ya define la metadata de cálculo.
- **Alternatives considered**: Introducir aproximación silenciosa fue rechazado; cualquier nuevo método requiere contrato y decisión posterior.
