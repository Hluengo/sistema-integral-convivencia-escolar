---
name: db-migration
description: Use when creating, modifying, or running Supabase database migrations. Trigger keywords: migration, migracion, schema, tabla, columna, supabase, seed, RLS.
---

# Database Migration Skill

Workflow for managing Supabase schema changes.

## Current tables

- `causas` — Main cases table
- `bitacora_entries` — Log entries for cases
- `checklist_items` — Checklist items per case

## Migration workflow

1. **Plan**: Describe the schema change needed
2. **SQL**: Write the migration SQL in `supabase/migrations/`
3. **Test**: Run against Supabase SQL editor or local instance
4. **Update types**: Regenerate TypeScript types if schema changed
5. **Update mapping**: Check `lib/supabase.ts` for `mapCausaFromDB`/`mapCausaToDB`

## Naming convention

Migration files: `YYYYMMDDHHMMSS_description.sql`

## RLS policies

Always include Row Level Security policies for new tables:
- Dashboard is public (read-only)
- CRUD operations require auth
- Use `auth.uid()` for user-scoped access

## Seed data

For test data, update `scripts/seed.ts` and run:
```bash
npx tsx scripts/seed.ts
```

## Important

- DB columns are snake_case in Supabase
- TypeScript uses camelCase
- Mapping functions in `lib/supabase.ts` handle conversion
