# Paginas y arboles de dependencia

## Dashboard

Entry: `src/app/App.tsx` -> dashboard feature lazy-loaded from `src/app/lazyAppComponents.ts`.
Dependencies: `src/widgets/header/Header.tsx`, `src/widgets/sidebar/Sidebar.tsx`, `src/app/components/AppFooter.tsx`, dashboard feature components, shared UI and `src/index.css`.

## Causas

Entry: `src/features/causas/MainContent.tsx`
Dependencies:

- `src/features/causas/MainContent.tsx`
- `src/features/timeline/TimelineHeader.tsx`
- `src/shared/ui/DetailModal.tsx`
- `src/widgets/sidebar/Sidebar.tsx`
- `src/widgets/header/Header.tsx`
- `src/index.css`

## Timeline

Entry: `src/features/timeline/TimelineHeader.tsx`
Dependencies:

- `src/features/timeline/TimelineHeader.tsx`
- `src/features/causas/causaPresentation.ts`
- `src/features/causas/causaOperationalSummary.ts`
- `src/shared/ui/DetailModal.tsx`

## Anotaciones

Entry: `src/features/anotaciones/AnotacionesStudentDetailModal.tsx`
Dependencies:

- `src/features/anotaciones/AnotacionesStudentDetailModal.tsx`
- `src/shared/ui/DetailModal.tsx`
- shared form, badge and student components

## Login

Entry: `src/pages/login/`
Dependencies: login page components, auth service, shared tokens and accessible form controls.

## Admin / Reportes

Entries are lazy-loaded through `src/app/lazyAppComponents.ts` and gated by navigation permissions from `src/app/hooks/useAppNavigation.ts`.
