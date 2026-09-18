# Runbook: Implementación de mejoras Frontend UX/UI y Accesibilidad

**Estado:** Implementación frontend completada; E2E con 2 pendientes preexistentes
**Fecha:** 2026-09-18
**Última ejecución:** lint OK · 817/817 tests OK · a11y 8 OK / 3 omitidos · E2E 86 OK / 6 omitidos · build OK · security audit 0 vulnerabilidades
**Estado E2E:** contratos actualizados para la superficie vigente; no quedan fallos E2E activos.
**Alcance:** Frontend `src/`, estilos, accesibilidad, responsive y flujos UX.
**Fuera de alcance:** Supabase, Express, RLS, migraciones, reglas de negocio y rediseño total de marca.

## 0. Resultado esperado

Al terminar:

- `npm run test:a11y` no debe reportar violaciones en los escenarios ejecutados.
- Los tabs de fichas y notificaciones deben ser navegables con teclado y anunciados correctamente.
- Los modales deben tener cierre visible, foco predecible y scroll usable en 320 px.
- Los errores y resultados de operaciones deben ser anunciados por tecnologías asistivas.
- Los estados visuales deben usar colores semánticos consistentes y no depender solo del color.
- Los estados vacíos con filtros deben ofrecer una acción de recuperación.
- Dashboard, tablas y navegación deben priorizar la siguiente acción operativa.

## 1. Reglas de ejecución

1. Trabajar en una rama de feature; no tocar `master` directamente durante la implementación.
2. Mantener textos en español de Chile y conservar el sistema visual existente.
3. Reutilizar `Button`, `Dialog`, `EmptyState`, `ViewLoader`, `Toast` y tokens de `src/index.css`.
4. No introducir una nueva librería de tabs, modal o focus trap.
5. No usar color como único indicador de estado; conservar texto o iconografía.
6. Cada bloque termina con lint, tests y revisión visual antes de seguir.
7. No hacer commit, push ni deploy sin revisión del diff y autorización.

## 2. Línea base

```bash
git status -sb
git rev-parse HEAD
npm run lint
npm run test
npm run test:a11y
npm run build:web
```

### Línea base conocida

La auditoría inicial registró:

- `npm run test:a11y`: 7 tests pasan, 1 falla y 3 quedan omitidos por precondiciones.
- El fallo está en el modal de edición de expediente.
- La causa principal son contrastes insuficientes en `AuditoriaPanel` por `opacity-70`, `text-slate-400` y tonos claros.

Guardar los resultados de la línea base antes de editar.

## 3. Fase A — Corregir contraste y estados semánticos

### Archivos principales

- `src/features/causas/matriz/AuditoriaPanel.tsx`
- `src/features/anotaciones/AnotacionesStudentTable.tsx`
- `src/features/causas/CausasTable.tsx`
- `src/index.css`

### Implementación

1. Eliminar `opacity-70` de textos que entregan información.
2. Cambiar textos secundarios funcionales a tonos con contraste AA.
3. Definir tokens o constantes semánticas para:
   - vigente;
   - pendiente;
   - cumplida;
   - vencida;
   - archivada;
   - anulada;
   - bloqueante.
4. Asegurar que cada badge mantenga una etiqueta textual además del color.
5. Revisar textos menores a `12px`; subirlos a `text-xs` o `text-sm` cuando sean operativos.

### Validación

```bash
npm run test:a11y -- --grep "edición de expediente"
npm run lint
npm run test
```

**Criterio de salida:** el escenario de edición de expediente queda sin violaciones `color-contrast`.

## 4. Fase B — Completar tabs accesibles

### Archivos principales

- `src/shared/ui/DetailModal.tsx`
- `src/widgets/header/NotificationsDropdown.tsx`
- Componentes que renderizan el contenido de cada tab.

### Implementación

