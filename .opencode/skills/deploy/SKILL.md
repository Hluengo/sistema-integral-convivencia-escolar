---
name: deploy
description: Use when deploying the project to Vercel, running build, or checking deployment readiness. Trigger keywords: deploy, desplegar, build, vercel, production.
---

# Deploy Skill

Workflow for deploying Debido Proceso to Vercel.

## Pre-deploy checklist

1. Run `npm run lint` — must pass (TypeScript only)
2. Run `npm run build` — must complete without errors
3. Verify `dist/` directory exists and has content
4. Verify `api/index.js` exists for serverless function
5. Check `vercel.json` configuration

## Deploy steps

```bash
# 1. Type check
npm run lint

# 2. Build
npm run build

# 3. Verify output
ls dist/
ls api/index.js

# 4. Deploy (if Vercel CLI installed)
npx vercel --prod
```

## Post-deploy verification

- Check the deployed URL loads correctly
- Verify API routes respond at `/api/*`
- Test Supabase connection from production
- Confirm Groq AI features work

## Rollback

If issues are found, use Vercel dashboard to promote the previous deployment to production.
