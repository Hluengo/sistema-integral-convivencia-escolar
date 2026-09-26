# Rutas y vistas

La navegacion principal se resuelve en `src/app/App.tsx`, `src/app/hooks/useAppNavigation.ts` y `src/shared/lib/stores/uiStore.ts`, no mediante una carpeta file-based completa.

## Vistas

- `/` o vista inicial: Dashboard, resumen operativo y tendencias.
- `/causas`: gestion de causas/casos, filtros, lista y detalle.
- `/anotaciones`: anotaciones de estudiantes y detalle.
- `/timeline`: seguimiento temporal, fases y vencimientos.
- `/login`: `src/pages/login/`, acceso y sesion.
- `/admin`: administracion y configuracion, sujeto a permisos.
- `/reportes`: reportes, sujeto a permisos.

## Shell

Todas las vistas autenticadas reutilizan `App`, `Header`, `Sidebar` y `AppFooter`. Los detalles se muestran en `DetailModal` o panel responsivo.

## Navegacion

- `src/app/hooks/useAppNavigation.ts::useAppNavigation`
- `src/shared/lib/stores/uiStore.ts::initialViewFromPathname`
- `src/widgets/sidebar/Sidebar.tsx::NAV_ITEMS`
