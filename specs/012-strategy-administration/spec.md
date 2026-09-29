# Feature Specification: Administración de estrategia versionada

**Feature Branch**: `012-strategy-administration`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "012" (interpretado según el roadmap existente como administración editorial de datasets y versiones estratégicas)

## Clarifications

### Session 2026-09-28

- Q: ¿Qué modelo debe controlar quién puede crear, validar, publicar y retirar datasets estratégicos? → A: Roles globales con capacidades separadas: editor crea y modifica borradores; revisor valida; publicador publica o retira; administrador gestiona permisos y auditoría.
- Q: ¿Qué debe ocurrir cuando dos editores modifican el mismo borrador al mismo tiempo? → A: Rechazar el conflicto y exigir que el editor revise la versión más reciente.

## User Scenarios & Testing

### User Story 1 - Crear y preparar una versión estratégica (Priority: P1)

Como operador editorial autorizado, quiero crear un borrador de dataset estratégico y cargar sus filas de contexto, para preparar una versión coherente sin afectar todavía las recomendaciones que usa el Trainer.

**Why this priority**: Sin un borrador editable y aislado, el equipo no puede mantener datos estratégicos sin modificar directamente una versión publicada ni arriesgar resultados de entrenamiento.

**Independent Test**: Un operador autorizado crea un borrador, añade filas válidas y consulta el borrador; otro usuario sin permiso no puede verlo ni modificarlo, y el Trainer sigue usando únicamente la versión publicada anterior.

**Acceptance Scenarios**:

1. **Given** un operador autorizado y un identificador de dataset válido, **When** crea una versión en estado borrador, **Then** el sistema devuelve una identidad, fuente, supuestos, contexto de compatibilidad y estado de borrador.
2. **Given** un borrador editable, **When** el operador añade una fila estratégica con contexto, acciones y frecuencias que suman 100%, **Then** la fila queda asociada a esa versión y puede consultarse sin aparecer todavía como recomendación publicada.
3. **Given** una versión publicada, **When** el operador intenta editarla directamente, **Then** el sistema rechaza el cambio y exige crear una nueva versión derivada.
4. **Given** un usuario sin permiso editorial, **When** intenta crear, editar o consultar un borrador, **Then** recibe una respuesta de acceso denegado sin revelar datos del dataset.

### User Story 2 - Validar y publicar una versión (Priority: P1)

Como responsable editorial, quiero validar un borrador y publicarlo de forma controlada, para que el Trainer pueda usar solo datos completos, compatibles y revisables.

**Why this priority**: La publicación es el límite de confianza entre los datos editoriales y las recomendaciones visibles para los jugadores; debe impedir versiones incompletas o ambiguas.

**Independent Test**: Con un borrador válido y otro inválido, ejecutar la validación y publicación; el válido pasa a publicado y se convierte en la versión activa del contexto, mientras el inválido conserva sus errores y no altera el comportamiento del Trainer.

**Acceptance Scenarios**:

1. **Given** un borrador con filas duplicadas, contextos incompatibles, frecuencias inválidas o campos obligatorios ausentes, **When** se valida, **Then** el sistema devuelve errores específicos por fila y mantiene el borrador sin publicarlo.
2. **Given** un borrador que cumple todas las reglas editoriales, **When** se publica, **Then** queda identificado como publicado con autor, fecha, fuente, supuestos y resumen de validación.
3. **Given** dos versiones publicadas compatibles con el mismo contexto, **When** se consulta el Trainer, **Then** solo una queda activa según la política editorial y la versión seleccionada queda registrada en nuevas evaluaciones.
4. **Given** una versión publicada activa, **When** se publica su reemplazo, **Then** las evaluaciones y decisiones anteriores conservan la versión que utilizaron y las nuevas consultas usan el reemplazo.
5. **Given** una publicación en curso que falla una regla de integridad, **When** termina la operación, **Then** no existe una versión parcialmente publicada ni cambia la versión activa.

### User Story 3 - Retirar, consultar y auditar versiones (Priority: P2)

Como responsable de la plataforma, quiero consultar el historial de versiones, retirar una versión y revisar quién hizo cada cambio, para corregir datos sin perder trazabilidad.

