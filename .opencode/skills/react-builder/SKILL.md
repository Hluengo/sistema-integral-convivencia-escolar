---
name: react-builder
description: Construye y optimiza componentes React con TypeScript y Tailwind CSS. Trigger: componente, React, UI, interfaz, diseño.
---

# React Builder

Guía para construir componentes React modernos y optimizados.

## Convenciones del Proyecto

### Estructura de Componente
```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Props {
  // Definir props con tipos estrictos
}

export default function ComponentName({ prop1, prop2 }: Props) {
  // Hooks al inicio
  // Lógica derivada
  // Handler functions
  // Return JSX
}
```

### Reglas
1. Siempre usar `interface` para props
2. Named exports preferidos
3. Un componente por archivo
4. Hooks en archivos separados en `src/hooks/`
5. Componentes lazy-loaded en `App.tsx`

### Tailwind CSS v4
- Theme tokens en `src/index.css` con `@theme`
- No usar `tailwind.config.*`
- Utilizar tokens del theme: `text-brand-600`, `bg-neutral-50`
- Responsive: `sm:`, `md:`, `lg:`

### Estado
- `useState` para estado local
- `useContext` para estado compartido (AppContext, TimelineContext)
- `useMemo` para valores computados costosos
- `useCallback` para funciones estables

### Performance
- Lazy loading con `React.lazy()` y `Suspense`
- `useMemo` para cálculos pesados
- `useCallback` para handlers
- Evitar re-renders innecesarios

## Comandos Relacionados
- `@frontend` para diseño de UI
- `@developer` para implementación
- `@reviewer` para revisión de código
