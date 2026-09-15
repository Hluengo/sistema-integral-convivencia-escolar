---
name: gortex-app-components-6-dirs
description: "Work in the app/components +6 dirs area — 140 symbols across 16 files (80% cohesion)"
---

# app/components +6 dirs

140 symbols | 16 files | 80% cohesion

## When to Use

Use this skill when working on files in:

- `src/app/App.tsx`
- `src/app/components/AppFooter.tsx`
- `src/app/components/AppLoadError.tsx`
- `src/app/components/SkipToContent.tsx`
- `src/app/hooks/useCausaWorkspace.ts`
- `src/app/hooks/useRoleGates.ts`
- `src/app/hooks/useWelcomeGate.ts`
- `src/shared/Skeleton.tsx`
- `src/shared/lib/AppContext.tsx`
- `src/shared/lib/causaPermissions.ts`
- `src/shared/lib/stores/causasStore.ts`
- `src/shared/lib/stores/toastStore.ts`
- `src/shared/lib/stores/uiStore.ts`
- `src/shared/lib/useAppContext.ts`
- `src/shared/ui/MembershipLoading.tsx`
- `src/shared/ui/Toast.tsx`

## Key Files

| File                                   | Symbols                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/app/App.tsx`                      | selectedCausaId, profileRole, onboardingEnabled, loadError, setSelectedCausaId, ...        |
| `src/app/components/AppFooter.tsx`     | AppFooter                                                                                  |
| `src/app/components/AppLoadError.tsx`  | AppLoadError                                                                               |
| `src/app/components/SkipToContent.tsx` | SkipToContent                                                                              |
| `src/app/hooks/useCausaWorkspace.ts`   | setSelectedCausaId, loadError, markCausaHydrated, setCausas, selectedCausa, ...            |
| `src/app/hooks/useRoleGates.ts`        | onboardingEnabled, effectiveAdminRole, useRoleGates, resolveRoleGates, canAccessAdmin, ... |
| `src/app/hooks/useWelcomeGate.ts`      | useWelcomeGate, setShowWelcome, dismissWelcome, showWelcome, loginFromWelcome              |
| `src/shared/Skeleton.tsx`              | CommandPaletteSkeleton                                                                     |
| `src/shared/lib/AppContext.tsx`        | AppProvider                                                                                |
| `src/shared/lib/causaPermissions.ts`   | canDeleteCausaForRoles, profileRole, appRole                                               |
| `src/shared/lib/stores/causasStore.ts` | useCausasStore, selectClosedCausas, selectAulaSeguraCausas, state, state, ...              |
| `src/shared/lib/stores/toastStore.ts`  | useToastStore                                                                              |
| `src/shared/lib/stores/uiStore.ts`     | useUIStore                                                                                 |
| `src/shared/lib/useAppContext.ts`      | isAuthenticated, setSelectedCausaId, setShowLoginModal, appRole, closedCausas, ...         |
| `src/shared/ui/MembershipLoading.tsx`  | setTimedOut, timedOut, MembershipLoading                                                   |
| `src/shared/ui/Toast.tsx`              | removeToast, ToastProvider, toasts                                                         |

## Entry Points

- `src/app/App.tsx::App`

## Connected Communities

- **lib/hooks +7 dirs · useMemberships** (17 cross-edges)
- **. +11 dirs** (10 cross-edges)
- **features/timeline +28 dirs** (8 cross-edges)
- **app** (1 cross-edges)
- **. +1 dirs · isMediationActive** (1 cross-edges)
- **. +8 dirs** (1 cross-edges)
- **features/timeline +22 dirs** (1 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (1 cross-edges)
- **app/hooks +2 dirs** (1 cross-edges)
- **widgets/header +5 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-358")
explore(operation:"context", task:"understand app/components +6 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"src/app/App.tsx::App"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
