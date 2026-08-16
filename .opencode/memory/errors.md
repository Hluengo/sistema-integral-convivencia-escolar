# Errores Conocidos y Soluciones

## Error: JWT ES256 verification failed
**Causa:** Supabase rotó keys de HS256 a ES256 (~5 meses)
**Solución:** HMAC first + Supabase API fallback (ya implementado)

## Error: CSP blocks fonts
**Causa:** `vercel.json` no incluye dominios de Google Fonts
**Solución:** Agregar `https://fonts.googleapis.com` a `style-src` y `https://fonts.gstatic.com` a `font-src`

## Error: opencode.json corruption
**Causa:** Instalar plugin forja-suite sobreescribe config
**Solución:** Restaurar desde git: `git checkout HEAD -- opencode.json`

## Error: Storage RLS policies missing
**Causa:** Bucket creado sin políticas RLS
**Solución:** Crear políticas en `storage.objects` para el bucket

## Error: document_templates not found
**Causa:** Tabla no existe en Supabase
**Solución:** Ejecutar SQL de creación + seed de prompts

## Error: Vite HMR disconnect
**Causa:** Puerto 3002 ocupado o firewall
**Solución:** Verificar `lsof -i :3002` y.kill procesos

## Error: Tests fail with module not found
**Causa:** Dependencias no instaladas
**Solución:** `npm install` antes de `npm run test`
