---
name: tailwind-review
description: Revisa estilos Tailwind CSS: consistencia, responsive, accesibilidad, performance. Trigger: Tailwind, CSS, estilos, responsive,accesibilidad.
---

# Tailwind Review

Guía para revisar y optimizar estilos Tailwind CSS.

## Checklist de Revisión

### 1. Consistencia
- [ ] Uso de theme tokens (`text-brand-600`)
- [ ] Sin colores hardcodeados
- [ ] Espaciado consistente
- [ ] Tipografía uniforme

### 2. Responsive
- [ ] Mobile-first
- [ ] Breakpoints apropiados
- [ ] Touch targets mínimos (44px)
- [ ] Texto legible en móvil

### 3. Accesibilidad
- [ ] Contraste suficiente (WCAG AA)
- [ ] Focus rings visibles
- [ ] Alt text en imágenes
- [ ] ARIA labels cuando necesario

### 4. Performance
- [ ] Sin clases duplicadas
- [ ] Purge configurado
- [ ] Sin estilos inline innecesarios
- [ ] CSS mínimo

### 5. Mantenibilidad
- [ ] Orden consistente de clases
- [ ] Componentes reutilizables
- [ ] Utilidades personalizadas cuando aplique
- [ ] Comentarios en complejos

## Theme Tokens (v4)
```css
@theme {
  --color-brand-50: #f0f4ff;
  --color-brand-600: #3b82f6;
  /* ... */
}
```

## Patrones Comunes
```tsx
// Card
<div className="bg-white rounded-xl border border-neutral-200/80 shadow-sm p-4">

// Button
<button className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg">

// Input
<input className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-200">
```

## Comandos Relacionados
- `@tailwind-review` para Tailwind
- `@frontend` para UI
- `@reviewer` para revisión
