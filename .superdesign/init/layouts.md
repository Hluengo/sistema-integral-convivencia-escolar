# Layouts

## App shell

- File: `src/app/App.tsx`
- Orchestrates authentication, current view, lazy-loaded feature screens, sidebar/header, modal surfaces and footer.

## Header

- File: `src/widgets/header/Header.tsx`
- Shared top bar with responsive brand treatment, notification/session actions and context for the active workspace.

## Sidebar

- File: `src/widgets/sidebar/Sidebar.tsx`
- Main navigation for Dashboard, Causas, Anotaciones and other views. Supports collapsed state, responsive mobile behavior, keyboard handling and badges.
- Navigation model: `NAV_ITEMS`.

## Footer

- File: `src/app/components/AppFooter.tsx`

```tsx
export default function AppFooter() {
  return (
    <footer className="mt-auto space-y-1.5 border-neutral-200/60 border-t bg-white py-5 text-center text-10px text-neutral-500 sm:py-6">
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 font-medium text-neutral-500">
        <span className="font-semibold text-brand-700">Gestión de Casos</span>
        <span aria-hidden="true">·</span>
        <span>Convivencia Escolar</span>
        <span className="hidden sm:inline" aria-hidden="true">
          ·
        </span>
        <span className="hidden sm:inline">
          Fiscalización &amp; Debido Proceso 2026
        </span>
      </div>
      <p className="mx-auto max-w-lg px-4 font-mono text-9px text-neutral-600 leading-relaxed">
        Circular N° 482 · Ley 21809 · Resguardo de NNA en todo el territorio
        nacional
      </p>
    </footer>
  );
}
```

## Supporting layout symbols

- `src/shared/ui/DetailModal.tsx::DetailModalHeader`
- `src/shared/ui/DetailModal.tsx::DetailModalContent`
- `src/shared/lib/stores/uiStore.ts::useUIStore.setIsSidebarCollapsed`
