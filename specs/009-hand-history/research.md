# Research: Historial general de manos

## Decision 1: Persistir un registro histórico canónico separado del estado activo

- **Decision**: Crear un agregado histórico persistente con identidad de mano, modalidad, estado terminal, participantes autorizados, snapshot público, acciones ordenadas y resultado. Las fuentes de juego publicarán una sola finalización idempotente cuando la mano termine.
- **Rationale**: El estado activo de local games es efímero y el estado de una mesa no debe convertirse directamente en una consulta histórica. Un registro canónico permite consultar y proteger el historial sin acoplar su lectura a cada motor productor.
- **Alternatives considered**: Leer directamente snapshots activos o reconstruir manos desde logs fue rechazado porque no garantiza retención, orden estable ni una frontera de privacidad uniforme.

## Decision 2: Usar snapshots autorizados y no exponer snapshots internos

- **Decision**: Persistir los datos necesarios para revisar una mano, pero construir la respuesta mediante una proyección por usuario que filtre cartas privadas, mazo, bookkeeping interno y datos de participantes no autorizados.
- **Rationale**: La constitución exige nunca confiar en el cliente y mantener privada la información no revelada. Guardar el contexto necesario no implica que todo el contexto pueda cruzar la API.
- **Alternatives considered**: Devolver el snapshot completo al participante fue rechazado por riesgo de fuga de cartas y detalles internos.

## Decision 3: Contrato de consulta paginado con filtros cerrados

- **Decision**: Exponer una lista autenticada con paginación por página y tamaño limitado, orden por fecha con dirección explícita y filtros por periodo, modalidad, resultado y participante. El orden secundario será la identidad estable de la mano.
- **Rationale**: Los filtros son suficientes para la primera versión y un límite fijo evita consultas sin control. El desempate estable impide duplicados u omisiones al recorrer páginas.
- **Alternatives considered**: Búsqueda libre por texto y filtros de analytics se aplazan porque pertenecen a una experiencia posterior y complican la semántica inicial.

## Decision 4: Mantener la finalización idempotente

- **Decision**: Cada productor enviará una identidad única de mano y una versión o clave de finalización; una repetición devolverá el registro existente sin duplicar acciones, participantes ni resultado.
- **Rationale**: Reintentos de red, reconexiones y carreras de cierre son normales en partidas. La unicidad en persistencia y la operación idempotente protegen la integridad histórica.
- **Alternatives considered**: Crear un historial nuevo por cada evento de cierre fue rechazado porque produce duplicados y resultados contradictorios.

## Decision 5: Anonimización o eliminación lógica para manos compartidas

- **Decision**: Permitir una solicitud de eliminación sobre la relación del usuario con el historial; eliminar completamente los datos solo cuando no comprometa la integridad o los derechos de otros participantes. En los demás casos, anonimizar o restringir los datos personales del solicitante.
- **Rationale**: Una mano compartida no puede desaparecer selectivamente si eso rompe el detalle visible para otros participantes. La política debe ser explícita y auditable.
- **Alternatives considered**: Borrado físico incondicional fue rechazado porque puede romper referencias de participantes y auditoría.

## Decision 6: Fuentes iniciales acotadas a manos persistibles

- **Decision**: El contrato histórico aceptará snapshots terminales de partidas virtuales y sesiones de entrenamiento que ya dispongan de contexto persistible; no se forzará la persistencia del estado efímero de Feature 003 dentro de su propio alcance.
- **Rationale**: El historial debe ser útil sin reescribir el Poker Engine. Los productores pueden integrarse de forma incremental y las fuentes no persistibles pueden quedar explícitamente fuera hasta tener un adaptador seguro.
- **Alternatives considered**: Hacer que el historial reconstruya cualquier mano desde memoria fue rechazado por pérdida de datos al reiniciar y por acoplamiento con cada productor.

## Decision 7: Validación de privacidad y rendimiento como puertas de diseño

- **Decision**: La validación incluirá pruebas de autorización cruzada, no enumeración de IDs, redacción de cartas y mazo, reintentos idempotentes, orden de acciones, filtros y latencia de primera página.
- **Rationale**: Los principales riesgos son fuga de información, registros duplicados y consultas que se degradan con el crecimiento del historial; todos son verificables sin depender de una implementación concreta.
- **Alternatives considered**: Confiar solo en pruebas de UI fue rechazado porque no prueba autoridad del servidor ni aislamiento entre usuarios.
