# Quickstart: Validación de administración de estrategia

## Estado de validación

- Builds backend y frontend: pasan.
- Migraciones Prisma: sin migraciones pendientes.
- Pruebas enfocadas de Feature 012: 6/6 pasan; frontend administrativo: pasa.
- Lint focalizado de `backend/src/modules/strategy/`: sin errores.
- Lint global backend: mantiene errores baseline fuera de Feature 012 en equity, rooms y trainer; frontend: sin errores, con un warning existente en Analytics.
- Suite completa backend: mantiene un fallo baseline de estrategia no relacionado con administración.
- Escenarios manuales de navegador de esta guía: pendientes de ejecución.
- Por ello, T036 permanece abierto hasta resolver o aceptar explícitamente el fallo baseline y ejecutar los escenarios manuales.

## Prerrequisitos

- Node.js 20+.
- PostgreSQL disponible y `DATABASE_URL` configurado para backend.
- Dependencias instaladas en `backend` y `frontend`.
- Un usuario de prueba con rol `ADMIN` y usuarios con roles `EDITOR`, `REVIEWER` y `PUBLISHER`.

## Preparación

Desde PowerShell:

```powershell
Set-Location C:\Users\Felipe\Desktop\Poker_PLay\backend
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run build
```

La migración debe conservar las versiones publicadas existentes y asignar el rol base a usuarios actuales sin exponerles operaciones editoriales.

## Validación de backend

Ejecutar la suite:

```powershell
Set-Location C:\Users\Felipe\Desktop\Poker_PLay\backend
npm.cmd test
```

La cobertura focalizada debe incluir:

1. Crear un dataset y un borrador como `EDITOR`.
2. Editar metadata/filas con `expectedRevision` correcto y comprobar incremento de `revision`.
3. Repetir un guardado con revisión obsoleta y comprobar `409 DRAFT_CONFLICT` sin cambios.
4. Validar filas vacías, duplicadas, incompatibles y frecuencias que no sumen 1.
5. Publicar una versión válida como `PUBLISHER` y comprobar hash, auditoría y activación.
6. Publicar un reemplazo compatible y comprobar una sola versión activa.
7. Retirar con motivo y comprobar que el Trainer devuelve disponibilidad explícita si no queda alternativa.
8. Consultar un snapshot histórico y comprobar que conserva la versión y fila originales.
9. Intentar cada operación con rol insuficiente y comprobar `403` sin revelar contenido.
10. Consultar auditoría como `ADMIN` y comprobar que no contiene secretos.

## Validación de frontend

```powershell
Set-Location C:\Users\Felipe\Desktop\Poker_PLay\frontend
npm.cmd test
npm.cmd run build
```

Comprobar la página administrativa en estos estados:

- Usuario no autorizado: acceso denegado sin catálogo ni filas.
- Catálogo vacío: estado vacío accionable.
- Borrador editable: metadata y filas con errores por fila.
- Validación fallida: reporte visible y publicación deshabilitada.
- Publicación/retiro: confirmación, motivo obligatorio, estado de carga y error recuperable.
- Conflicto de revisión: mensaje que pide recargar/revisar, sin perder el contenido mostrado.
- Historial/auditoría: estados, actores y timestamps legibles, sin datos sensibles.

## Regresión del Trainer

Usar los tests existentes de Strategy/Trainer y verificar:

- El lookup selecciona solo `PUBLISHED` y una versión activa compatible.
- Una versión retirada no se usa para evaluaciones nuevas.
- `EvaluationSnapshot` conserva `strategyVersionSnapshot` y `strategyRowSnapshot` antiguos.
- Un contexto sin estrategia devuelve `UNAVAILABLE`, nunca una acción inventada.

## Criterio de salida

La implementación de Feature 012 está funcional en sus suites enfocadas y compilaciones. El cierre formal requiere que la suite completa backend quede verde y que se ejecuten los escenarios manuales de navegador descritos arriba; los errores baseline deben resolverse o aceptarse explícitamente antes de marcar T036.
