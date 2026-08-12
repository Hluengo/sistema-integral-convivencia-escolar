# 02 — Backend Architecture

> **Referencia detallada:** `docs/architecture/backend.md`

## Stack

Express 4 (dev) / Vercel Serverless (prod) + esbuild

## API Endpoints

11 endpoints: 4 AI, 2 PDF, 2 documents, 2 usage, 1 debug

## Auth Middleware

JWT verification (HMAC + API fallback) + tenant context injection

## AI Integration

Gemini is used for short text improvement, due-process audits, reports, and official document drafts. OpenRouter remains available as fallback for short text improvement and for brief legal assistance; complex document/report endpoints do not fall back to OpenRouter.
