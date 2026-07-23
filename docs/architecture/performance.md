# Performance Architecture

## Build Optimization

### Code Splitting (Vite manualChunks)

El build de producción divide el código en 11 chunks:

| Chunk | Contenido | Tamaño Aprox. |
|-------|-----------|---------------|
| `vendor` | React, scheduler, radix, tanstack, zustand, etc. | 671 KB |
| `pdf` | pdf-lib, pdfjs-dist | 850 KB |
| `docx` | docx library | 343 KB |
| `supabase` | @supabase/supabase-js | 205 KB |
| `index` | App shell y shared | 292 KB |
| `anotaciones` | Módulo de anotaciones | 50 KB |
| `new-process` | Wizard nuevo proceso | 23 KB |
| `causas` | Gestión de casos | 18 KB |
| `docs` | Documentos | 12 KB |
| `ai-advisor` | Asesor AI | 9 KB |
| `timeline` | Timeline de caso | 2 KB |

### Circular Chunk Warnings

El build emite warnings de chunks circulares debido a la configuración de `manualChunks`. Son advertencias conocidas y no afectan el funcionamiento.

## Lazy Loading

7+ componentes cargados con `React.lazy()` + `<Suspense>`:
- Sidebar, Header, MainContent
- LoginPage, NewCausaModal, ShortcutsModal, OnboardingTour
- InteractiveTimeline, EditCausaModal
- AnotacionesStudentDetailModal, NewDisciplinaryProcessModal
- AnotacionesDocumentGenerator

## Cache Strategy

### Server-side
- **In-memory cache**: 5-min TTL, max 100 entries
- **Endpoints**: advisor-chat, improve-text
- **Key**: SHA256 del request payload

### Client-side (React Query)
- **Courses**: staleTime 30 min, cacheTime infinita
- **Students**: staleTime 10 min, cacheTime infinita
- **No refetch on window focus** (configuración global)

## Performance Monitoring

- **Sentry**: Error tracking + performance traces
- **PostHog**: Analytics + feature flags
- **Web Vitals**: Reportados a analytics
- **React Doctor**: Static analysis de buenas prácticas React

## Bundle Size

| Métrica | Valor |
|---------|-------|
| Total dist | ~5 MB |
| Módulos transformados | ~3,792 |
| Build time | ~27s |
| JS total (gzip) | ~800 KB |
| CSS total (gzip) | ~15 KB |

## Known Optimizations

- PDF worker es el chunk más grande (1.25 MB). Ya está optimizado con `includeFiles` en vercel.json
- React + vendor juntos para evitar circular deps (decision consciente)
- Feature chunks separados por módulo funcional
