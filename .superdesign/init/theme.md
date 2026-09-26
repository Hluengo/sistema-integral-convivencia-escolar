# Tema y tokens

## Resumen compacto

- Sans/display: Inter; mono: JetBrains Mono.
- Brand azul: #edf8fc, #d9eff8, #64b9d6, #0b78aa, #075a80, #052a3d.
- Acento naranja: #fff7ed, #fdba74, #f97316, #c2410c.
- Neutrales: #f3f7fa, #e8f0f5, #a9bccb, #5d7285, #294052, #0c2130.
- Severidad: leve verde, grave amber, muy grave naranja.
- Tipo: 8/9/10/11/12/13/17px.
- CSS: Tailwind 4, tokens definidos con `@theme`.

## Fuente completa

Canonical source: `src/index.css` (557 lines). Always pass the relevant token block rather than the entire file when the design payload is large.

```css
@import "tailwindcss";
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-display: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --color-brand-500: #0b78aa;
  --color-brand-700: #075a80;
  --color-secondary-500: #f97316;
  --color-neutral-50: #f3f7fa;
  --color-neutral-900: #0c2130;
}
```
