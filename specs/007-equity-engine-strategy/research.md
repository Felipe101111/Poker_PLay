# Research: Equity Engine y estrategia versionada

## Decision: Usar enumeracion exacta como metodo canonico inicial

**Rationale**: La especificacion exige reproducibilidad y las clasificaciones del Trainer no deben cambiar por variacion de muestreo. El Poker Engine ya tiene cartas y evaluacion deterministas reutilizables. El resultado debe incluir el metodo, la precision, los runouts evaluados y los empates.

**Alternatives considered**:

- **Monte Carlo como metodo principal**: rechazado porque introduce variacion y puede cambiar una clasificacion cerca del limite.
- **Fallback silencioso a Monte Carlo**: rechazado porque ocultaria un cambio de precision; si se agrega muestreo en el futuro debe declararse como metodo separado, con semilla, muestras y error estimado.
- **Solver externo**: fuera de alcance para 007 y contrario a mantener una frontera explicita entre datos estratégicos y calculos matematicos.

## Decision: Expandir rangos a combos concretos ponderados

**Rationale**: El combo de dos cartas es la unidad que permite aplicar bloqueadores sin ambiguedad. Cada combo mantiene su peso original en el intervalo `[0, 1]`; normalizar pesos es una operacion explicita que devuelve su factor. Los combos incompatibles se eliminan, pero su peso no se redistribuye silenciosamente.

**Alternatives considered**:

- **Calcular directamente desde notacion de manos**: rechazado porque mezcla parsing, bloqueadores y equity en un solo limite.
- **Redistribuir automaticamente el peso bloqueado**: rechazado porque altera la intencion de la fuente sin que el consumidor pueda auditarlo.
- **Permitir rangos vacios**: solo se permite como resultado explicito de filtrado; no se usa para producir equity o recomendaciones.

## Decision: Versionar datasets estrategicos como publicaciones inmutables

**Rationale**: Cada version debe conservar parametros, supuestos, fuente, precision y filas estrategicas. Las evaluaciones historicas guardan un snapshot de la fila resuelta y su manifiesto, no solo una referencia que podria cambiar.

**Alternatives considered**:

- **Editar una unica tabla activa**: rechazado porque rompe la reproducibilidad historica.
- **Guardar solo el identificador de version**: rechazado porque una version retirada o un cambio de loader impediria reconstruir el resultado.
- **Versionar por commit de codigo unicamente**: rechazado porque no expresa parametros, procedencia ni supuestos de la estrategia.

## Decision: Mantener tres fronteras de dominio

**Rationale**:

- **Equity Engine**: calcula sobre un DTO inmutable de cartas, rangos, board y configuracion; no conoce Prisma, Express, estrategia ni UI.
- **Strategy Engine**: resuelve una version y contexto, devuelve frecuencias, supuestos o `UNAVAILABLE`; no calcula cartas ni probabilidades.
- **Trainer**: valida escenario/autorizacion, llama ambos motores, combina resultados y persiste el snapshot.

Esta estructura cumple los principios constitucionales de independencia del Poker Engine y Strategy Engine, responsabilidad unica y autoridad del servidor.

**Alternatives considered**:

- **Un servicio unico de evaluacion**: rechazado porque volveria a acoplar equity, estrategia y persistencia.
- **Calculo en frontend**: rechazado por autoridad del servidor, privacidad y reproducibilidad.

## Decision: Usar el modelo de cartas existente y DTOs propios de analisis

**Rationale**: `Card`, `Rank` y `Suit` del Poker Engine son canonicos, pero no se debe pasar `HandState` completo al Equity Engine. Un DTO de analisis evita filtrar deck, snapshots internos o informacion privada y permite extender el analisis a calles futuras.

**Alternatives considered**:

- **Pasar `HandState` directamente**: rechazado por acoplamiento y riesgo de fuga de estado interno.
- **Duplicar tipos de cartas**: rechazado porque crea conversiones y posibles divergencias de dominio.

## Decision: Validar el resultado con pruebas deterministas, edge cases e integracion

**Rationale**: Se requieren pruebas de manos conocidas, empates, rangos ponderados, bloqueadores, rangos vacios, versionado, `UNAVAILABLE`, snapshots historicos, redaccion y rendimiento p95. Las pruebas deben reutilizar el estilo Vitest/Supertest existente.

**Alternatives considered**:

- **Validar solo casos felices**: rechazado por los Principios 26 y 27 de la constitucion.
- **Medir rendimiento sin validar exactitud**: rechazado porque rapidez sin resultado matematico correcto no cumple el objetivo.
