# Brief — Rediseño visual del tab Ruta del expediente (GAN harness)

> Convención del repo: comunicación en español (es-CL), identificadores técnicos en inglés.
> Loop: `--max-iterations 10` (default), `--pass-threshold 7.5` (default).
> Rúbrica: `gan-harness/eval-rubric.md` (Design 0.35, Originality 0.30, Craft 0.25, Functionality 0.10).

## 1. Alcance

Solo `src/features/timeline/RutaExpedienteTab.tsx` (el workspace de fase que se
despliega debajo es otro componente, fuera de alcance). Nada de lógica: mismos
datos, mismos textos visibles, mismas props y ARIA.

## 2. Estado actual (del código + captura del usuario)

1. **Paleta cruda fuera de tokens**: `green-600/100/700` (fases completadas,
   hitos) y `amber-50/800` (aviso de actividad tardía). Deben ser `leve-*` y
   `grave-*` del tema.
2. **Redundancia de microcopy**: el chip dice literal `Plazo: Cierre: …`.
3. **Ruido repetido**: 5 pastillas idénticas "Ver hitos →", una por fase.
4. **Huesos buenos**: stepper 5 columnas en desktop / vertical en móvil,
   fase actual con anillo, 3 tarjetas inferiores (Fase actual · Próximo hito ·
   Actividad registrada). Conservar la estructura, elevar el acabado.
5. Iconografía inconsistente en "Actividad registrada" (3 chips redondos de
   colores distintos sin sistema).

## 3. Objetivo

Vista **profesional y distintiva** de inspectoría chilena: jerarquía
identidad → estado → acción, sistema de color 100% tokens del repo, menos
ruido, un gesto original (no template admin genérico). Todo lo medible igual.

## 4. Restricciones duras (no negociables)

- Solo cambios **visuales** en `RutaExpedienteTab.tsx`. Sin tocar datos,
  queries, stores, ni el workspace de fase.
- Stack actual, sin dependencias nuevas. Tokens (`brand-*`, `neutral-*`,
  `grave-*`, `gravisima-*`, `leve-*`).
- **Literales intactos** (los afirman tests): `Ruta del expediente`,
  `Elige una fase para registrar y consultar sus hitos.`, `Ver hitos`,
  `Fase actual`, `Próximo hito`, `Registrar`, `Actividad registrada`,
  `hitos completados`, `documentos`, `registros en historial`, `hitos`,
  `Sin hitos pendientes en esta etapa.`, `Hay actividad registrada en`.
- ARIA intacto: `aria-expanded/controls/label` de fases, foco visible,
  axe WCAG 2A/2AA en 0 violaciones, `reduce-motion` respetado.
- Responsive 1440px y 375px sin overflow horizontal.
- Verificación por iteración: `typecheck` + `eslint` + unitarios + spec
  Playwright temporal (axe + screenshots 1440/375, borrar después).

## 5. Dirección creativa (punto de partida, el Generador puede romperla)

- Riel de fases con conector continuo en vez de 5 segmentos sueltos; fase
  actual elevada (anillo + etiqueta), completadas en `leve`, futuras
  atenuadas; "Ver hitos" solo visible en hover/foco o como chevron sutil.
- Chip de plazo en una línea de estado única, sin "Plazo: Cierre:" duplicado.
- Tarjetas inferiores con header de sección consistente (eyebrow + dato
  hero tabular); aviso de actividad tardía integrado al sistema `grave`.
- Un detalle con carácter: numeración tabular, transición de 120–160ms al
  seleccionar fase, focus ring de marca.
