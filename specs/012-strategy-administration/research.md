# Research: Administración de estrategia versionada

## Decision 1: Reutilizar Prisma y extender el modelo de estrategia existente

- **Decision**: Persistir datasets, borradores, validaciones, roles y auditoría en PostgreSQL mediante Prisma. Extender `StrategyDatasetVersion`/`StrategyRow` en vez de crear un servicio separado.
- **Rationale**: El repositorio ya persiste versiones y filas, y `EvaluationSnapshot` referencia una versión histórica. Mantener la misma frontera evita duplicar el contrato que consume el Trainer y permite transacciones reales.
- **Alternatives considered**: Archivos JSON o un repositorio en memoria. Se descartan porque no soportan edición concurrente, permisos, auditoría ni publicación atómica entre procesos.

## Decision 2: Roles globales con capacidades separadas

- **Decision**: Añadir un rol editorial global al usuario, con capacidades explícitas: `EDITOR` gestiona borradores, `REVIEWER` valida, `PUBLISHER` publica/retira y `ADMIN` gestiona roles y auditoría. El rol base no tiene acceso editorial.
- **Rationale**: Es la decisión aclarada por producto y aplica mínimo privilegio sin introducir ACL por dataset. La autorización se evalúa en backend en cada operación.
- **Alternatives considered**: ACL por dataset, que aumenta el modelo y la superficie de pruebas sin requerirse; un único administrador, que viola la separación de responsabilidades.

## Decision 3: Ciclo de vida persistente e inmutable

- **Decision**: Usar `DRAFT -> PUBLISHED -> RETIRED`. Solo los borradores admiten cambios; publicar crea una versión activa inmutable y retirar conserva el registro para historia.
- **Rationale**: Protege snapshots existentes y permite explicar qué datos usó una evaluación. La revisión de un borrador se expresa como una nueva versión, no como edición de una publicación.
- **Alternatives considered**: Actualizar filas publicadas en sitio. Se descarta porque rompería reproducibilidad histórica.

## Decision 4: Publicación atómica con clave de compatibilidad

- **Decision**: Calcular una clave canónica de compatibilidad por dataset, formato, calle, tamaño de mesa y supuestos de stack/blinds. La publicación valida todas las filas dentro de una transacción y activa como máximo una versión por clave; el reemplazo retira/desactiva la anterior en la misma operación.
- **Rationale**: La unicidad debe ser verdadera bajo concurrencia, no solo una comprobación previa en el servicio. Un índice/constraint de base de datos sobre la representación activa evita estados duplicados.
- **Alternatives considered**: Elegir la versión más reciente al leer. Se descarta porque oculta conflictos editoriales y hace no determinista el Trainer.

## Decision 5: Control optimista de concurrencia

- **Decision**: Cada borrador tiene `revision`; las escrituras incluyen la revisión leída. Si no coincide, el backend devuelve `DRAFT_CONFLICT` y no modifica datos.
- **Rationale**: Evita sobrescritura silenciosa sin bloquear toda la edición. Es adecuado para un flujo editorial con cambios puntuales y hace el conflicto comprobable en pruebas.
- **Alternatives considered**: Último guardado gana, que pierde trabajo; bloqueo pesimista de UI, que no protege clientes desconectados ni operaciones directas.

## Decision 6: Validación pura antes de persistir la publicación

- **Decision**: Separar validación de metadata, filas, duplicados, compatibilidad y frecuencias en funciones puras que produzcan `ValidationReport`. Solo un reporte sin errores bloqueantes permite publicar.
- **Rationale**: Mantiene la lógica testeable y evita que la UI sea autoridad. El reporte se conserva para explicar por qué una versión no puede publicarse.
- **Alternatives considered**: Validar solo en el formulario. Se descarta porque los clientes son no confiables y no cubriría importaciones o reintentos.

## Decision 7: Auditoría append-only y sin secretos

- **Decision**: Registrar actor, rol, acción, objeto, revisión, resultado, motivo, timestamp y metadatos no sensibles. No se guardan contraseñas, tokens, cartas privadas ni payloads completos innecesarios.
- **Rationale**: Satisface trazabilidad y reduce exposición. La auditoría se escribe en la misma transacción que cada transición de estado.
- **Alternatives considered**: Logs de aplicación solamente. Se descartan porque no ofrecen integridad relacional ni consulta histórica estable.

## Decision 8: Contrato administrativo separado del lookup del Trainer

- **Decision**: Añadir rutas autenticadas bajo `/api/strategy/admin` para operaciones editoriales; mantener el lookup interno y el contrato `UNAVAILABLE` existentes para el Trainer.
- **Rationale**: Evita que el público del Trainer pueda editar estrategia y permite probar permisos con una frontera clara.
- **Alternatives considered**: Reutilizar `publish()` directamente desde una ruta pública. Se descarta porque saltaría roles, drafts, revisión y auditoría.

## Decision 9: Sin importación automática de solver en esta feature

- **Decision**: La entrada inicial son payloads editoriales validados; los formatos de importación externa quedan fuera.
- **Rationale**: La spec limita el alcance a administración de datos ya soportados y evita introducir un contrato externo no definido.
- **Alternatives considered**: Importación directa de archivos/solver. Se reserva para una feature posterior con validación y seguridad específicas.
