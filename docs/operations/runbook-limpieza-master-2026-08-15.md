# Runbook — Limpieza del repositorio y permanencia de `master`

**Fecha:** 2026-08-15  
**Alcance:** GitHub, documentación y código sin uso confirmado.  
**Objetivo:** dejar `master` como única rama de trabajo relevante, sin borrar el historial fusionado ni datos protegidos.

## Reglas de seguridad

- No modificar ni eliminar `master`.
- No reescribir historial fusionado.
- No tocar migraciones, `.env*`, backups, leyes, datos reales ni `api/index.js` generado.
- Cerrar PR antes de eliminar su rama remota.
- Validar estado local y remoto después de cada fase.

## Fase 0 — Respaldo y línea base

1. Confirmar `git status --short --branch` limpio.
2. Registrar el SHA de `master`.
3. Confirmar que el respaldo no es una rama de trabajo ni modifica el contenido.

## Fase 1 — GitHub

1. Cerrar las PR abiertas #13 y #14.
2. Eliminar las ramas remotas `fix/rate-limit-headers` y `fix/rate-limit-token-bucket`.
3. Confirmar que `master` conserva su SHA y que no quedan PR abiertas.

Las PR fusionadas y su historial se conservan.

## Fase 2 — Documentación

- Los documentos numerados de `docs/architecture/` funcionan como índice resumido.
- Los documentos sin prefijo numérico son la referencia detallada.
- No borrar documentos hasta comprobar enlaces entrantes; retirar solo contenido duplicado confirmado.
- Mantener runbooks operativos y documentación legal.
- Actualizar las métricas actuales del README sin alterar cifras históricas.

## Fase 3 — Código sin uso confirmado

1. Eliminar únicamente exports sin referencias detectados por `knip`.
2. Conservar tipos generados de Supabase aunque no tengan consumidores directos.
3. No eliminar barrels de compatibilidad de `src/components/`.

## Fase 4 — Artefactos locales

Se pueden regenerar `dist/`, `test-results/`, `coverage/` y reportes locales.  
Los directorios `backups/`, `datos-reales/` y similares requieren revisión manual antes de borrar.

## Fase 5 — Validación

```powershell
npm run lint
npm run test
npm run build
npm run security-audit
git diff --check
git ls-remote origin refs/heads/master
gh pr list --state open
```

## Resultado de esta ejecución

- `master` preservado en `6fb2fcf1a95874caec0e596ca8fc73d308d4b2e6`.
- PR #13 y #14 cerradas.
- Ramas remotas de esas PR eliminadas.
- README actualizado a 769 tests.
- Hooks sin referencias eliminados.
- Migraciones, backups, archivos sensibles e historial fusionado preservados.
