# 07 — State Management

> **Referencia detallada:** `docs/architecture/stores.md`, `docs/architecture/hooks.md`

## State Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Zustand (Global)                   │
│  authStore | causasStore | uiStore | toastStore      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              React Query (Server State)              │
│  ['courses'] (30min stale) | ['students'] (10min)   │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              useReducer (Local Form)                 │
│  useNewCausaForm | useDocumentState                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              React Context (Subtree)                 │
│  AppProvider | TimelineProvider                      │
└─────────────────────────────────────────────────────┘
```

## Zustand Stores

### authStore
```
State:
  user: User | null
  tenantId: string | null
  authLoading: boolean
  showLoginModal: boolean

Actions:
  setUser, setShowLoginModal, setAuthLoading

Side effect: subscribe onAuthStateChange on init
```

### causasStore
```
State:
  causas: Causa[]
  selectedCausaId: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  selectedFaseFilter: FaseProcedimental | 'Todas'
  searchQuery: string

Actions:
  setCausas, setSelectedCausaId, handleCreateCausa,
  handleDeleteCausa, handleUpdateCausa, handleReopenCausa
```

### uiStore
```
State:
  currentView: SidebarView
  isSidebarCollapsed: boolean
  privacyMode: boolean
  showShortcuts: boolean
  currentRole: UserRole

Actions:
  setCurrentView, setIsSidebarCollapsed, togglePrivacy, etc.
```

### toastStore
```
State:
  toasts: ToastItem[]

Actions:
  addToast(type, message)  ← auto-removes after 4s
  removeToast(id)
```

## React Query Config

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,  // 5 min default
    },
  },
});
```

## Auto-save Pipeline

```
User edits causa → causasStore.setCausas()
  → useCausasPersistence detects change
  → Debounce 2s
  → updateCausa() + saveBitacora() + saveChecklist()
  → saveStatus = 'saved'
  → If error → saveStatus = 'error' + toast
```
