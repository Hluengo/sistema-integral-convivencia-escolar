# Zustand Stores

## Store Architecture

El estado global se distribuye en 4 stores especializadas (Zustand).

## 1. `authStore.ts`

**Ubicación**: `src/shared/lib/stores/authStore.ts`

```typescript
interface AuthState {
  user: User | null;           // Supabase User
  tenantId: string | null;     // UUID del tenant activo
  authLoading: boolean;        // Loading state inicial
  showLoginModal: boolean;     // Control del modal login
  isAuthenticated: boolean;    // Computado de user !== null
}

interface AuthActions {
  setShowLoginModal: (v: boolean) => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;
}
```

**Side effect**: Suscripción a `supabase.auth.onAuthStateChange()` al inicializar.

## 2. `causasStore.ts`

**Ubicación**: `src/shared/lib/stores/causasStore.ts`

```typescript
interface CausasState {
  causas: Causa[];
  selectedCausaId: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  selectedFaseFilter: FaseProcedimental | 'Todas';
  searchQuery: string;
}

interface CausasActions {
  setCausas: (causas: Causa[] | ((prev: Causa[]) => Causa[])) => void;
  setSelectedCausaId: (id: string) => void;
  setSaveStatus: (status: SaveStatus | ((prev: SaveStatus) => SaveStatus)) => void;
  setSelectedFaseFilter: (filter: FaseProcedimental | 'Todas') => void;
  setSearchQuery: (query: string) => void;
  handleCreateCausa: (params: CreateCausaParams) => Promise<void>;
  handleDeleteCausa: (id: string, requireAuth?: boolean) => Promise<void>;
  handleUpdateCausa: (updated: Partial<Causa>) => void;
  handleReopenCausa: (causa: Causa) => void;
}
```

**Selectors** (funciones puras):
- `selectActiveCausas(state)` — Excluye cerradas
- `selectClosedCausas(state)` — Solo cerradas
- `selectAulaSeguraCausas(state)` — Activas con comprometeAulaSegura
- `selectFilteredCausas(state)` — Activas + filtro fase + búsqueda
- `selectSelectedCausa(state)` — Causa por selectedCausaId

## 3. `uiStore.ts`

**Ubicación**: `src/shared/lib/stores/uiStore.ts`

```typescript
interface UIState {
  currentView: SidebarView;       // dashboard | causas | informes | alumnos | anotaciones | documentos
  isSidebarCollapsed: boolean;
  mobileShowDetail: boolean;
  privacyMode: boolean;
  showShortcuts: boolean;
  currentRole: UserRole;
  selectedStudentForDocs: string | null;
}

interface UIActions {
  setCurrentView: (view: SidebarView) => void;
  setIsSidebarCollapsed: (v: boolean) => void;
  setMobileShowDetail: (v: boolean) => void;
  setPrivacyMode: (v: boolean) => void;
  setShowShortcuts: (v: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedStudentForDocs: (id: string | null) => void;
}
```

## 4. `toastStore.ts`

**Ubicación**: `src/shared/lib/stores/toastStore.ts`

```typescript
interface ToastState {
  toasts: ToastItem[];
}

interface ToastActions {
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;
}
```

**Comportamiento**: Auto-remueve toasts después de 4 segundos.

## Patrón de Stores

- Estado global mínimo (solo lo que realmente necesitan múltiples componentes)
- Estado local de formularios con `useReducer` o `useState`
- Queries de datos con React Query (no en stores)
- Persistencia de causas via auto-save debounced en hook `useCausasPersistence`
