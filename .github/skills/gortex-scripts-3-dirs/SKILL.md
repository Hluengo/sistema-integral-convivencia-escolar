---
name: gortex-scripts-3-dirs
description: "Work in the scripts +3 dirs area — 211 symbols across 6 files (97% cohesion)"
---

# scripts +3 dirs

211 symbols | 6 files | 97% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `api/index.js`
- `scripts/generate-primero-medio-a-presentation.mjs`
- `scripts/validate-multitenant.mjs`
- `scripts/validate-production-roles.mjs`
- `supabase/migrations/20260815030000_atomic_confirm_disciplinary_process.sql`

## Key Files

| File                                                                         | Symbols                                                                             |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| ``                                                                           | reduce, toUpperCase, resolve, startsWith, findIndex, ...                            |
| `api/index.js`                                                               | normalizeText2, searchTerms, normalizeLevel, route handler, generateUniqueSlug, ... |
| `scripts/generate-primero-medio-a-presentation.mjs`                          | bulletList, bars                                                                    |
| `scripts/validate-multitenant.mjs`                                           | createProbeUser                                                                     |
| `scripts/validate-production-roles.mjs`                                      | createUser                                                                          |
| `supabase/migrations/20260815030000_atomic_confirm_disciplinary_process.sql` | confirm_disciplinary_process_atomic                                                 |

## Entry Points

- `api/index.js::express-handler@2777`
- `api/index.js::runImport`
- `api/index.js::express-handler@2397`
- `api/index.js::express-handler@4017`

## Connected Communities

- **api · assertFreshSuperAdmin** (4 cross-edges)
- **api · route handler · index (15)** (4 cross-edges)
- **. +1 dirs · getJwksKeys** (2 cross-edges)
- **. +1 dirs · checkRateLimit** (1 cross-edges)
- **plugins +14 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-18")
explore(operation:"context", task:"understand scripts +3 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"api/index.js::express-handler@2777"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
