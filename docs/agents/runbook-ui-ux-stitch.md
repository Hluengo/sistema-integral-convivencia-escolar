# Runbook de Implementacion UI/UX con Stitch

## 1. Objetivo

Implementar mejoras visuales en Gestión Integral de Convivencia Escolar a partir de los canvases Stitch, sin alterar la identidad existente ni introducir regresiones funcionales.

## 2. Restricciones no negociables

- Mantener la paleta actual definida en `src/index.css`.
- Mantener `Inter` como fuente.
- No reemplazar componentes funcionales por HTML generado por Stitch.
- No copiar datos ficticios de los canvases a producción.
- Mantener privacidad NNA, RLS, aislamiento por `tenant_id` y trazabilidad.
- No modificar flujos legales o estados de hitos como parte de un cambio puramente visual.
- No implementar Plan de Gestión: fue retirado del producto.

## 3. Fuente de verdad

Orden de prioridad:

1. Código y contratos existentes.
2. Reglas de negocio y accesibilidad del repositorio.
3. Design system vigente.
4. Canvas Stitch como referencia de composición y jerarquía.

Stitch no es fuente de verdad para rutas, datos, permisos, persistencia ni reglas procedimentales.

## 4. Modelos recomendados

### Diseño visual en Stitch

| Uso                                         | Modelo recomendado      | Motivo                                                               |
| ------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| Variantes rápidas de una vista              | `GEMINI_3_5_FLASH_LITE` | Menor costo y suficiente para composición, jerarquía y estados       |
| Flujo complejo o varias vistas relacionadas | `GEMINI_3_8_FLASH`      | Mejor para mantener relaciones entre pantallas, estados y navegación |

### Implementación de código

- **Planificación:** `planner` o un modelo razonador equivalente.
- **Implementación:** modelo principal con contexto acotado por pantalla y archivos.
- **Revisión:** `code-reviewer` y `security-reviewer` cuando se toquen formularios, permisos, datos NNA o API.
- **Pruebas:** `tdd-guide` para lógica nueva y `e2e-runner` para flujos visuales.
- **Diagnóstico de fallas:** `build-error-resolver` o `gortex-debug`.

La opción más segura no es confiar en un único modelo: usar diseño, implementación y revisión como pasos separados. Ningún modelo garantiza ausencia de errores sin build, tests y revisión humana.

## 5. Flujo por pantalla

### Fase 0: Línea base

1. Confirmar rama y estado de Git.
2. Ejecutar build, tests y lint existentes.
3. Levantar la app en una porta exclusiva.
4. Capturar screenshots en 390, 768 y 1440 px.
5. Registrar errores de consola y requests fallidos.

Criterio de salida: existe una línea base reproducible y se conocen las fallas preexistentes.

### Fase 1: Congelar tokens

Verificar antes de cada cambio:

- `--font-sans` y `--font-display` siguen usando `Inter`.
- Los colores provienen de los tokens existentes.
- No se agregan gradientes, glassmorphism ni colores arbitrarios.
- Radios, sombras y spacing nuevos reutilizan tokens existentes.

### Fase 2: Implementar una superficie

Orden recomendado:

1. Shell y navegación.
2. Dashboard.
3. Expedientes y detalle de expediente.
4. Hitos y notificación de apertura.
5. Bitácora y registro de actuaciones.
6. Anotaciones y modal individual.
7. Nuevo proceso disciplinario.
8. Estudiantes.
9. Asistente legal.
10. Informes.
11. Administración.
12. Login y recuperación.

Para cada superficie:

1. Leer el componente real y sus consumidores.
2. Comparar contra el canvas Stitch.
3. Implementar el cambio mínimo en componentes existentes.
4. Cubrir loading, vacío, error, permiso denegado y datos largos.
5. Verificar foco, teclado y targets táctiles.
6. Ejecutar tests y screenshot antes de pasar a la siguiente.

