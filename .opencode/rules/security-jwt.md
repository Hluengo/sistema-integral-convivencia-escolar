# Regla: Seguridad JWT

## Uso
Aplicar a cualquier archivo que maneje autenticación JWT o tokens Supabase.

## Reglas
1. SIEMPRE verificar JWT con HMAC (HS256) primero, fallback a Supabase API (ES256)
2. NUNCA hardcodear secrets — usar process.env
3. SIEMPRE sanitizar errores de auth (no exponer detalles internos)
4. NO confiar en JWT claims no verificados
5. SIEMPRE usar `requireAuth` middleware en endpoints protegidos
6. Logging de intentos de auth fallidos para auditoría

## Ejemplo
```typescript
// Correcto
const token = extractToken(req);
let user = verifyHMAC(token); // Rápido
if (!user) user = await verifySupabaseAPI(token); // ES256 fallback

// Incorrecto
const user = jwt.verify(token, process.env.JWT_SECRET!); // No maneja ES256
```
