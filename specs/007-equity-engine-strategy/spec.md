# Feature Specification: Equity Engine y estrategia versionada

**Feature Branch**: `007-equity-engine-strategy`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "007 — Equity Engine y estrategia versionada. Separar formalmente equity, rangos, probabilidades y datos estratégicos. Esto prepara al Trainer para evaluaciones más rigurosas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calcular equity de manos y rangos (Priority: P1)

Como componente de análisis de póker, necesito calcular equity de una mano contra otra mano o contra un rango bajo un estado de juego definido, para que las decisiones estratégicas puedan apoyarse en probabilidades reproducibles.

**Why this priority**: La equity es la base cuantitativa que permite mejorar las evaluaciones del Trainer sin mezclar cálculos matemáticos con recomendaciones estratégicas.

**Independent Test**: Proporcionar estados deterministas con manos, rangos y cartas conocidas, y verificar que las equity, probabilidades y resultados agregados sean válidos, reproducibles y estén dentro de sus límites matemáticos.

**Acceptance Scenarios**:

1. **Given** two manos válidas y un estado de cartas conocido, **When** se calcula la equity, **Then** el resultado contiene una probabilidad válida para cada participante y la suma de las probabilidades de resultado es 100% salvo el porcentaje explícitamente atribuido a empate.
2. **Given** una mano contra un rango válido, **When** se calcula la equity, **Then** el resultado refleja todos los combos válidos del rango y excluye combinaciones incompatibles con las cartas conocidas.
3. **Given** las mismas entradas y la misma configuración de cálculo, **When** se solicita el cálculo más de una vez, **Then** el resultado es reproducible dentro de la precisión declarada.
4. **Given** cartas duplicadas, rangos inválidos o una configuración imposible, **When** se solicita un cálculo, **Then** el sistema rechaza la entrada con un error claro y no produce una recomendación estratégica.

### User Story 2 - Representar y validar rangos (Priority: P1)

Como analista de póker, necesito representar rangos de manos con combos, pesos y restricciones de cartas, para que los cálculos de equity y las estrategias utilicen el mismo significado de rango en todos los contextos.

**Why this priority**: Sin una representación consistente, dos evaluaciones pueden interpretar el mismo rango de manera diferente y producir resultados que no pueden compararse.

**Independent Test**: Crear rangos con manos específicas, categorías de manos y pesos; verificar expansión de combos, normalización, eliminación de combos bloqueados y rechazo de pesos o notación inválidos.

**Acceptance Scenarios**:

1. **Given** un rango con manos y frecuencias válidas, **When** se expande a combos, **Then** cada combo conserva su peso y el conjunto total puede ser usado por el cálculo de equity.
2. **Given** cartas conocidas que bloquean algunos combos, **When** se filtra el rango, **Then** los combos incompatibles se eliminan sin modificar indebidamente los restantes.
3. **Given** un rango con pesos que no suman 100%, **When** se normaliza, **Then** el resultado conserva las proporciones relativas y expone la normalización aplicada.
4. **Given** notación ambigua, combos duplicados o pesos negativos, **When** se valida el rango, **Then** se rechaza con información suficiente para corregirlo.

### User Story 3 - Publicar datos estratégicos versionados (Priority: P1)

Como responsable de estrategia, necesito identificar cada conjunto de recomendaciones por versión, parámetros y supuestos, para que el Trainer pueda explicar de qué fuente proviene una evaluación y reproducirla después.

**Why this priority**: El Trainer no debe inventar consejos ni mezclar resultados de fuentes incompatibles. La versionación permite auditar y comparar cambios estratégicos.

**Independent Test**: Registrar versiones de datos estratégicos con parámetros, rangos, frecuencias y supuestos; consultar una versión concreta y verificar que los resultados históricos conserven su referencia original.

**Acceptance Scenarios**:

