# Componentes compartidos

Framework: React 19 + Vite. CSS: Tailwind CSS 4 via `src/index.css`. Icons: `lucide-react`. Primitives are mostly custom React components under `src/shared/ui/`.

## DetailModal

- Source: `src/shared/ui/DetailModal.tsx`
- Reusable modal composition with `DetailModalContent`, `DetailModalHeader`, tabs and body helpers. Used by case and student detail flows.
- Key props: title, metadata, actions, avatarInitial, tabs, ariaLabel.

## Shared UI inventory

- `src/shared/ui/DetailModal.tsx`: modal shell and detail headers/content.
- `src/shared/ui/`: buttons, badges, dialogs, form controls and other primitives; inspect source before each target draft.
- `src/features/causas/`: case cards, filters and status presentation.
- `src/features/anotaciones/`: student detail and annotation controls.

## Visual conventions

Tailwind utility classes, Inter typography, custom brand/semantic color tokens, Lucide iconography, compact density and explicit responsive variants.
