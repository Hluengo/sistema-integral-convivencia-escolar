# Rúbrica de evaluación — Rediseño modal de causa

> Escala 0–10 por criterio. Score final = suma ponderada. Pass si ≥ 7.5.
> El Evaluador puntúa capturas 1440px + 375px + reporte axe, nunca solo código.

## Design Quality (peso: 0.35)

- Jerarquía: ¿se lee en 3 segundos quién / en qué está / qué hacer? (identidad → estado → acción)
- Sistema de badges: ¿máximo 3 niveles visuales, sin duplicados header↔panel?
- Ritmo vertical y escala tipográfica consistentes entre las 4 tabs.
- Microcopy ≥11px; números tabulares en fechas y conteos.
- 10 = ganaría premio de diseño; 7 = profesional sólido; <6 = no pasa.

## Originality (peso: 0.30)

- ¿Hay al menos una decisión distintiva (no genérica de admin template)?
  Ej: línea de estado única, tab activo animado, empty-states con carácter,
  footer de stats, `details` elegantes.
- ¿Se siente chileno-profesional (inspectoría) y no startup genérica?
- Penalizar: parecerse al "antes" solo con otros colores.
- 10 = quiebre creativo; 7 = fresco pero seguro; <6 = más de lo mismo.

## Craft (peso: 0.25)

- Alineación, espaciados múltiplos de 4, truncados con `title`, sin overflow en 375px.
- Iconos lucide consistentes (un solo peso visual), `aria-hidden` donde corresponde.
- `progressbar`, `tablist`, `alert` con ARIA intacto; foco visible de marca.
- Código: sin imports muertos, tokens del repo, sin estilos inline salvo `%` de barra.
- 10 = pixel-perfect; 7 = sólido con detalles menores; <6 = descuidos visibles.

## Functionality (peso: 0.10)

- Las 4 tabs navegan (mouse + flechas/Home/End), overlays abren/cierran con foco correcto.
- `typecheck` + `eslint` + unitarios verdes; axe WCAG 2A/2AA en 0 violaciones.
- Sin regresión de datos: mismos conteos y plazos que el "antes" (solo cambia presentación).
- 10 = todo verificado con evidencia; <8 = bloquea el pass aunque el diseño brille.

## Formato del veredicto

```markdown
## Evaluación — iteración N

- Design Quality: X/10 (por qué, 1 línea)
- Originality: X/10 (por qué, 1 línea)
- Craft: X/10 (por qué, 1 línea)
- Functionality: X/10 (evidencia: comandos corridos)
- **Score: Y/10 → PASS / ITERAR (eje a atacar: …)**
```
