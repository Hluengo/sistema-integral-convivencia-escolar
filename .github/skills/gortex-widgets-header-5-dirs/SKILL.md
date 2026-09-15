---
name: gortex-widgets-header-5-dirs
description: "Work in the widgets/header +5 dirs area — 74 symbols across 12 files (77% cohesion)"
---

# widgets/header +5 dirs

74 symbols | 12 files | 77% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `src/app/hooks/useAppShortcuts.ts`
- `src/shared/lib/hooks/useKeyboardShortcuts.ts`
- `src/shared/lib/hooks/useNotifications.ts`
- `src/shared/lib/hooks/usePersistentNotifications.ts`
- `src/widgets/header/Header.tsx`
- `src/widgets/header/HeaderActions.tsx`
- `src/widgets/header/NotificationsDropdown.tsx`
- `src/widgets/header/PageTitle.tsx`
- `src/widgets/header/PrivacyToggle.tsx`
- `src/widgets/header/hooks/useEscapeClose.ts`
- `src/widgets/sidebar/Sidebar.tsx`

## Key Files

| File                                                 | Symbols                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ``                                                   | removeEventListener, addEventListener                                                           |
| `src/app/hooks/useAppShortcuts.ts`                   | useAppShortcuts                                                                                 |
| `src/shared/lib/hooks/useKeyboardShortcuts.ts`       | tag, handleOpenCreateFormRef, showCreateForm, handlers, onToggleShortcuts, ...                  |
| `src/shared/lib/hooks/useNotifications.ts`           | Notification                                                                                    |
| `src/shared/lib/hooks/usePersistentNotifications.ts` | markRead, realtimeEnabled, tenantId, markAllRead, useNotifications, ...                         |
| `src/widgets/header/Header.tsx`                      | Header, notificationCenter                                                                      |
| `src/widgets/header/HeaderActions.tsx`               | HeaderActionsProps, HeaderActions                                                               |
| `src/widgets/header/NotificationsDropdown.tsx`       | setFilter, visibleNotifications, filter, NotificationsDropdown, NotificationsDropdownProps, ... |
| `src/widgets/header/PageTitle.tsx`                   | PageTitle, viewMeta                                                                             |
| `src/widgets/header/PrivacyToggle.tsx`               | PrivacyToggle                                                                                   |
| `src/widgets/header/hooks/useEscapeClose.ts`         | onClose, e, handleEscape, isOpen, useEscapeClose                                                |
| `src/widgets/sidebar/Sidebar.tsx`                    | e, mobileSidebarRef, contentProps, handleEscape, setMobileOpen, ...                             |

## Entry Points

- `src/widgets/header/NotificationsDropdown.tsx::NotificationsDropdown`

## Connected Communities

- **features/timeline +28 dirs** (13 cross-edges)
- **api/services +11 dirs** (3 cross-edges)
- **lib/hooks +7 dirs · useMemberships** (2 cross-edges)
- **. +3 dirs · warn** (1 cross-edges)
- **lib/domain +6 dirs** (1 cross-edges)
- **tests +1 dirs** (1 cross-edges)
- **api/services +1 dirs · syncNotification** (1 cross-edges)
- **shared · setNotificationRead** (1 cross-edges)
- **plugins +14 dirs** (1 cross-edges)
- **shared/ui +3 dirs** (1 cross-edges)
- **. +1 dirs · LetterPreviewViewport** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-334")
explore(operation:"context", task:"understand widgets/header +5 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"src/widgets/header/NotificationsDropdown.tsx::NotificationsDropdown"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