1. **Given** un conjunto estratégico válido, **When** se publica una versión, **Then** queda identificado por una versión inmutable con sus parámetros, supuestos y fecha de vigencia.
2. **Given** dos versiones del mismo contexto, **When** se consulta cada una, **Then** cada consulta devuelve únicamente sus propias frecuencias y recomendaciones.
3. **Given** una versión que no contiene el contexto solicitado, **When** el Trainer intenta evaluarlo, **Then** el resultado se marca como no disponible y no inventa una recomendación.
4. **Given** una versión ya utilizada por decisiones históricas, **When** se publica una revisión, **Then** las decisiones anteriores conservan la versión que las produjo.

### User Story 4 - Integrar equity y estrategia en evaluaciones explicables (Priority: P2)

Como jugador del Trainer, necesito que una evaluación distinga los cálculos de equity de la recomendación estratégica y muestre sus supuestos, para entender la razón de una clasificación sin confundir una probabilidad con una acción obligatoria.

**Why this priority**: La separación mejora la confianza, permite revisar errores y prepara el Trainer para escenarios postflop posteriores.

**Independent Test**: Evaluar decisiones con una versión estratégica y datos de equity conocidos; comprobar que la respuesta identifica por separado entradas cuantitativas, recomendación, frecuencias, versión y limitaciones.

**Acceptance Scenarios**:

1. **Given** un contexto con equity y estrategia disponibles, **When** se evalúa una acción, **Then** el resultado distingue la equity calculada, la frecuencia estratégica y la explicación contextual.
2. **Given** una acción válida pero de baja frecuencia, **When** se evalúa, **Then** el sistema puede clasificarla como alternativa o desviación según las frecuencias, sin tratar la acción más frecuente como la única correcta.
3. **Given** equity disponible pero estrategia ausente, **When** se evalúa una acción, **Then** el sistema expone la equity si corresponde, marca la recomendación estratégica como no disponible y evita una clasificación inventada.
4. **Given** estrategia disponible pero entradas de equity insuficientes o inválidas, **When** se evalúa una acción, **Then** el sistema identifica la limitación y no presenta el cálculo incompleto como una certeza.

### Edge Cases

- Rangos con todos sus combos bloqueados por las cartas conocidas.
- Rangos vacíos después de aplicar bloqueadores.
- Empates y resultados divididos entre varios participantes.
- Estados con cartas comunitarias incompletas o incompatibles.
- Pesos extremadamente pequeños, cero o superiores al límite permitido.
- Versiones estratégicas incompatibles con el número de jugadores, posición, tamaño de stack o calle del escenario.
- Solicitudes repetidas de la misma evaluación y consultas de versiones retiradas.
- Diferencias de precisión que no deben cambiar una clasificación cuando están dentro del margen declarado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST representar por separado manos, rangos, combos, equity, probabilidades y recomendaciones estratégicas.
- **FR-002**: El sistema MUST calcular equity para mano contra mano, mano contra rango y rango contra rango cuando las entradas sean válidas.
- **FR-003**: El sistema MUST validar que las cartas sean únicas, compatibles con el estado conocido y suficientes para el cálculo solicitado.
- **FR-004**: El sistema MUST representar pesos de combos y frecuencias estratégicas de forma explícita, incluyendo acciones mixtas.
- **FR-005**: El sistema MUST eliminar o ajustar combos bloqueados sin crear cartas imposibles ni alterar silenciosamente las restricciones del usuario.
- **FR-006**: El sistema MUST producir resultados de probabilidad dentro del intervalo de 0% a 100% y documentar la precisión utilizada.
- **FR-007**: El sistema MUST producir resultados reproducibles para entradas, configuración y fuente de datos equivalentes.
- **FR-008**: El sistema MUST identificar cada conjunto estratégico publicado con una versión inmutable y sus parámetros de juego.
- **FR-009**: El sistema MUST conservar los supuestos, rangos, frecuencias y fuente asociados a cada versión estratégica.
- **FR-010**: El sistema MUST impedir que una versión estratégica sea modificada después de haber sido usada en una evaluación histórica.
- **FR-011**: El sistema MUST devolver un estado explícito de no disponibilidad cuando falte una fila estratégica compatible.
- **FR-012**: El sistema MUST separar en sus resultados la equity calculada, la recomendación estratégica, las frecuencias y la explicación contextual.
- **FR-013**: El sistema MUST rechazar entradas inválidas con errores accionables y no convertir errores de cálculo en recomendaciones.
- **FR-014**: El sistema MUST permitir que el Trainer consulte una versión estratégica concreta sin depender de datos futuros o de una versión mutable.
- **FR-015**: El sistema MUST registrar suficiente contexto para reproducir una evaluación sin almacenar datos privados que el usuario no esté autorizado a consultar.
- **FR-016**: El sistema MUST mantener la separación entre equity matemática y estrategia al incorporar futuras calles postflop.
- **FR-017**: El sistema MUST excluir de esta feature decisiones de juego en vivo, torneos, dinero real, recomendaciones generadas sin fuente y una interfaz completa de administración estratégica.