### Fase 3: Verificación visual

Revisar cada pantalla en:

- 390 px móvil.
- 768 px tablet.
- 1440 px desktop.
- Zoom 200%.
- `prefers-reduced-motion`.
- Datos largos, sin datos y errores de red.

No declarar una pantalla aprobada solo porque coincide con Stitch. Debe funcionar con datos reales de prueba y conservar el flujo existente.

## 6. Reglas específicas para modales

- Usar `Dialog` y `DetailModal` compartidos.
- Título y descripción accesibles aunque sean visualmente ocultos.
- Foco inicial dentro del modal.
- `Escape` cierra cuando la operación no está en curso.
- El foco vuelve al disparador al cerrar.
- Botón de cierre mínimo 44 px en móvil.
- No cerrar silenciosamente si existe un borrador, carga o archivo temporal.
- Acciones destructivas requieren confirmación explícita.

## 7. Reglas para hitos y notificaciones

- Generar borrador no completa un hito.
- Registrar formalmente la notificación completa el hito y crea la actuación auditable.
- Mostrar responsable, fecha, evidencia, documento y estado.
- Las correcciones y anulaciones agregan eventos; nunca borran el registro anterior.
- El texto de la interfaz debe distinguir `Borrador`, `Emitido`, `Corregido` y `Anulado` sin depender solo del color.

## 8. Gates obligatorios por cambio

### Antes de editar

- Impacto de símbolos y rutas revisado.
- Contratos de datos identificados.
- No hay cambios concurrentes incompatibles.

### Después de editar

- `git diff --check`.
- Lint del área modificada.
- Typecheck o build.
- Tests unitarios relacionados.
- E2E del flujo afectado.
- Screenshot desktop y mobile.
- Revisión de consola y red.

### Antes de merge

- Revisión funcional.
- Revisión visual.
- Revisión de accesibilidad.
- Revisión de seguridad si se tocaron datos, autenticación, permisos o archivos.
- Confirmación de que paleta y `Inter` no cambiaron.

## 9. Estrategia de commits

Un commit por superficie o flujo:

- `ui: ajustar shell y navegación`
- `ui: mejorar listado de expedientes`
- `ui: integrar vista de hitos`
- `ui: mejorar modal de anotaciones`
- `ui: mejorar nuevo proceso disciplinario`
- `ui: ajustar responsive y estados`

No mezclar refactors, migraciones de datos y cambios visuales en el mismo commit.

## 10. Rollback

Si falla build, tests, permisos, persistencia o flujo legal:

1. Detener la siguiente fase.
2. Identificar el commit de la superficie afectada.
3. Revertir solo ese commit, sin tocar cambios ajenos.
4. Repetir la línea base.
5. Corregir con un cambio más pequeño.

No borrar migraciones existentes ni ejecutar SQL destructivo para resolver un problema visual.

## 11. Criterios de aceptación final

- Todas las vistas usan la paleta existente y `Inter`.
- No quedan rutas ni enlaces al Plan de Gestión.
- Los modales funcionan con teclado y lector de pantalla.
- Los formularios muestran errores junto al campo y estados de carga.
- Hitos, notificaciones y bitácora conservan trazabilidad.
- No existen overflow horizontales en 390 px.
- Dashboard y tablas tienen una estrategia móvil explícita.
- Build, lint, tests y E2E pasan.
- No hay errores críticos de consola.
- Cada canvas Stitch relevante tiene una implementación validada contra código real.

## 12. Primera ejecución recomendada

Implementar primero en este orden:

1. Modal individual de anotaciones.
2. Nuevo proceso disciplinario.
3. Vista de hitos y notificación de apertura.
4. Bitácora y registro de actuaciones.
5. Listado de expedientes.

Estos flujos concentran el mayor riesgo funcional, de accesibilidad y de trazabilidad; conviene validarlos antes de pulir dashboards secundarios.
