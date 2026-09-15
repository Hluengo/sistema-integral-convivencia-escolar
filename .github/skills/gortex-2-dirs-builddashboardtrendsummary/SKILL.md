---
name: gortex-2-dirs-builddashboardtrendsummary
description: "Work in the . +2 dirs · buildDashboardTrendSummary area — 64 symbols across 3 files (78% cohesion)"
---

# . +2 dirs · buildDashboardTrendSummary

64 symbols | 3 files | 78% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `src/features/dashboard/dashboardTrends.ts`
- `src/shared/lib/hooks/useStudentsQuery.ts`

## Key Files

| File                                        | Symbols                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| ``                                          | reduce                                                               |
| `src/features/dashboard/dashboardTrends.ts` | causas, referenceYear, reference, previousWindow, currentWindow, ... |
| `src/shared/lib/hooks/useStudentsQuery.ts`  | getNextPageParam, loaded, allPages, lastPage                         |

## Connected Communities

- **api/services +22 dirs** (6 cross-edges)
- **features/timeline +28 dirs** (2 cross-edges)
- **. +4 dirs · padStart** (2 cross-edges)
- **lib/domain +6 dirs** (2 cross-edges)
- **features/anotaciones +5 dirs** (1 cross-edges)
- **lib/hooks +8 dirs** (1 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (1 cross-edges)
- **features/dashboard +1 dirs · DashboardStats** (1 cross-edges)
- **. +11 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-196")
explore(operation:"context", task:"understand . +2 dirs · buildDashboardTrendSummary", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
