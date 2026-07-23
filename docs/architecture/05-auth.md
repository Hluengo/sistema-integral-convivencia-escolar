# 05 — Authentication

> **Referencia detallada:** `docs/architecture/security.md`

## Auth Stack

| Component | Tecnología |
|-----------|-----------|
| Identity Provider | Supabase Auth |
| Auth Method | Email/Password |
| Session | JWT (HS256 / ES256) |
| Session Storage | LocalStorage (persistSession: true) |
| Refresh | Auto-refresh token rotation (10s reuse interval) |
| JWT Expiry | 3600s (1 hour) |

## Auth Flow

```
   Client                    Server                  Supabase
     │                         │                       │
     │── signInWithPassword ──►│                       │
     │                         │── POST /auth/v1/token ►│
     │                         │◄── JWT (access+refresh)│
     │◄── session ─────────────│                       │
     │                         │                       │
     │── API call + Bearer ───►│                       │
     │                         │── verifyJWT ──────────►│
     │                         │◄── payload ───────────│
     │                         │                       │
     │                         │── query profiles ─────►│
     │                         │◄── tenant_id ─────────│
     │◄── response ────────────│                       │
```

## JWT Verification Strategy

```
requireAuth middleware:

1. Extract Bearer token from Authorization header
2. Try HMAC-SHA256 (SUPABASE_JWT_SECRET)
   ├── Raw text encoding
   └── Base64-decoded encoding
3. If HMAC fails → Supabase API /auth/v1/user
   └── Handles ES256 tokens (post-migration)
4. Inject tenant context (profiles table)
5. req.user = { sub, email, role, exp, app_metadata }
```

## Session Lifecycle

```
Login → JWT issued (1h) → Auto-refresh before expiry
  → Session persists across page reloads
  → Sign-out clears session → Redirect to login
  → If token expires → 401 → Show login modal
```

## Privacy Mode

Toggle en `uiStore.privacyMode` que oculta RUTs y nombres completos de NNA en toda la UI.
