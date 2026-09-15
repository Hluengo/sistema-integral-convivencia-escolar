---
name: gortex-api-services-fn
description: "Work in the api/services · fn area — 143 symbols across 15 files (88% cohesion)"
---

# api/services · fn

143 symbols | 15 files | 88% cohesion

## When to Use

Use this skill when working on files in:

- `src/shared/api/services/admin.service.test.ts`
- `src/shared/api/services/annotations.service.test.ts`
- `src/shared/api/services/auth.service.test.ts`
- `src/shared/api/services/cartas.service.test.ts`
- `src/shared/api/services/causaDocuments.service.test.ts`
- `src/shared/api/services/causas.service.test.ts`
- `src/shared/api/services/checklistProgress.service.test.ts`
- `src/shared/api/services/courses.service.test.ts`
- `src/shared/api/services/disciplinary-rules.service.test.ts`
- `src/shared/api/services/disciplinary-storage.service.test.ts`
- `src/shared/api/services/notifications.service.test.ts`
- `src/shared/api/services/public-dashboard.service.test.ts`
- `src/shared/api/services/reports.service.test.ts`
- `src/shared/api/services/storage.service.test.ts`
- `src/shared/api/services/student-history.service.test.ts`

## Key Files

| File                                                           | Symbols                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/shared/api/services/admin.service.test.ts`                | originalConsoleError, mutableAuth, fn, originalGetSession, supabase, ...              |
| `src/shared/api/services/annotations.service.test.ts`          | gte, lt, MutableSupabase, originalFrom, useAuthStore, ...                             |
| `src/shared/api/services/auth.service.test.ts`                 | originalAuth, originalConsoleError, defaultResult, mutable, options, ...              |
| `src/shared/api/services/cartas.service.test.ts`               | MutableSupabase, installFromMock, resultForTable                                      |
| `src/shared/api/services/causaDocuments.service.test.ts`       | originalConsoleError, mutable, options, supabase, withCausaDocsMocks, ...             |
| `src/shared/api/services/causas.service.test.ts`               | MutableSupabase, mutable, originalTenantId, resultForTable, originalConsoleError, ... |
| `src/shared/api/services/checklistProgress.service.test.ts`    | fn, withProgressMock, T, result, supabase, ...                                        |
| `src/shared/api/services/courses.service.test.ts`              | fn, withFromMock, mutable, supabase, originalConsoleError, ...                        |
| `src/shared/api/services/disciplinary-rules.service.test.ts`   | mutable, originalConsoleError, MutableSupabase, options, supabase, ...                |
| `src/shared/api/services/disciplinary-storage.service.test.ts` | storageHandler, options, mutable, originalConsoleError, supabase, ...                 |
| `src/shared/api/services/notifications.service.test.ts`        | options, supabase, originalRpc, MutableSupabase, mutable, ...                         |
| `src/shared/api/services/public-dashboard.service.test.ts`     | fn, options, originalRpc, supabase, rpc, ...                                          |
| `src/shared/api/services/reports.service.test.ts`              | mutable, supabase, resultForTable, fn, MutableSupabase, ...                           |
| `src/shared/api/services/storage.service.test.ts`              | supabase, originalConsoleError, withStorageMocks, originalWindow, options, ...        |
| `src/shared/api/services/student-history.service.test.ts`      | withHistoryMocks, options, originalFrom, mutable, MutableSupabase, ...                |

## Connected Communities

- **api/services +11 dirs** (2 cross-edges)
- **api/services · makeStorage** (1 cross-edges)
- **api/services +1 dirs · adminRequest** (1 cross-edges)
- **api/services +1 dirs · fetchPublicDashboardKpis** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-224")
explore(operation:"context", task:"understand api/services · fn", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
