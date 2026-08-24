# Runbook: entrevista de Convivencia en fichas de derivación

**Estado:** implementado
**Alcance:** módulo Anotaciones → pestaña Carta
**Fecha:** 2026-08-19

## Objetivo

Permitir registrar que una Ficha de Derivación ya tuvo entrevista con Convivencia Escolar, sin alterar el tipo de carta ni mezclar este avance con los estados documentales existentes.

## Resultado esperado

En una Ficha de Derivación archivada, dentro de **Acciones principales**, mostrar:

```text
[Crear carta] [Anular] [Archivar] [Marcar entrevista realizada]
```

Después de confirmar:

```text
✓ Entrevista realizada
```

La etiqueta superior **Derivación a Convivencia Escolar** se mantiene. El nuevo registro también aparece en **Historial**.

## Regla de visibilidad

El control solo aparece cuando se cumplen todas estas condiciones:

1. El documento activo es `derivacion` / `Ficha de Derivación`.
2. La carta está en estado documental `archived`.
3. No existe previamente el evento de entrevista.

No aparece para Amonestación ni Carta de Compromiso.

## Diseño funcional

### Acción

- Ubicación: `CartasTab.tsx`, sección **Acciones principales**.
- Estilo: botón verde secundario, junto a las acciones de la carta.
- Texto: `Marcar entrevista realizada`.
- Confirmación: diálogo breve con observación opcional.
- Al guardar: actualizar la ficha, mostrar confirmación y refrescar historial/dashboard.

### Persistencia

Agregar un evento específico en `carta_events`:

```text
event_type = convivencia_interviewed
```

El evento debe conservar `tenant_id`, `carta_id`, `student_id`, usuario, fecha y observación.

No reutilizar `archived`: ese evento representa que la carta fue firmada y archivada físicamente.

### Presentación

- `CartasTab.tsx`: botón y estado confirmado.
- `HistoryTab.tsx`: título `Entrevista con Convivencia realizada`.
- `StudentSummaryTab.tsx`: indicador de solo lectura, si se decide mostrarlo también en Estado.
- `cartas.service.ts`: función `markCartaInterviewed`.

## Implementación

1. Crear migración para permitir el nuevo `event_type` y conservar el acceso autenticado existente.
2. Agregar el tipo al modelo TypeScript de eventos.
3. Implementar `markCartaInterviewed` en `cartas.service.ts`, validando tenant, estudiante, carta y tipo de derivación.
4. Agregar el botón condicionado en `CartasTab.tsx`.
5. Agregar confirmación visual e invalidación de consultas.
6. Mapear el evento en `HistoryTab.tsx`.
7. Mostrar el indicador verde solo cuando el evento exista.

## Validaciones

- Una Amonestación no muestra el botón.
- Un Compromiso no muestra el botón.
- Una Derivación pendiente o procesada no muestra el botón si la regla exige archivo previo.
- La migración `20260819215613_add_convivencia_interview_event.sql` está aplicada en Supabase.
- La base de datos permite `convivencia_interviewed` y evita duplicarlo por carta.
- `npm run lint`, `npm run test`, `npm run build:web` y `git diff --check` finalizaron correctamente.
- Una Derivación archivada sí muestra el botón.
- El segundo clic no duplica el evento.
- El evento queda asociado al tenant, carta y estudiante correctos.
- El historial muestra fecha, usuario y observación.
- El estado de la carta continúa siendo `Archivada`.
- La etiqueta superior continúa siendo `Derivación a Convivencia Escolar`.

## Pruebas mínimas

- Test unitario del servicio: guarda una entrevista una sola vez.
- Test de componente: visibilidad por tipo y estado de carta.
- Test de historial: renderiza el evento con texto correcto.
- `npm run lint`.
- `npm run test`.
- `npm run build:web`.
- `git diff --check`.

## Despliegue

1. Revisar migración y permisos efectivos en Supabase.
2. Aplicar la migración en el proyecto vinculado.
3. Verificar el evento con una cuenta autenticada de Convivencia.
4. Publicar en `master` y desplegar producción.
5. Probar una derivación real y confirmar el historial.

## Reversión

No eliminar eventos existentes. Si se detecta un problema, ocultar temporalmente el control en frontend y conservar la información ya registrada. La migración es forward-only para no perder trazabilidad.
