# Auditoria UI/UX — 26 de septiembre de 2026

## Alcance

Se revisaron el shell autenticado, login, dashboard, navegacion movil, expedientes, anotaciones, asistente legal, estudiantes y plan de gestion. La revision uso el runtime local en `http://127.0.0.1:3001`, screenshots desktop/mobile, snapshots de accesibilidad y el codigo compartido de UI.

Restricciones respetadas:

- No cambiar la paleta existente de `src/index.css`.
- No cambiar la fuente `Inter`.
- Mantener la terminologia institucional actual.

## Verificacion de runtime

- Procesos Node de esta app detenidos y levantados nuevamente en `PORT=3001`.
- `GET /api/health`: `200 {"ok":true}`.
- Consola del navegador: sin errores criticos en login y dashboard.
- Navegacion movil verificada: Dashboard, Expedientes, Anotaciones, Asistente Legal, Estudiantes y Plan de Gestion.
- Sin overflow horizontal del documento en viewport de 390px.

## Hallazgos priorizados

### Critico

1. **Tabla mensual no responde correctamente en movil**
   - Evidencia: dashboard en 390px; tabla `Tendencias mensuales de los ultimos 6 meses` renderiza con caja de `1538px` dentro de un contenedor de aproximadamente `313px`.
   - Impacto: datos y columnas quedan fuera del area de lectura y la operacion requiere desplazamiento no evidente.
   - Recomendacion: convertir la tabla en tarjetas/resumen por mes en movil o agregar un contenedor con desplazamiento horizontal anunciado y encabezado fijo.

### Alto

2. **Control Mostrar/Ocultar contrasena fuera del orden de foco**
   - Archivo: `src/pages/login/LoginPage.tsx`, `PasswordInput`.
   - Evidencia: el boton usa `tabIndex={-1}`.
   - Recomendacion: incluirlo en el orden de teclado, mantener nombre accesible y asegurar target de 44px.

3. **Tipografia operativa demasiado pequena**
   - Archivos representativos: `src/index.css`, `src/shared/ui/FormField.tsx`, `src/widgets/sidebar/Sidebar.tsx`, `src/shared/ui/Toast.tsx`, `src/features/admin/AdminView.tsx`.
   - Evidencia: uso extendido de `text-xs`, `text-10px`, `text-11px` y `text-13px` en labels, acciones y estados.
   - Recomendacion: mantener `Inter`, pero subir controles y labels principales a 14–16px; reservar 10–12px para metadatos secundarios.

4. **Skeletons visualmente distintos de sus superficies finales**
   - Archivo: `src/shared/Skeleton.tsx`.
   - Evidencia: skeleton de sidebar oscuro frente a sidebar real blanco; skeleton de detalle usa cabecera oscura frente a modal claro.
   - Recomendacion: alinear color, densidad y geometria de carga con el componente final para evitar saltos perceptuales.

5. **Sistema de superficies mezclado**
   - Archivos: `src/index.css`, `src/widgets/header/Header.tsx`, `src/shared/ui/PageHeader.tsx`, `src/features/dashboard/DashboardStats.tsx`.
   - Evidencia: convivencia de `.glass`, `backdrop-blur`, tarjetas repetidas, bordes y radios distintos.
   - Recomendacion: conservar los colores actuales y unificar solo reglas de superficie, espaciado, radios y jerarquia.

### Medio

6. **Toast con target de cierre pequeno**
   - Archivo: `src/shared/ui/Toast.tsx`.
   - Recomendacion: ampliar el boton de cierre sin alterar el tamano visual del icono.

7. **Dashboard movil muy extenso**
   - Evidencia: aproximadamente `3336px` de alto a 390px, con tendencias, tabla, estado de anotaciones y rankings en una sola secuencia.
   - Recomendacion: priorizar acciones y metricas; colapsar rankings y convertir tendencias secundarias en acordeones o vistas bajo demanda.

8. **Modal de detalle denso en viewport estrecho**
   - Archivo: `src/shared/ui/DetailModal.tsx`.
   - Recomendacion: reducir tabs visibles, priorizar resumen/proximo hito y mover acciones secundarias a menu contextual en movil.

## Referencias Stitch

Proyecto: `Auditoria visual UI UX - Convivencia Escolar`

Design system: `Convivencia Operativa`, basado en la paleta existente y `Inter`.

- Dashboard: `projects/7552398883317426027/screens/3dc0e8e437cb469c80a2809f8f4aeba2`
- Modal de expediente: `projects/7552398883317426027/screens/e6349ae0549f47c6b093dc39b27f587c`
- Login movil: `projects/7552398883317426027/screens/564c367a5d4f41f7a1162470bf2e11de`

Los canvases son referencias de direccion visual; no reemplazan la verificacion contra los componentes reales.

## Siguiente orden de trabajo

1. Corregir foco y target tactil del login.
2. Resolver la tabla/tendencias en movil.
3. Ajustar escala tipografica sin cambiar `Inter`.
4. Alinear skeletons con las superficies reales.
5. Consolidar superficies y densidad del dashboard/modal.
