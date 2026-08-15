# Runbook: Mejora visual del Asistente Legal — 2026-08-15

**Estado:** Implementado localmente y verificado con agent-browser; sin commit ni push
**Alcance:** `AdvisorView`, `AiAdvisor` y `CaseLegalWorkspace`
**Restricción:** No modificar la lógica jurídica, los proveedores de IA, los datos de causas ni el flujo de debido proceso.

## Objetivo

Mejorar la jerarquía visual y la experiencia responsive del Asistente Legal manteniendo la coherencia institucional de la aplicación: `PageHeader`, tarjetas blancas, bordes neutros, azul institucional y estados semánticos existentes.

## Diagnóstico

- Las pestañas Consulta, Redacción, Plantillas y Auditoría tienen poca diferenciación visual.
- En móvil, las pestañas dependen demasiado del desplazamiento horizontal.
- El chat puede crecer demasiado verticalmente y no delimita claramente conversación y compositor.
- Las consultas sugeridas ocupan demasiado espacio antes de iniciar una conversación.
- El expediente seleccionado no tiene suficiente peso como contexto de trabajo.
- La herramienta activa y la vigencia normativa podrían ser más visibles.

## Fases de implementación

### 1. Navegación visual

- Mantener `PageHeader` y su jerarquía actual.
- Convertir las pestañas en navegación segmentada con icono, estado activo e indicador visual claro.
- Mantener navegación horizontal usable en móvil.
- Incorporar `aria-controls`, `aria-selected` y foco visible coherente.

### 2. Consulta legal

- Delimitar la altura del panel de conversación en desktop y móvil.
- Mantener el compositor de mensajes al pie del panel.
- Separar visualmente encabezado, conversación, sugerencias y entrada.
- Reducir las consultas sugeridas a tarjetas compactas.
- Mostrar estados visibles: “Listo para consultar” y “Analizando normativa”.

### 3. Redacción y Auditoría

- Convertir el selector de expediente en una tarjeta contextual.
- Mostrar estudiante, curso, ID de causa y herramienta activa.
- Reutilizar el mismo encabezado contextual en ambas herramientas.
- Mantener la advertencia legal visible con menor peso visual.

### 4. Plantillas

- Mantener la carga lazy del editor.
- Incorporar encabezado visual común para la administración de plantillas.
- Diferenciar edición, selección y guardado sin duplicar lógica.

### 5. Responsive y accesibilidad

- Evitar desbordes horizontales en tabs, selectores y mensajes.
- Usar botones de sugerencias a ancho completo en móvil.
- Mejorar contraste de textos pequeños.
- Verificar foco visible y nombres accesibles en tabs, selector, entrada y botones.
- Conservar el modo privacidad para nombres de estudiantes.

## Validación

- Consulta legal carga sin errores.
- Las cuatro pestañas conservan su estado activo.
- El chat permite enviar mensajes y mantiene el scroll.
- Las consultas sugeridas siguen funcionando.
- Redacción sin expediente muestra un estado vacío claro.
- Redacción con expediente muestra el contexto seleccionado.
- Auditoría conserva su flujo actual.
- Plantillas continúa cargando de forma diferida.
- Desktop y móvil no presentan desbordes visuales.
- `npm run lint`, `npm run test`, `npm run build:web` y E2E pasan.

## Rollback

Revertir únicamente los cambios visuales de `AdvisorView.tsx`, `AiAdvisor.tsx`, `CaseLegalWorkspace.tsx` y sus estilos asociados. No revertir cambios de backend, migraciones, datos, autenticación ni proveedores de IA.

## Criterio de cierre

El Asistente Legal debe sentirse parte de la misma aplicación, permitir identificar rápidamente el contexto de trabajo y mantener intactos los flujos legales existentes.