### Key Entities *(include if feature involves data)*

- **Equity Calculation**: Resultado cuantitativo de una consulta de manos o rangos bajo un estado de cartas y parámetros definidos.
- **Range**: Conjunto ponderado de manos o combos posibles, con restricciones y bloqueadores aplicables.
- **Combo Weight**: Peso asignado a un combo dentro de un rango después de aplicar las restricciones válidas.
- **Strategy Dataset Version**: Identidad inmutable de un conjunto de recomendaciones, sus parámetros, fuente, supuestos y periodo de vigencia.
- **Strategy Row**: Recomendación para un contexto específico, con acciones, frecuencias y condiciones aplicables.
- **Evaluation Context**: Estado de juego que conecta cartas, rangos, posición, jugadores, stacks, acciones previas y versión estratégica.
- **Evaluation Snapshot**: Registro de los datos y referencias usados para producir una evaluación reproducible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los cálculos válidos devuelve probabilidades dentro de límites matemáticos y un resultado de empate explícito cuando corresponda.
- **SC-002**: El 100% de los casos de prueba deterministas reproduce el mismo resultado usando las mismas entradas, configuración y versión de datos.
- **SC-003**: Al menos el 95% de las consultas normales de equity se completa en menos de 2 segundos en el entorno de referencia definido para la feature.
- **SC-004**: El 100% de las decisiones evaluadas identifica la versión estratégica y los supuestos que originaron la recomendación, o declara que no están disponibles.
- **SC-005**: El 100% de las evaluaciones históricas conserva sus datos de estrategia originales después de publicar una nueva versión.
- **SC-006**: El 100% de los escenarios con combos imposibles por bloqueadores los excluye del cálculo sin exponer cartas duplicadas.
- **SC-007**: Al menos el 90% de los usuarios de prueba puede distinguir en una revisión si un dato mostrado es equity matemática, frecuencia estratégica o recomendación contextual.

## Assumptions

- La feature reutiliza la autenticación y el Trainer existentes, pero no cambia el alcance preflop de Feature 006.
- La primera versión admite Texas Hold'em No-Limit con cartas comunitarias y parámetros de stack expresados en big blinds.
- Los resultados de equity pueden calcularse de forma exacta o aproximada, siempre que se declare el método y se cumpla la precisión definida.
- Las fuentes estratégicas iniciales son conjuntos versionados y documentados; la integración con un solver externo queda fuera de alcance.
- La estrategia puede no existir para todos los contextos; `UNAVAILABLE` es un resultado válido y no un error del sistema.
- La administración avanzada de datasets, permisos editoriales y publicación distribuida se aplaza a una feature posterior.
- Las futuras features 008 y 009 consumirán estas entidades para escenarios de flop, turn y river sin duplicar la separación entre equity y estrategia.
