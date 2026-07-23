# Coding Standards & Conventions

## TypeScript

```typescript
// ✅ Correcto
import { type User, type Session } from '@supabase/supabase-js';

// ❌ Incorrecto
import { User, Session } from '@supabase/supabase-js';

// ✅ Tipado estricto, sin `any`
const processData = (input: string): Result | null => { ... };

// ❌ Evitar
const processData = (input: any): any => { ... };
```

## File Naming

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes React | PascalCase.tsx | `Button.tsx`, `CausaCard.tsx` |
| Hooks | camelCase con `use` prefix | `useAuth.ts`, `useCausasQuery.ts` |
| Servicios | kebab-case.service.ts | `auth.service.ts`, `causas.service.ts` |
| Stores | camelCase.store.ts | `authStore.ts`, `causasStore.ts` |
| Test files | `*.test.ts` (co-located) | `mappers.test.ts` |
| Types/Interfaces | PascalCase | `Causa`, `BitacoraEntry` |
| Funciones puras | camelCase | `calculateStatus()`, `mapRowToCausa()` |

## Database Naming

| Contexto | Convención | Ejemplo |
|----------|-----------|---------|
| Columnas SQL | snake_case | `estudiante_curso`, `tenant_id` |
| TypeScript | camelCase (mappers) | `estudianteCurso`, `tenantId` |
| Migraciones | timestamp_descripcion.sql | `20260716100000_add_inspectorate.sql` |
| Tablas | plural snake_case | `causas`, `bitacora_entries` |

## Import Order

1. React / librerías externas
2. Librerías internas (zustand, react-query, etc.)
3. Componentes locales
4. Hooks locales
5. Servicios
6. Types/Interfaces
7. CSS/Styles (si los hay)

```typescript
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '@/shared/lib/stores/authStore';
import { Button } from '@/shared/ui/Button';
import type { Causa } from '@/shared/lib/types';
```

## Component Patterns

```typescript
// Props interface
interface ButtonProps {
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  children: React.ReactNode;
}

// Componente funcional
export function Button({ variant, disabled, children }: ButtonProps) {
  return (
    <button className={cn('btn', `btn-${variant}`, disabled && 'btn-disabled')}>
      {children}
    </button>
  );
}
```

## Store Pattern (Zustand)

```typescript
interface StoreState {
  items: Item[];
  selectedId: string | null;
}

interface StoreActions {
  setItems: (items: Item[]) => void;
  selectItem: (id: string) => void;
}

export const useStore = create<StoreState & StoreActions>((set) => ({
  items: [],
  selectedId: null,
  setItems: (items) => set({ items }),
  selectItem: (id) => set({ selectedId: id }),
}));
```

## Service Pattern

```typescript
import { supabase } from '@/shared/api/lib/supabase';

export async function fetchItems(tenantId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return data.map(mapRowToItem);
}
```

## Testing Conventions

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('functionName', () => {
  it('handles happy path', () => {
    const result = functionName(input);
    assert.equal(result, expected);
  });

  it('handles edge case', () => {
    // Test edge case
  });
});
```

## Git Conventions

```bash
# Commits descriptivos en español
git commit -m "fix: corrige extracción de nombre en PDF análisis"
git commit -m "feat: agrega wizard de nuevo proceso disciplinario"
git commit -m "refactor: unifica stores en shared/lib"
```

## UI Conventions

- **Idioma**: Todo el UI en español chileno
- **Tipografía**: Sistema sans-serif con Google Fonts
- **Colores**: Brand colors definidos en `src/index.css` con `@theme`
- **Iconos**: Lucide React icons
- **Responsive**: Mobile-first, sidebar colapsable
- **Accesibilidad**: WCAG 2.1 AA (verificado con @axe-core/playwright)

## License Headers

```typescript
/** @license SPDX-License-Identifier: Apache-2.0 */
```
