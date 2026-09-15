---
name: gortex-8-dirs
description: "Work in the . +8 dirs area — 92 symbols across 9 files (76% cohesion)"
---

# . +8 dirs

92 symbols | 9 files | 76% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `server/api/services/cache.ts`
- `server/lib/__tests__/jwks.test.ts`
- `server/lib/disciplinaryPdfAnalysis.integration.test.ts`
- `server/middleware/__tests__/auth.test.ts`
- `src/lib/api.test.ts`
- `src/shared/api/services/checklist.service.ts`
- `src/shared/lib/hooks/useCausasPersistence.ts`
- `tests/backend-e2e-review.spec.ts`

## Key Files

| File                                                     | Symbols                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| ``                                                       | createSign, generateKeyPairSync, createHmac, createHash, stringify, ...              |
| `server/api/services/cache.ts`                           | body, endpoint, hash, getCacheKey                                                    |
| `server/lib/__tests__/jwks.test.ts`                      | sign, rStart, r, sStart, signingInput, ...                                           |
| `server/lib/disciplinaryPdfAnalysis.integration.test.ts` | fn, client.rpc, params                                                               |
| `server/middleware/__tests__/auth.test.ts`               | str, body, secret, payload, signature, ...                                           |
| `src/lib/api.test.ts`                                    | secret, createTestJwt, payloadB64, secretBytes, data, ...                            |
| `src/shared/api/services/checklist.service.ts`           | itemsAreEqual, right, left                                                           |
| `src/shared/lib/hooks/useCausasPersistence.ts`           | _bitacora, isMountedRef, markCausasHydrated, pendingSaveRef, serializeCausaCore, ... |
| `tests/backend-e2e-review.spec.ts`                       | header, payload, createJwt, secret, headerB64, ...                                   |

## Connected Communities

- **api/services +11 dirs** (4 cross-edges)
- **features/timeline +28 dirs** (3 cross-edges)
- **lib/domain +6 dirs** (1 cross-edges)
- **lib/hooks · persistExistingCausa** (1 cross-edges)
- **features/timeline +22 dirs** (1 cross-edges)
- **api/services +22 dirs** (1 cross-edges)
- **plugins +14 dirs** (1 cross-edges)
- **. +1 dirs · isMediationActive** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-331")
explore(operation:"context", task:"understand . +8 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
