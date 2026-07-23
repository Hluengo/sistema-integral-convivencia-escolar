# 13 — Security

> **Referencia detallada:** `docs/architecture/security.md`

## Layers
1. Auth: Supabase Auth + JWT (HMAC + API fallback)
2. RLS: tenant_id isolation en 16 tablas
3. CSP: Headers restrictivos en vercel.json
4. Privacy: Privacy mode para datos de NNA
5. Rate limiting: 10 req/min/IP para endpoints AI
6. Input sanitization: anti-prompt-injection
7. Storage: Signed URLs, RLS en storage.objects
