# Security Architecture

## Authentication Flow

```
User → Email/Password → Supabase Auth → JWT (HS256)
  ↓
Client: Almacena sesión (persistSession: true)
  ↓
Server: Bearer token en Authorization header
  ↓
requireAuth middleware:
  1. HMAC-SHA256 verification (SUPABASE_JWT_SECRET)
     ├── Raw text secret
     └── Base64-decoded secret fallback
  2. Supabase API fallback (/auth/v1/user)
     └── Para tokens ES256
```

## JWT Payload

```typescript
interface JwtPayload {
  sub: string;              // user_id
  email: string;
  role: string;             // authenticated
  exp: number;
  app_metadata: {
    provider: string;
    tenant_id?: string;     // Sincronizado por trigger
  };
  user_metadata: {
    // Datos del usuario
  };
}
```

## RLS (Row Level Security)

Todas las tablas de datos multi-tenant tienen RLS habilitada con el patrón:

```sql
tenant_id = current_tenant_id()
```

Donde `current_tenant_id()` lee del JWT (fast path) con fallback a DB query.

## Roles y Permisos

| Operación | admin | direccion | convivencia | inspectoria | profesor_jefe | teacher |
|-----------|-------|-----------|-------------|-------------|---------------|---------|
| Ver datos tenant | ✅ | ✅ | ✅ | ✅ | ✅ (su curso) | ✅ (básico) |
| CREAR causas | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| EDITAR causas | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| ELIMINAR causas | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar estudiantes | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

## Privacy Mode

- Toggle global en `uiStore.privacyMode`
- Oculta RUTs y nombres completos de NNA
- Icono de ojo en Header para activar/desactivar
- Aplicado en toda la UI mediante renderizado condicional

## Security Headers (vercel.json)

```
Content-Security-Policy:
  default-src 'self'
  script-src 'self' 'unsafe-inline' 'unsafe-eval'
  style-src 'self' 'unsafe-inline' fonts.googleapis.com
  connect-src 'self' openrouter.ai api.groq.com *.supabase.co wss://*.supabase.co
  img-src 'self' *.supabase.co data: blob:
  font-src 'self' fonts.gstatic.com data:

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## AI Security

- **Sanitización de input**: Elimina patrones de prompt injection antes de enviar a LLM
- **Human confirmation**: Resultados AI requieren confirmación humana antes de ser vinculantes
- **No datos sensibles**: No enviar RUTs ni datos personales de NNA a AI sin anonimizar
- **Rate limiting**: 10 req/min/IP para endpoints AI
- **Caché**: advisor-chat e improve-text cacheados 5 min

## Storage Security

- Buckets privados (no públicos)
- Signed URLs con expiración (1 hora)
- RLS en storage.objects por tenant folder
- Validación de tipo de archivo y tamaño (10 MB max)

## Secretos

- `SUPABASE_SERVICE_ROLE_KEY` NUNCA se expone al cliente
- JWT verification usa `SUPABASE_JWT_SECRET` solo server-side
- Env vars en Vercel (no en código)
- `.env.local` en .gitignore
