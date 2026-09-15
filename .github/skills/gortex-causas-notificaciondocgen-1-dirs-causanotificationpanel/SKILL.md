---
name: gortex-causas-notificaciondocgen-1-dirs-causanotificationpanel
description: "Work in the causas/notificacionDocgen +1 dirs · CausaNotificationPanel area — 72 symbols across 7 files (79% cohesion)"
---

# causas/notificacionDocgen +1 dirs · CausaNotificationPanel

72 symbols | 7 files | 79% cohesion

## When to Use

Use this skill when working on files in:

- `src/features/causas/notificacionDocgen/CausaNotificationGenerator.tsx`
- `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx`
- `src/features/causas/notificacionDocgen/NotificacionContent.tsx`
- `src/features/causas/notificacionDocgen/builders.ts`
- `src/features/causas/notificacionDocgen/types.ts`
- `src/shared/api/services/causaDocuments.service.test.ts`
- `src/shared/api/services/causaDocuments.service.ts`

## Key Files

| File                                                                    | Symbols                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/features/causas/notificacionDocgen/CausaNotificationGenerator.tsx` | NotificationFeedback, CausaNotificationGeneratorProps                                        |
| `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx`     | onUpdateCausa, ensurePendingDocument, setIsProcessing, isProcessing, handleMarkNotified, ... |
| `src/features/causas/notificacionDocgen/NotificacionContent.tsx`        | NotificacionContentProps                                                                     |
| `src/features/causas/notificacionDocgen/builders.ts`                    | fallback, parseCausaDocumentSnapshot, value, expediente, base, ...                           |
| `src/features/causas/notificacionDocgen/types.ts`                       | CausaDocumentStatus, CausaDocumentSnapshot, NotificacionExpedienteData, CausaDocumentType    |
| `src/shared/api/services/causaDocuments.service.test.ts`                | saveCausaDocumentSnapshot, result.fn, makeSnapshot, result.fn, overrides, ...                |
| `src/shared/api/services/causaDocuments.service.ts`                     | snapshot, CausaDocumentRow, data, saveCausaDocumentSnapshot, createPendingCausaDocument, ... |

## Entry Points

- `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx::CausaNotificationPanel`

## Connected Communities

- **lib/hooks +8 dirs** (4 cross-edges)
- **api/services +11 dirs** (4 cross-edges)
- **features/timeline +28 dirs** (3 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (3 cross-edges)
- **api/services +1 dirs · markCausaDocumentNotified** (1 cross-edges)
- **causas/notificacionDocgen +1 dirs · CausaNotificationGenerator** (1 cross-edges)
- **api/services · annulCausaDocument** (1 cross-edges)
- **lib/hooks +7 dirs · useMemberships** (1 cross-edges)
- **features/timeline +1 dirs** (1 cross-edges)
- **. +8 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-249")
explore(operation:"context", task:"understand causas/notificacionDocgen +1 dirs · CausaNotificationPanel", format:"gcx")
relations(operation:"usages", target:{symbol:"src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx::CausaNotificationPanel"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
