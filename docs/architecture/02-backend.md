# 02 — Backend Architecture

> **Referencia detallada:** `docs/architecture/backend.md`

## Stack
Express 4 (dev) / Vercel Serverless (prod) + esbuild

## API Endpoints
11 endpoints: 4 AI, 2 PDF, 2 documents, 2 usage, 1 debug

## Auth Middleware
JWT verification (HMAC + API fallback) + tenant context injection

## AI Integration
OpenRouter (meta-llama/llama-3.1-8b-instruct), temperature 0, max 2000 tokens
