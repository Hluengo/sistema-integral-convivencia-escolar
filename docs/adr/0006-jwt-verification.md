# ADR-0006: JWT Verification — HMAC + API Fallback

## Context
Supabase migró de HS256 a ES256 para firmar JWTs. El `SUPABASE_JWT_SECRET` legacy (HS256) ya no verifica tokens nuevos.

## Decisión
Verificación en dos etapas: HMAC-SHA256 primero (rápido), fallback a Supabase API si falla.

## Alternativas Consideradas
- **Solo HMAC**: Rápido pero no funciona con tokens ES256 nuevos
- **Solo Supabase API**: Funciona siempre pero agrega latencia (HTTP call)
- **JWKS endpoint**: Más complejo, no soportado por Supabase para HS256
- **Solo Supabase API**: 100% confiable pero 50-100ms extra por request

## Consecuencias
- **Positivas**: Rápido para tokens HS256 legacy (mayoría actual)
- **Positivas**: Compatible con rotación futura de keys (ES256)
- **Positivas**: Sin cambios cuando Supabase rote keys nuevamente
- **Positivas**: Endpoint `/api/auth-debug` para diagnosticar problemas JWT
- **Negativas**: Latencia extra en fallback (API call)
- **Negativas**: Código más complejo (dos estrategias de verificación)
