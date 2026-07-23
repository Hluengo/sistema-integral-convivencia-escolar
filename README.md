<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Sistema Integral de Convivencia Escolar

Aplicación React + Express para gestión de casos de convivencia escolar, anotaciones, documentos disciplinarios y apoyo legal con IA.

## Run Locally

**Prerequisites:** Node.js 22

1. Install dependencies:
   `npm install`
2. Create `.env.local` using `.env.example` as reference.
3. Configure at least:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`
4. Run the app:
   `npm run dev`

## Quality Checks

- `npm run lint`
- `npm run test`
- `npm run build`
