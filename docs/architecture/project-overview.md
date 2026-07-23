# Project Overview — Sistema Integral de Convivencia Escolar

**Versión:** 1.0 | **Estado:** Producción | **Última actualización:** 2026-07-23

## Propósito

Sistema SaaS multi-tenant para la gestión integral de convivencia escolar en establecimientos educacionales chilenos. Automatiza el flujo completo del debido proceso disciplinario: desde la recepción y clasificación de anotaciones (RICE), pasando por la investigación, resolución, y emisión de cartas disciplinarias (amonestación, compromiso, derivación), hasta el seguimiento y cierre de casos.

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript | 19.0.1 / 5.8.2 |
| Build | Vite | 6.4.3 |
| CSS | Tailwind CSS v4 | 4.1.14 |
| State | Zustand | 5.0.14 |
| Server Data | TanStack React Query | 5.101.2 |
| Forms | react-hook-form + Zod | 7.82.0 / 4.4.3 |
| Backend Dev | Express + tsx | 4.21.2 |
| Backend Prod | Vercel Serverless (esbuild) | — |
| Database | Supabase PostgreSQL | 17.6.1 |
| Auth | Supabase Auth | — |
| AI | OpenRouter (llama-3.1-8b-instruct) | — |
| Documentos | docx (Word) / pdf-lib + pdfjs-dist | 9.7.1 |
| Monitoring | Sentry + PostHog | 10.66.0 |
| Tests | node:test + Playwright | — |
| Lint/Format | TypeScript (tsc), ESLint 9, Prettier 3, Biome 2 | — |

## Objetivos Clave

1. **Cumplimiento legal**: Garantizar el debido proceso según Circular 482 (2018) y Ley 21.809 (2026)
2. **Multi-tenant**: Aislar datos entre establecimientos educacionales
3. **AI asistida**: Asesoría legal, mejora de textos, drafts de documentos, auditoría de procesos
4. **Documentos profesionales**: Generación de cartas disciplinarias, informes y resoluciones
5. **UX moderna**: Interfaz responsive, accesible (WCAG 2.1 AA), con modo privacidad
