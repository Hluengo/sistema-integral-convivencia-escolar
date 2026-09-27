# Sistema de diseno para auditoria UI/UX

## Producto

Sistema Integral de Convivencia Escolar para gestionar casos, anotaciones, debido proceso, estudiantes y seguimiento institucional. Usuarios principales: equipos de convivencia, inspectoria, direccion y administracion escolar. El producto debe priorizar claridad operativa, trazabilidad, resguardo de NNA, lectura rapida de estados y acciones seguras.

## Direccion a explorar

Explorar una evolucion editorial-operativa del sistema actual: interfaz sobria, humana y de alta confianza; jerarquia fuerte para trabajo administrativo; superficies claras con acentos azul profundo, cian y naranja solo para urgencia; menos apariencia de formulario generico y mejor lectura de contexto. No usar gradientes neon, glassmorphism excesivo, ilustraciones decorativas ni tipografias display que reduzcan legibilidad.

## Tokens actuales (ground truth)

- Font sans/display: Inter, system-ui, sans-serif
- Font mono: JetBrains Mono, ui-monospace, monospace
- Brand: brand-50 #edf8fc, brand-100 #d9eff8, brand-300 #64b9d6, brand-500 #0b78aa, brand-700 #075a80, brand-950 #052a3d
- Secondary: secondary-50 #fff7ed, secondary-300 #fdba74, secondary-500 #f97316, secondary-700 #c2410c
- Neutral: neutral-50 #f3f7fa, neutral-100 #e8f0f5, neutral-300 #a9bccb, neutral-500 #5d7285, neutral-700 #294052, neutral-900 #0c2130
- Semantic: leve green, grave amber, muy grave orange
- Type scale: 8px, 9px, 10px, 11px, 12px, 13px, 17px
- Existing UI is Tailwind CSS 4 with Lucide icons and custom utility tokens.

## UX rules for audit

- Every screen must expose current location, primary action and operational status without guesswork.
- Preserve keyboard focus, visible labels, sufficient contrast and touch targets of at least 44px.
- Use color with text/icon/state support; never encode severity by color alone.
- Keep privacy mode and sensitive student data visually obvious.
- Responsive behavior must be intentionally designed for desktop and narrow mobile, not merely stacked.
- Keep the exact product vocabulary: Dashboard, Causas, Anotaciones, Timeline, Admin, Debido Proceso.

## Paleta de estados documentados

Use los siguientes tokens para estados de documentos, cartas y procesos disciplinarios:

| Estado                      | Clase Tailwind                       | Uso recomendado                        |
| --------------------------- | ------------------------------------ | -------------------------------------- |
| Sin medida activa / Vigente | `bg-leve-50 text-leve-800`           | Estados normales, sin acción inmediata |
| Amonestación Escrita        | `bg-grave-50 text-grave-800`         | Acción moderada requerida              |
| Carta de Compromiso         | `bg-muygrave-50 text-muygrave-800`   | Acción urgente requerida               |
| Derivación / Cierre forzoso | `bg-gravisima-50 text-gravisima-800` | Situaciones críticas                   |
| Procesado / Cumplido        | `bg-brand-50 text-brand-800`         | Documentos procesados exitosamente     |
| Archivado                   | `bg-neutral-100 text-neutral-700`    | Documentos inactivos                   |
| Anulado                     | `bg-neutral-200 text-neutral-700`    | Documentos cancelados                  |

### Buenas prácticas

1. **Color + texto/icono**: Nunca codificar severidad solo con color. Siempre acompañar con texto legible o icono.
2. **Touch targets**: Botones e inputs interactivos deben tener al menos 44px × 44px; los checkboxes pueden conservar un control visual de 20px dentro de un label de 44px.
3. **Vocabulario consistente**: Use el vocabulario del producto: Dashboard, Expedientes, Anotaciones, Timeline, Admin, Debido Proceso.
4. **Sin gradientes en texto**: Evite `.text-gradient`; reduce la legibilidad. Use colores sólidos.
5. **Sin glassmorphism excesivo**: Evite `backdrop-filter: blur(20px+)`; use superficies sólidas y sombras.
6. **Naranja solo para urgencia**: El color naranja (`secondary-500`, `secondary-600`) debe resaltar acciones requeridas inmediatamente.

## Source

Canonical tokens: `src/index.css`. Shared shell: `src/widgets/sidebar/Sidebar.tsx`, `src/widgets/header/Header.tsx`, `src/app/components/AppFooter.tsx`, `src/app/App.tsx`.