**Why this priority**: La trazabilidad y la capacidad de retirar una versión defectuosa reducen el impacto de errores editoriales y permiten explicar resultados históricos.

**Independent Test**: Publicar dos versiones, retirar una y consultar el historial de cambios; verificar que la versión retirada deja de ser seleccionable para nuevas evaluaciones, que la versión anterior o una alternativa compatible queda explícita y que no se alteran evaluaciones pasadas.

**Acceptance Scenarios**:

1. **Given** un dataset con varias versiones, **When** un usuario con permiso de administración consulta el historial, **Then** ve estado, autor, fechas, fuente, compatibilidad, resultado de validación y motivo de retiro de cada versión.
2. **Given** una versión publicada que ya no debe usarse, **When** un responsable la retira con un motivo, **Then** deja de estar disponible para nuevas evaluaciones y el motivo queda registrado.
3. **Given** una versión retirada que aparece en una evaluación histórica, **When** se consulta esa evaluación, **Then** conserva la versión, filas y limitaciones originales sin sustituirlas silenciosamente.
4. **Given** cualquier creación, edición, validación, publicación o retiro, **When** se consulta la auditoría, **Then** se identifica actor, acción, objeto, momento, resultado y motivo sin almacenar secretos.

## Edge Cases

- Un borrador sin filas no puede publicarse y muestra una causa accionable.
- Dos filas con el mismo contexto lógico se consideran duplicadas aunque el orden textual de sus acciones difiera.
- Las frecuencias negativas, mayores que 100% o cuya suma no sea 100% bloquean la validación.
- Una fila con una calle, posición, número de jugadores o stack incompatible con el dataset se marca como inválida.
- Retirar la única versión activa compatible no debe dejar al Trainer fingiendo que existe una recomendación; debe devolver disponibilidad explícita.
- Reintentar una publicación o retiro con la misma solicitud no debe crear estados duplicados ni registros de auditoría contradictorios.
- Un usuario pierde su permiso durante una operación editorial; el resultado debe ser rechazo sin cambios parciales.
- Dos editores guardan cambios sobre el mismo borrador; el segundo guardado debe rechazarse si el borrador cambió y no debe sobrescribir cambios existentes.
- Una versión histórica o retirada no puede ser editada; debe clonarse a un nuevo borrador.
- Los errores de validación no deben revelar datasets o filas de otro ámbito editorial.

## Requirements

### Functional Requirements

- **FR-001**: El sistema MUST distinguir entre borradores, versiones publicadas y versiones retiradas.
- **FR-002**: El sistema MUST permitir a un operador autorizado crear un borrador con identidad de dataset, número de versión, fuente, supuestos y contexto de compatibilidad.
- **FR-003**: El sistema MUST permitir añadir, reemplazar y eliminar filas únicamente dentro de un borrador editable.
- **FR-004**: El sistema MUST tratar las versiones publicadas y retiradas como inmutables y exigir un nuevo borrador para cualquier cambio.
- **FR-005**: El sistema MUST validar que cada fila tenga un contexto completo, acciones permitidas, frecuencias no negativas y frecuencias que sumen exactamente 100% dentro de la tolerancia editorial definida.
- **FR-006**: El sistema MUST detectar filas duplicadas y contextos incompatibles antes de publicar una versión.
- **FR-007**: El sistema MUST devolver errores de validación identificables por versión y fila, sin publicar versiones que contengan errores bloqueantes.
- **FR-008**: El sistema MUST publicar una versión válida como una operación completa y hacerla elegible para nuevas evaluaciones solo después de completar la validación.
- **FR-009**: El sistema MUST permitir como máximo una versión activa por combinación compatible de dataset, calle, número de jugadores, posición y tamaño de stack.
- **FR-010**: El sistema MUST permitir retirar una versión publicada con un motivo obligatorio y excluirla de nuevas evaluaciones.
- **FR-011**: El sistema MUST conservar en evaluaciones y decisiones históricas la identidad exacta de la versión y los datos estratégicos utilizados originalmente.
- **FR-012**: El sistema MUST proporcionar una consulta de historial con estado, autor, fechas, fuente, compatibilidad, validación y motivo de retiro.
- **FR-013**: El sistema MUST registrar en una auditoría cada creación, modificación de borrador, validación, publicación, retiro y rechazo editorial, incluyendo actor, objeto, momento, resultado y motivo cuando aplique.
- **FR-014**: El sistema MUST aplicar roles globales con capacidades separadas para consulta, edición, validación, publicación, retiro y administración, y denegar cada operación no autorizada sin revelar contenido protegido.
- **FR-015**: El sistema MUST rechazar un guardado cuando el borrador haya cambiado desde que el editor lo consultó, sin sobrescribir datos y permitiendo revisar la versión más reciente.
- **FR-016**: El sistema MUST impedir que un cliente establezca por sí mismo el autor, estado publicado, versión activa, resultado de validación o registro de auditoría.
- **FR-017**: El sistema MUST devolver disponibilidad explícita cuando no exista una versión publicada compatible, sin fabricar recomendaciones estratégicas.
- **FR-018**: El sistema MUST mantener fuera de esta feature las reglas del Poker Engine, el cálculo de equity, la generación automática de consejos, el entrenamiento multijugador, el dinero real y la edición de evaluaciones históricas.

