# DESIGN.md — Sistema Integral de Convivencia Escolar

Autoridad visual del proyecto. Si el código contradice este documento, gana el documento y se corrige el código.
Tokens en `src/index.css`; componentes base en `src/shared/ui`.

## Contexto de uso

Herramienta operativa y de lectura para equipos de convivencia escolar. Se usa en notebook y tablet, con expedientes reales y plazos legales. Prioridad: legibilidad, jerarquía clara y estados inequívocos por sobre expresión visual.

## Superficies

| Token | Valor | Uso |
|---|---|---|
| `bg-surface` | `#f3f7fa` | Fondo de página (`body`) |
| `bg-surface-sunken` | `#f8fafc` | Paneles internos, timeline, cuerpo de modales |
| `bg-white` | `#fff` | Tarjetas, tablas y controles elevados |

No se inventan fondos nuevos con hex sueltos. Un hex solo se acepta en documento impreso, exportación a Excel o preview de carta.

## Color

Escalas: `brand` (azul institucional), `secondary` (naranja), `neutral`, y severidad `leve` / `grave` / `muygrave` / `gravisima`.

**Regla de rampa:** 500 y 600 son para rellenos, bordes e iconos. **700 en adelante es para texto.** Los tonos 600 no alcanzan 4.5:1 como texto (leve-600 = 3.30, grave-600 = 3.19) y no deben usarse en `<p>`, `<span>` ni labels.

- Texto principal: `text-neutral-800` / `text-neutral-900`.
- Texto secundario y metadatos: `text-neutral-600`. Piso permitido: `text-neutral-500` (4.99:1).
- `text-neutral-400` (3.03:1) queda prohibido en texto; solo iconos decorativos o `disabled:`.
- Placeholders: `placeholder:text-neutral-500`.
- El color nunca es el único portador de estado: severidad y estado siempre llevan texto.

## Tipografía

Inter para UI, JetBrains Mono para números, fechas y códigos de expediente.

| Rol | Clase |
|---|---|
| Título de página | `text-2xl font-bold` |
| Título de sección / modal | `text-sm font-bold` o `text-base font-semibold` |
| Cuerpo | `text-sm` (14px) |
| Secundario | `text-xs` (12px) |
| Metadatos y chips | `text-11px` |

Piso absoluto: **11px**. No existen `text-8px`, `text-9px` ni `text-[Npx]`: la escala vive en `@theme` (`text-11px`, `text-13px`). Cualquier texto que se lea en flujo va en `text-xs` o superior.

## Espaciado y radios

Radios: `rounded-lg` (12px) en controles, `rounded-xl` (16px) en tarjetas y contenedores, `rounded-full` en chips. No mezclar `rounded-md` con `rounded-xl` en la misma superficie.

## Foco y teclado

Anillo global en `*:focus-visible` (outline 2px `brand-500`) más `box-shadow` de 3px en controles. Ningún componente puede eliminarlo con `outline-none` sin reemplazo visible. Todo control tiene nombre accesible: `aria-label` si es solo icono.

## Objetivos táctiles

44×44 px mínimo en botones de icono (`min-h-11 min-w-11` + `inline-flex items-center justify-center`). En tablas se puede conservar la altura de fila con padding vertical negativo, nunca bajando el área activa de 44 px.

## Movimiento

- Duraciones: 200–350 ms, `--ease-out-expo`.
- Se anima `transform` y `opacity`. No `width`, `height` ni `top`.
- `prefers-reduced-motion` se respeta una sola vez, de forma global (`src/index.css`); no se duplican bloques.
- El movimiento comunica estado (aparición de modal, guardado, foco). No es decoración.

## Tablas

`<th scope="col">` siempre; `scope="row"` en la primera celda cuando la fila identifica una entidad. Contenedor con `overflow-x-auto`; nunca truncar columnas que contienen datos legales.

## Estados

- Guardado: `SaveStatus` con icono + texto; "Guardado" en `leve-700`.
- Error: `role="alert"` + `gravisima-700`, nunca solo color.
- Vacío: ilustración o icono `neutral-400`, texto explicativo en `neutral-500` y una acción concreta.
- Carga: `skeleton` con `prefers-reduced-motion` respetado.
