# Runbook: Mejora visual del historial de estudiantes — 2026-08-15

**Estado:** Implementado localmente; sin commit ni push
**Alcance:** `StudentsPanel` y sus indicadores visuales
**Dependencias:** `get_student_activity_history`

## Objetivo

Hacer evidente qué estudiantes requieren atención, destacando causas abiertas sin convertir la vista en una segunda pantalla de Causas o Anotaciones.

## Cambios aplicados

- Indicadores superiores para estudiantes con actividad, causas abiertas y anotaciones.
- Encabezados de curso con estudiantes, causas abiertas y anotaciones.
- Actividad por estudiante separada en causas abiertas, causas totales y anotaciones.
- Los filtros y búsquedas expanden visualmente los cursos con resultados.
- Acordeones con `aria-expanded` y `aria-controls`.
- Vista móvil en tarjetas compactas; tabla conservada para escritorio.
- Estados vacío, error y carga conservan el lenguaje visual existente.

## Criterios de validación

- El 7B muestra 4 estudiantes con causas vinculadas.
- Se distinguen 3 causas abiertas y 1 cerrada.
- La búsqueda no deja resultados ocultos dentro de cursos colapsados.
- El filtro por curso abre el grupo correspondiente.
- En móvil no es necesario desplazarse horizontalmente para leer la actividad principal.
- El foco de teclado y los nombres accesibles de los acordeones funcionan.
- `npm run lint`, `npm run test`, `npm run build:web` y `git diff --check` pasan.

## Rollback

Revertir únicamente el archivo `src/features/students/StudentsPanel.tsx` y este runbook si la mejora visual no es aprobada. No revertir migraciones ni cambios de datos del historial.

## Criterio de cierre

La vista permite identificar rápidamente estudiantes con causas abiertas y conserva la navegación histórica sin duplicar la gestión detallada.
