# Checklist RLS — Convivencia Escolar

## Precondiciones

1. Migraciones aplicadas (`supabase db push` o SQL Editor).
2. Al menos un usuario en Auth con fila en `profiles`.
3. Roles a probar: `admin`, `convivencia`, `inspectoria`, `profesor_jefe`.

## Casos

| # | Acción | Usuario | Esperado |
|---|--------|---------|----------|
| 1 | SELECT students sin login (anon) | — | 0 filas / error RLS |
| 2 | SELECT students con sesión staff | inspectoria | filas visibles |
| 3 | INSERT inspectorate_records | inspectoria | OK |
| 4 | DELETE inspectorate_records | inspectoria | denegado |
| 5 | DELETE inspectorate_records | admin/convivencia | OK |
| 6 | INSERT cartas_disciplinarias | profesor_jefe | denegado (política actual) |
| 7 | INSERT cartas_disciplinarias | convivencia | OK |
| 8 | UPDATE profiles de otro usuario | inspectoria | denegado |
| 9 | SELECT profiles propio | cualquiera autenticado | OK |

## Crear usuario de prueba

```bash
# En Supabase Dashboard → Authentication → Users → Add user
# Luego actualizar rol:
```

```sql
UPDATE profiles SET role = 'convivencia' WHERE email = 'convivencia@colegio.cl';
```
