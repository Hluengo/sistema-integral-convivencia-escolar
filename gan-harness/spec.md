# Brief — Rediseño visual del modal de causa (GAN harness)

> Convención del repo: comunicación en español (es-CL), identificadores técnicos en inglés.

## 1. Cómo se maneja hoy (determinado del código)

- **Apertura:** `src/features/causas/MainContent/CausasView.tsx` (lazy + `DetailModalSkeleton`).
  Botón "Gestionar expediente" → selección en estado + deep link `/expedientes/:causaId`
  vía bridge propio History API ↔ `uiStore` (`useUrlRouting`, `src/app/routing.ts`).
  Sin react-router (vetado por advisory de seguridad, ver `docs/frontend-improvement-plan.md`).
- **Contenedor:** `src/features/causas/CausaDetailModal.tsx` → Radix `Dialog` +
  `DetailModalContent` (`src/shared/ui/DetailModal.tsx`):
  `h-[min(94vh,980px)] × w-[min(96vw,72rem)]`, un solo scroll interno, `hideClose`.
- **Contenido:** `InteractiveTimeline key={causa.id}` =
  `TimelineHeader` (avatar inicial, título, 6 badges, acciones Cerrar causa / Editar / X) +
  `DetailModalTabs` (roving tabindex, flechas/Home/End, `detail-tab-*` / `detail-tabpanel-*`) +
  `TimelineTabPanels` (render condicional) + `TimelineOverlays` (EditCausaModal, ForceClose…).
- **Tabs (4):** Resumen (`ResumenTab`) · Ruta (`RutaExpedienteTab` + `TimelinePhaseWorkspace` +
  `ProcesoTab`) · Historial (`BitacoraTab`) · Expediente (`CausaExpedienteTab` =
  `MatrizPanel` + `EstadoProcedimental` + `ExpedienteExportPanel`).
- **Datos:** objeto `causa` por props + React Query por tab (hechos, evidencias, bitácora);
  `privacyMode` enhebrado; `ViewLoader` mientras `isLoading`.

## 2. Auditoría visual (hallazgos a resolver)

**Altos**

1. Header con 6 badges de igual jerarquía: curso, expediente, gravedad, estado, cierre, alertas.
   Todo grita, nada destaca. El título se trunca en mobile (`PAZ CATALINA DEYANIRA M…`).
2. Conteos duplicados entre tabs y paneles (docs/registros en badges de tab y en trazabilidad).
3. Microcopy de 10–11px (`text-10px/11px`) en metadatos: legible pero al límite; paleta
   `neutral-500` sobre blanco pasa AA por contraste (~4.8:1), no por tamaño.
4. Diálogos apilados (Editar, ForceClose, Cerrar causa sobre el modal): riesgo de foco
   con `hideClose` personalizado (ver `docs/operations/runbook-frontend-ux-ui.md`).

**Medios** 5. Sin control de densidad (todo `text-xs/sm` fijo) ni modo oscuro. 6. Sin atajos de teclado visibles (tabs ya soportan flechas, pero nada lo comunica). 7. Progreso y estados repartidos en 3 componentes (`ResumenTab`, `TimelinePhaseWorkspace`,
`EstadoProcedimental`) con lenguajes levemente distintos. 8. Movimiento mínimo: `reduce-motion` respetado, pero sin transiciones de tab
(cambio seco de panel).

## 3. Objetivo del rediseño

Modal **profesional, moderno y actualizado** para inspectoría chilena:
jerarquía clara (identidad → estado → acción), sistema de badges con 3 niveles
(crítico / informativo / neutro), escala tipográfica con ritmo, transiciones sutiles,
densidad consistente, manteniendo WCAG 2.2 AA y el stack actual.

## 4. Restricciones duras (no negociables)

- Solo cambios **visuales**: sin alterar lógica de plazos, auditoría, queries ni stores.
- Stack: React 19 + Vite + Tailwind 4 + Radix + lucide-react. Sin dependencias nuevas.
- Tokens existentes (`brand-*`, `neutral-*`, `grave-*`, `gravisima-*`, `leve-*`).
- A11y: roving tabindex y `tablist/tab/tabpanel` intactos; axe WCAG 2A/2AA en 0 violaciones;
  `reduce-motion` respetado; foco visible siempre.
- `DetailModalContent` sigue siendo el único scroll; `hideClose` + cierre accesible.
- Responsive: 1440px y 375px sin overflow horizontal.
- Verificación por iteración: `typecheck` + `eslint` + unitarios + spec Playwright
  temporal (axe + screenshots 1440/375, borrar después).

## 5. Dirección creativa (punto de partida, el Generador puede romperla)

- Header: título + línea de estado única (fase · días restantes · alertas) en vez de 6 badges;
  avatar con inicial + anillo de gravedad; acciones agrupadas en menú secundario salvo
  "Cerrar causa".
- Tabs: indicadores solo con dato accionable; pestaña activa con subrayado animado
  (`layoutId`) en vez de solo pastilla.
- Paneles: tarjetas con header de sección consistente (eyebrow + título + conteo),
  microcopy ≥11px, números tabulares para fechas/conteos.
- Detalles que elevan: skeleton coherente por tab, empty-states ilustrados con icono,
  transición de panel de 120–160ms, focus ring de marca.

## 6. Parámetros del loop

- `--max-iterations 10` (default). `--pass-threshold 7.5` (default).
- Cada iteración: Generador implementa variante mínima → capturas Playwright →
  Evaluador puntúa con `eval-rubric.md` → se itera el eje más bajo.
- Criterio de término: score ponderado ≥ 7.5 o 10 iteraciones. Solo entonces commit atómico.
