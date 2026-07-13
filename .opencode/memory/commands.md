# Comandos Útiles

## Desarrollo
```bash
npm run dev          # Express (3001) + Vite (3002)
npm run build        # Build producción
npm run lint         # TypeScript check
npm run test         # Unit tests
npm run test:e2e     # Playwright E2E
npm run doctor       # React Doctor
```

## Git
```bash
git status
git diff
git log --oneline -10
git commit -m "mensaje"
```

## Supabase (si CLI disponible)
```bash
supabase status
supabase db diff
supabase migration new nombre
```

## Vercel
```bash
vercel env ls        # Listar variables
vercel --prod        # Deploy producción
vercel inspect       # Información de deploy
```
