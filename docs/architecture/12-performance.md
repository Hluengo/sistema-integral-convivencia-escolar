# 12 — Performance

> **Referencia detallada:** `docs/architecture/performance.md`

## Code Splitting
11 chunks (vendor, pdf, docx, supabase, index, anotaciones, new-process, causas, docs, ai-advisor, timeline)

## Lazy Loading
7+ componentes lazy (Sidebar, Header, MainContent, LoginPage, NewCausaModal, ShortcutsModal, OnboardingTour, modals)

## Cache
- Server: in-memory 5min TTL, max 100 entries (advisor-chat, improve-text)
- Client: React Query (courses 30min, students 10min)