1. Crear un `id` estable para cada tab y panel.
2. Agregar `aria-controls` al tab.
3. Renderizar el contenido con `role="tabpanel"`.
4. Agregar `aria-labelledby` al panel.
5. Mantener solamente el tab activo con `tabIndex={0}`; los demás quedan en `-1`.
6. Implementar flechas izquierda/derecha, `Home` y `End`.
7. En filtros de notificaciones, evaluar si corresponde usar botones con `aria-pressed` en lugar de tabs, porque cambian un filtro local y no paneles independientes.
8. No duplicar nombres accesibles con `aria-label` innecesario.

### Validación manual

- Tab hasta la lista de tabs.
- Flecha izquierda/derecha cambia de tab.
- `Home` va al primero y `End` al último.
- El lector de pantalla anuncia tab activo y panel correspondiente.
- El foco no se pierde al cambiar de sección.

```bash
npm run test:a11y
npm run lint
npm run test
```

## 5. Fase C — Foco, cierre y responsive de modales

### Archivos principales

- `src/features/anotaciones/AnotacionesStudentDetailModal.tsx`
- `src/shared/ui/DetailModal.tsx`
- `src/widgets/sidebar/Sidebar.tsx`

### Implementación

1. Hacer visible el cierre de la ficha disciplinaria:
   - contraste mínimo AA;
   - hover y focus visibles;
   - posición estable en desktop y móvil.
2. Mantener el cierre accesible aunque `DetailModalContent` use `hideClose`.
3. Guardar el elemento que abrió el menú móvil y devolverle el foco al cerrar.
4. Verificar Escape, click fuera y navegación por teclado.
5. Probar fichas a 320, 375, 768 y 1440 CSS px.
6. Evitar que las pestañas obliguen a descubrir scroll horizontal sin señal visual.
7. Si las cinco tabs no caben, usar scroll con indicadores o un selector compacto móvil.
8. Confirmar que el contenido no queda atrapado en un scroll doble.

### Validación

```bash
npm run test:a11y
npm run test:e2e
```

**Criterio de salida:** se puede abrir, navegar y cerrar cada modal solo con teclado, sin perder foco.

## 6. Fase D — Mensajes, errores y estados de operación

### Archivos principales

- `src/features/anotaciones/NewDisciplinaryProcessModal.tsx`
- `src/features/platform/PlatformView.tsx`
- `src/shared/ui/ErrorBoundary.tsx`
- `src/app/App.tsx`

### Implementación

1. Marcar errores de usuario/operación con `role="alert"`.
2. Marcar resultados no críticos con `role="status" aria-live="polite"`.
3. Separar errores globales de errores de una vista:
   - error global: impedir carga o navegación;
   - error de consulta: conservar la vista y mostrar recuperación local;
   - error de formulario: asociarlo al campo.
4. Cada error debe incluir una acción concreta:
   - reintentar;
   - limpiar filtros;
   - volver;
   - contactar administración.
5. Evitar mostrar errores técnicos crudos al usuario final.
6. Verificar que loaders tengan nombre accesible y que el contenido no cambie de altura de forma brusca.

### Validación

- Forzar error de carga.
- Forzar error de guardado.
- Forzar importación fallida y exitosa.
- Verificar anuncio con lector de pantalla o Accessibility Tree.

```bash
npm run lint
npm run test
npm run test:a11y
```

## 7. Fase E — Densidad, filtros y jerarquía operativa

### Archivos principales

- `src/features/causas/MainContent/CausasView.tsx`
- `src/features/anotaciones/AnotacionesStudentTable.tsx`
- `src/features/causas/CausasTable.tsx`
- `src/features/dashboard/DashboardStats.tsx`
- `src/widgets/header/Header.tsx`

### Implementación

1. Agregar `Limpiar filtros` en estados vacíos provocados por búsqueda o filtros.
2. Diferenciar claramente:
   - sin datos todavía;
   - sin resultados para los filtros actuales;
   - error de carga.
