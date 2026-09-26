# Auditoria integral UI/UX

Fecha: 2026-09-26
Proyecto Superdesign: `7ac4e515-e017-430e-a6bc-5dd9f2acc41a`
Baseline: `4a1e24a6-62b0-487f-81ca-36938147cfe9`

## Resultado ejecutivo

La base actual es sólida para un producto operacional: shell consistente, acciones con objetivos claros, navegación persistente, estados semánticos, breadcrumbs, foco visible en inputs y layout master-detail para Causas. El principal espacio de mejora no es agregar funcionalidades, sino reducir carga cognitiva, hacer explícita la prioridad procedimental y mejorar la transición entre desktop, tablet y móvil.

## Hallazgos priorizados

### P0 - Riesgo operativo

- **Urgencia dependiente de color y microcopy.** `TimelineHeader`, badges de severidad y alertas comunican vencimientos con color + texto, pero la jerarquía puede competir entre “Aula Segura”, severidad y “vence hoy”. Mantener icono + texto + fecha/hora + acción directa de resolución en todos los estados.
- **Mobile no está demostrado en el baseline.** El sidebar se oculta en `lg` y el workspace master-detail se apila, pero hay que validar que el detalle siga siendo descubrible y que los filtros no empujen la acción primaria fuera de viewport.

### P1 - Fricción alta

- **Sidebar demasiado extenso.** Dashboard, Causas, Anotaciones, Asistente Legal, Estudiantes, Plan de Gestión, reportes y Administración compiten en un solo grupo. Separar trabajo diario de herramientas y configuración, conservando la navegación existente.
- **Densidad tipográfica extrema.** La escala incluye 8-13px para mucha información. Reservar 10px para metadatos y elevar labels accionables, tabs y estados a 12-13px como mínimo.
- **Detalle con demasiadas decisiones paralelas.** Timeline, Antecedentes y Debido Proceso conviven con Editar, alertas, estado y plazo. Fijar una acción primaria contextual y agrupar el resto bajo acciones secundarias.
- **Resumen y lista duplican estados.** Las tarjetas “Activas”, “Por vencer”, “Con alertas” y las filas vuelven a mostrar parte de la misma señal. Hacer que cada tarjeta funcione como filtro aplicado y muestre el resultado activo.

### P2 - Mejora de calidad

- **Footer ocupa espacio en vistas de trabajo.** Mantenerlo institucional, pero colapsarlo visualmente en pantallas densas o llevar referencias normativas a un panel de ayuda.
- **Privacidad necesita persistencia visual.** El botón existe en Header; agregar estado global evidente cuando está activo y confirmar qué campos fueron anonimizados.
- **Accesibilidad de navegación.** Conservar `aria-current`, labels y foco; auditar orden de tabulación en sidebar colapsado, modales y master-detail, además de contraste de textos de 9-10px.
- **Terminología.** Normalizar “Convivencia Escolar”, “Gestión de Casos”, “Causas”, “Debido Proceso” y “Aula Segura” en títulos, breadcrumbs y botones para evitar cambios de contexto percibidos.

## Dirección visual recomendada

Evolucionar hacia un “case record studio” de alta confianza: shell institucional sobrio, navegación por zonas, superficies blancas con separación por bordes, azul profundo para estructura, cian para progreso y naranja/rojo solo para riesgo. El master-detail debe ser la composición principal de Causas y Timeline; Dashboard debe resumir con acciones filtrables; Login debe enfatizar resguardo y confianza; Admin debe priorizar configuración segura y permisos.

## Matriz de auditoría

| Área                        | Estado                | Próximo paso                                               |
| --------------------------- | --------------------- | ---------------------------------------------------------- |
| Arquitectura de información | Parcial               | Separar navegación diaria, análisis y administración       |
| Jerarquía visual            | Parcial               | Una acción primaria por contexto y estados más escalonados |
| Responsive                  | Requiere QA           | Ejecutar desktop, tablet y móvil por cada vista            |
| Accesibilidad               | Base buena, pendiente | axe + teclado + contraste de textos pequeños               |
| Privacidad                  | Parcial               | Estado persistente y explicación de alcance                |
| Consistencia visual         | Buena                 | Consolidar tokens y evitar escalas menores innecesarias    |
| Feedback operacional        | Buena                 | Convertir métricas en filtros y acciones                   |

## Cobertura y limitación

Se creó una reproducción base en Superdesign para el workspace autenticado de Causas/Timeline. La generación de las dos ramas visuales adicionales fue bloqueada por el límite de créditos del equipo después de la primera generación (`71` créditos), por lo que no se inventaron resultados ni se reintentó el consumo. Login, Dashboard, Anotaciones y Admin quedan documentados como objetivos de la siguiente ronda, usando el mismo proyecto y `resume.json`.
