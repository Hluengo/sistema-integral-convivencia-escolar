# Arquitectura — Sistema Integral de Convivencia Escolar

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind v4, React Router
- **Backend local:** Express + Vite middleware (`server.ts`)
- **API producción:** Vercel Serverless (`api/parse-annotations.ts`)
- **DB/Auth:** Supabase PostgreSQL + Auth + RLS
- **IA:** Groq (extracción de anotaciones desde documentos)

## Flujo

```
Browser (Auth JWT)
  → Supabase (students, inspectorate_records, causas, cartas, etapas)
  → POST /api/parse-annotations → Groq
```

## Dominio

- Semáforo y umbrales RICE: `src/domain/disciplinaryStatus.ts`, `src/domain/riceMeasures.ts`
- Mappers DB: `src/lib/mappers.ts`
- Fuente de anotaciones: **solo** `inspectorate_records`

## Seguridad

- Login obligatorio (salvo `VITE_ALLOW_LOCAL_DEMO=true`)
- RLS por rol vía `profiles.role`
- Confirmación humana de resultados IA antes de persistir