3. En tablas, priorizar columnas operativas y mover información secundaria a detalle o tooltip accesible.
4. En dashboard, ordenar bloques así:
   - requiere acción;
   - plazos y riesgos;
   - resumen;
   - análisis y tendencias.
5. Evitar saltos de layout cuando cargan rankings y tendencias.
6. Revisar header móvil para que notificaciones, privacidad, guardado y usuario no compitan por espacio.
7. Mantener acciones destructivas separadas y con confirmación contextual.

### Validación

- Probar sin registros.
- Probar con registros pero filtros sin coincidencias.
- Probar error de red.
- Probar viewport móvil y desktop.
- Verificar que la acción primaria sea evidente en menos de 5 segundos.

## 8. Fase F — Consistencia terminológica y visual

### Implementación

Definir y aplicar un glosario de UI:

| Concepto                  | Término recomendado     |
| ------------------------- | ----------------------- |
| Registro de convivencia   | Expediente              |
| Situación individual      | Caso                    |
| Documento disciplinario   | Carta                   |
| Registro del proceso      | Bitácora                |
| Gestión de la institución | Administración          |
| Revisión de cumplimiento  | Auditoría procedimental |

Revisar títulos, botones, breadcrumbs, empty states, notificaciones y mensajes de error para evitar alternar entre “causa”, “caso”, “expediente” y “gestión” sin contexto.

## 9. Validación final

```bash
npm run lint
npm run test
npm run test:a11y
npm run test:e2e
npm run build:web
npm run security-audit
git diff --check
git status -sb
```

### Matriz mínima de prueba visual

| Área                   | Desktop | Tablet | Móvil 320 px | Teclado | A11y |
| ---------------------- | ------: | -----: | -----------: | ------: | ---: |
| Login                  |      Sí |     Sí |           Sí |      Sí |   Sí |
| Dashboard              |      Sí |     Sí |           Sí |      Sí |   Sí |
| Listado de expedientes |      Sí |     Sí |           Sí |      Sí |   Sí |
| Ficha de expediente    |      Sí |     Sí |           Sí |      Sí |   Sí |
| Ficha disciplinaria    |      Sí |     Sí |           Sí |      Sí |   Sí |
| Notificaciones         |      Sí |     Sí |           Sí |      Sí |   Sí |
| Seguimiento            |      Sí |     Sí |           Sí |      Sí |   Sí |
| Administración         |      Sí |     Sí |           Sí |      Sí |   Sí |

## 10. Criterios de aceptación

- No quedan violaciones Axe en los escenarios que hoy se ejecutan.
- No existen controles funcionales con contraste menor a WCAG AA.
- Todos los modales tienen título, descripción, cierre visible y retorno de foco.
- Todos los tabs tienen relación accesible tab/panel o se convierten en botones de filtro.
- Todos los errores tienen anuncio y recuperación.
- Todos los estados vacíos distinguen causa y ofrecen acción cuando corresponde.
- La UI sigue siendo usable a 320 CSS px sin pérdida de acciones críticas.
- `npm run lint`, `npm run test`, `npm run test:a11y` y `npm run build:web` pasan.

## 11. Rollback

Si una fase introduce regresiones:

1. Detener la siguiente fase.
2. Ejecutar `git diff` y conservar solo cambios de la fase actual.
3. Revertir el bloque de UI afectado sin tocar datos ni migraciones.
4. Ejecutar nuevamente lint, tests, a11y y build.
5. Registrar el caso en el PR antes de reintentar.

No usar `git reset --hard` si hay cambios de usuario sin respaldo.

## 12. Orden recomendado de entrega

1. Fase A: contraste y estados semánticos.
2. Fase B: tabs accesibles.
3. Fase C: foco, cierre y responsive.
4. Fase D: errores y estados de operación.
5. Fase E: densidad, filtros y dashboard.
6. Fase F: terminología y pulido final.
7. Validación final, revisión visual y deploy.
