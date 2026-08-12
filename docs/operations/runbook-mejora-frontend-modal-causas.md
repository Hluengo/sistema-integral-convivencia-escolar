# Runbook: Mejora Frontend del Modal de Causas

**Estado:** Preparado para ejecución
**Alcance:** Solo frontend y experiencia visual
**Fuera de alcance:** Base de datos, API, permisos, modelo de negocio y flujo de debido proceso
**Componentes principales:** `CausaDetailModal`, `InteractiveTimeline`, `TimelineHeader`, `TimelineTabs`, `NewCausaModal`, `EditCausaModal`

## 1. Objetivo

Mejorar la lectura, jerarquía y comportamiento responsive del expediente sin cambiar su arquitectura ni el lenguaje visual existente de la aplicación.

El resultado debe sentirse como una evolución de Expedientes, Anotaciones y Dashboard, no como una pantalla independiente.

## 2. Invariantes

- Conservar las cinco fases: Recepción, Investigación, Resolución, Apelación y Seguimiento.
- Mantener Mediación como subflujo opcional dentro de Investigación.
- Mantener las pestañas `Resumen`, `Ruta del expediente` e `Historial`.
- Mantener separada la notificación de inicio del checklist genérico.
- Mantener los avances repetibles asociados a hitos de Investigación.
- No cambiar nombres de campos, schemas, servicios, hooks ni contratos de API.
- No agregar dependencias.
- No crear otro sistema de modal.
- No enviar datos de estudiantes a servicios externos durante las pruebas visuales.
- No convertir información legal relevante en contenido oculto por defecto.

## 3. Lenguaje visual obligatorio

- Tipografía: Inter y la escala existente.
- Superficies: blanco, `neutral-50`, `neutral-100` y bordes `neutral-200`.
- Color principal: `brand-*` azul institucional.
- Colores semánticos: `leve`, `grave`, `muygrave` y `gravisima` solo para estados y alertas.
- Radios: preferir `rounded-lg`, `rounded-xl` y `rounded-2xl` ya existentes.
- Sombras: `shadow-xs`, `shadow-sm` y `shadow-xl` del sistema actual.
- No introducir fondos degradados nuevos en superficies operativas.
- No usar orbes, blobs, bokeh ni decoración atmosférica.
- No usar títulos de tamaño hero dentro del modal.
- Los botones de iconos deben usar Lucide y tener `aria-label` o tooltip.

## 4. Preparación

Ejecutar desde la raíz del repositorio:

```powershell
git status -sb
Get-Content docs/CONSTITUTION.md -TotalCount 260
Get-Content docs/architecture/frontend.md -TotalCount 180
Get-Content .opencode/skills/ponytail/SKILL.md
```

Confirmar que no existen cambios locales relacionados en:

- `src/features/causas/`
- `src/features/timeline/`
- `src/shared/ui/Dialog.tsx`
- `src/shared/ui/DetailModal.tsx`
- `src/index.css`

Si existen, trabajar sobre ellos y no revertirlos.

## 5. Orden de implementación

### Paso A: Modal principal

Archivos:

- `src/features/causas/CausaDetailModal.tsx`
- `src/features/timeline/InteractiveTimeline.tsx`
- `src/shared/ui/DetailModal.tsx`

Acciones:

1. Mantener `DetailModalContent` como contenedor único de scroll.
2. Conservar el tamaño amplio actual del expediente.
3. Ajustar espaciado interno y separación visual entre header, alertas, tabs y contenido.
4. Verificar que el modal no cambie de tamaño cuando se modifica la pestaña.
5. Mantener el fallback `DetailModalSkeleton`.

### Paso B: Header del expediente

Archivo:

- `src/features/timeline/TimelineHeader.tsx`

Acciones:

1. Mantener el fondo oscuro institucional actual.
2. Reducir la densidad de metadatos mediante agrupación visual, sin eliminar información.
3. Mantener visibles estudiante, curso, folio, gravedad, estado, plazo y apertura.
4. Mantener acciones de editar, eliminar, cerrar causa y cerrar modal.
5. Mantener áreas táctiles mínimas de 40px en acciones móviles.
6. Conservar `privacyMode` y no exponer el nombre real cuando esté activo.

### Paso C: Navegación por pestañas

Archivos:

- `src/features/timeline/TimelineTabs.tsx`
- `src/shared/ui/DetailModal.tsx`

Acciones:

1. Mantener el patrón de tabs existente.
2. Mejorar contraste entre tab activa e inactivas.
3. Mantener scroll horizontal solo en viewport pequeño.
4. Agregar indicadores únicamente si la información ya está disponible sin nuevas consultas.
5. Verificar foco visible, `aria-selected` y navegación con teclado.

### Paso D: Resumen y ruta

Archivos:

- `src/features/timeline/TimelineTabPanels.tsx`
- `src/features/timeline/ProcessChecklist.tsx`
- `src/features/timeline/ChecklistItemCard.tsx`
- `src/features/timeline/InvestigationChecklist.tsx`

Acciones:

1. Usar bloques planos y espaciados, evitando tarjetas dentro de tarjetas.
2. Dar prioridad visual al hito actual y a los riesgos procedimentales.
3. Diferenciar claramente estados completo, pendiente y bloqueado.
4. Mantener la notificación de inicio como área separada.
5. Mantener avances repetibles debajo del hito correspondiente.
6. No ocultar información relevante mediante `details` sin una razón de densidad comprobada.

### Paso E: Edición de causa

Archivos:

- `src/features/causas/ui/EditCausaModal.tsx`
- `src/features/causas/EditCausaModal/EditCausaModalForm.tsx`

Acciones:

1. Mantener React Hook Form, Zod y `editCausaFormSchema`.
2. Convertir el formulario en secciones visuales con separadores suaves:
   - Identificación y clasificación.
   - Relato y observaciones.
   - Aula Segura y confidencialidad.
   - Plazos y suspensión.
   - Superintendencia.
   - NEE y discapacidad.
3. Mantener todos los campos actuales y sus validaciones.
4. Usar footer fijo únicamente si no tapa errores ni campos en móvil.
5. Mantener eliminación detrás de `AlertDialog`.
6. No convertir campos legales en controles exclusivamente colapsables.

### Paso F: Nuevo expediente

Archivos:

- `src/features/causas/ui/NewCausaModal.tsx`
- `src/features/causas/ui/NewCausaForm.tsx`

Acciones:

1. Mantener el formulario en tres bloques: estudiante, clasificación y relato.
2. Mantener el orden actual de selección de curso y estudiante.
3. Mejorar visualmente los estados de carga y curso sin estudiantes.
4. Mantener `ImproveTextarea` y su integración de mejora de texto.
5. Mantener la alerta de Aula Segura para `Gravísima`.
6. Usar el footer fijo solo en móvil si la validación confirma que es usable.

## 6. Accesibilidad

Verificar en cada modal:

- Título y descripción asociados mediante Radix Dialog.
- Cierre con `Esc`.
- Retorno del foco al elemento que abrió el modal.
- Botones con nombre accesible.
- Labels asociados a sus controles.
- Errores con `role="alert"` y `aria-describedby`.
- Contraste AA en textos, estados y botones.
- Sin scroll horizontal accidental.

## 7. Validación visual

Usar estos tamaños:

- Desktop: `1280x800`.
- Laptop: `1024x768`.
- Tablet: `768x1024`.
- Móvil: `390x844`.

Revisar al menos:

1. Abrir una causa activa.
2. Cambiar entre las tres pestañas.
3. Abrir una causa con alertas procedimentales.
4. Abrir una causa con Investigación y avances repetibles.
5. Editar una causa con errores de validación.
6. Abrir y cancelar eliminación.
7. Crear una causa con estudiantes cargando y sin estudiantes.
8. Activar Aula Segura y verificar la alerta.
9. Activar modo privacidad.
10. Cerrar con botón, `Esc` y clic fuera cuando corresponda.

## 8. Validación automatizada

Después de cada bloque significativo:

```powershell
npm run lint
npm run test
npm run build:web
npm run test:a11y
git diff --check
```

Antes de commit:

```powershell
npm run test:e2e
npm run security-audit
git status -sb
```

Si se agregan o modifican componentes TSX en varios módulos, ejecutar también la revisión de React best practices disponible en el entorno.

## 9. Criterios de aceptación

- El modal mantiene la identidad visual de Expedientes, Anotaciones y Dashboard.
- No aparecen colores, tipografías, radios o sombras fuera del sistema existente.
- El expediente es legible en los cuatro viewport definidos.
- Ningún texto, botón o alerta se superpone.
- Las acciones principales son identificables sin explicación adicional.
- El flujo legal no cambia.
- Las cinco fases y Mediación opcional se mantienen intactas.
- Los tests existentes siguen pasando.
- No se agregan dependencias.
- No se modifican API, Supabase ni migraciones.

## 10. Rollback

Si la mejora rompe layout, accesibilidad o flujo:

1. Detener la publicación.
2. Identificar el bloque del runbook que introdujo la regresión.
3. Revertir solo los archivos modificados en ese bloque mediante un commit correctivo.
4. Repetir lint, tests, build y E2E.
5. No revertir migraciones, datos ni commits ajenos.

## 11. Cierre

El trabajo se considera terminado solo cuando el resultado visual fue revisado en desktop y móvil, las validaciones automatizadas pasan y el diff contiene únicamente archivos frontend y sus pruebas asociadas.