### Key Entities

- **Strategy Dataset**: Familia de datos estratégicos para un dominio de juego, con nombre, descripción, propietario editorial y ámbito.
- **Strategy Dataset Version**: Versión inmutable o borrador de un dataset, con estado, fuente, supuestos, compatibilidad, autor, fechas y resultado de validación.
- **Strategy Row**: Recomendación contextual con calle, posición, jugadores, stack, acciones y frecuencias explícitas.
- **Validation Report**: Resultado reproducible de la validación de una versión, con errores, advertencias, conteos y filas afectadas.
- **Publication Record**: Registro de activación o retiro de una versión, con actor, fecha, motivo y contexto compatible.
- **Editorial Permission**: Permiso que determina si un usuario puede consultar, editar, validar, publicar, retirar o administrar datasets.
- **Editorial Audit Entry**: Registro inmutable de una operación editorial, su actor, objeto, resultado y motivo.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de las versiones publicadas en las pruebas contiene un reporte de validación exitoso y ninguna fila bloqueante.
- **SC-002**: El 100% de los intentos de publicar filas duplicadas, frecuencias inválidas o contextos incompletos es rechazado sin cambiar la versión activa.
- **SC-003**: El 100% de las evaluaciones históricas de prueba conserva la versión estratégica original después de publicar, reemplazar o retirar versiones posteriores.
- **SC-004**: El 100% de las operaciones editoriales de prueba produce una entrada de auditoría con actor, acción, objeto, momento y resultado.
- **SC-005**: El 100% de las operaciones sin permiso de prueba es rechazado sin revelar contenido editorial protegido.
- **SC-006**: Al menos el 95% de las consultas de historial de versiones devuelve el estado y los metadatos visibles en menos de 2 segundos con 1.000 versiones almacenadas.
- **SC-007**: Al menos el 90% de los operadores de prueba puede identificar qué versión está activa, por qué una versión no publica y quién realizó la última operación sin asistencia externa.
- **SC-008**: Tras retirar una versión activa, el 100% de las nuevas consultas de prueba devuelve una versión alternativa compatible o una limitación explícita de disponibilidad.

## Assumptions

- Feature 007 ya proporciona datasets y filas estratégicas versionadas, y Feature 006/008 consume la versión registrada en sus evaluaciones; esta feature añade la administración editorial que quedó aplazada.
- Los operadores editoriales son usuarios autenticados con roles globales y capacidades separadas: editor, revisor, publicador y administrador; no se crean ACL por dataset ni un sistema de identidad independiente.
- La primera versión administra datos estratégicos introducidos por operadores, no importa automáticamente desde un solver externo.
- Una publicación reemplaza la versión activa solo para nuevas evaluaciones compatibles; nunca reescribe decisiones o snapshots existentes.
- La validación de porcentajes usa una tolerancia editorial pequeña para representación decimal, documentada junto al reporte de validación.
- El alcance inicial se limita a los contextos de estrategia ya soportados por el Trainer y no añade nuevas calles, variantes, torneos ni formatos de juego.
- El historial de auditoría es consultable por responsables autorizados y no incluye contraseñas, tokens, cartas privadas ni secretos operativos.
- La feature 013 permanece reservada para entrenamiento multijugador y no forma parte de esta administración editorial.
