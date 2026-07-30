---
name: production-release
description: Revision, commit, publicacion y verificacion de deploy en Vercel
agent: release-manager
---

# Production Release Skill

## Flujo

1. Revisar `git status` y `git diff --stat`
2. Verificar que NO hay:
   - `.env*` ni secretos
   - datos personales de estudiantes (RUT, nombres, documentos)
   - archivos temporales o de prueba
3. Ejecutar quality gate completo
4. Crear commit con mensaje claro (tipo(scope): descripcion)
5. Hacer push a master solo con confirmacion explicita
6. Verificar deploy en Vercel:
   - `vercel list` o dashboard
   - Estado READY
   - URL productiva
7. Verificar errores recientes en produccion

## Verificacion post-deploy

- URL funciona (200)
- Pagina carga sin errores de consola
- Autenticacion funciona
- No hay errores 500 en rutas principales

## Prohibido

- Publicar sin quality gate
- Publicar sin revisar diff
- Publicar datos personales
- Usar `--force` en git
