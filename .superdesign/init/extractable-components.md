# Componentes extraibles

## Layout

### Sidebar

- Source: `src/widgets/sidebar/Sidebar.tsx`
- Category: layout
- Description: navegacion principal colapsable y responsiva.
- Extractable props: activeItem, collapsed, badge counts, mobile open state.
- Hardcoded: labels, icon names, classes and navigation taxonomy.

### Header

- Source: `src/widgets/header/Header.tsx`
- Category: layout
- Description: barra superior responsiva con marca y acciones de sesion/notificaciones.
- Extractable props: notification count, privacy state, user/session state.
- Hardcoded: product vocabulary and icon treatment.

### AppFooter

- Source: `src/app/components/AppFooter.tsx`
- Category: layout
- Description: pie institucional y referencias normativas.
- Extractable props: none.
- Hardcoded: text, legal references and CSS.

### DetailModalHeader

- Source: `src/shared/ui/DetailModal.tsx`
- Category: layout
- Description: encabezado reutilizable para detalles de causa y estudiante.
- Extractable props: title, metadata, actions, avatarInitial, tabs.
- Hardcoded: structural classes and interaction conventions.

## Basic

- DetailModalContent: `src/shared/ui/DetailModal.tsx`, basic, body content wrapper with ariaLabel.
- TimelineHeader: `src/features/timeline/TimelineHeader.tsx`, basic, case timeline heading and deadline state.
- Severity/status badges: `src/features/causas/`, basic, semantic status and counts.
