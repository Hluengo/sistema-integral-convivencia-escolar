# Memoria de patrones (español)

> Cita estos patrones por nombre en vez de reescribirlos. Cada entrada: fecha | tema | decisión | motivo.

- 2026-09-06 | stack-frontend | React 19 + Vite + Tailwind 4 + radix + zustand (UI) + react-query (servidor) + hook-form + zod | Es el stack instalado y verificado del repo.
- 2026-09-06 | multitenant | Todo dato filtrado por tenant y membresía en app_memberships | Requisito de aislamiento entre colegios.
- 2026-09-06 | secretos | Service-role key solo en servidor; frontend solo publishable key | Seguridad: nunca exponer privilegios en el cliente.
- 2026-09-06 | idioma | Todo lo informado en español (es-CL); identificadores técnicos en inglés | Decisión del equipo: comunicación en español.
- 2026-10-03 | postgrest-truncamiento | Todo `.in()` por lotes se pide en tramos `chunkIds` ≤20 con `.limit(POSTGREST_MAX_ROWS)` y se fusiona (`causas.service.ts`); si un tramo falla se lanza (política estricta: error visible con reintento, nunca fases parciales) | PostgREST trunca a 1000 filas: el resumen del listado llegaba mutilado (4/30 filas) y las fases salían arbitrarias.
- 2026-10-03 | hito-colectivo-alias | Todo label compartido de bitácora debe existir en el checklist base o tener alias en `LEGACY_LABEL_ALIASES` (`checklistReconciliation.ts`) | La conciliación ignora en silencio labels desconocidos: el hito se heredaba pero nunca completaba el checklist de los hermanos.
- 2026-10-03 | debug-e2e-readonly | Ante desfase tabla/detalle con base correcta, reproducir en e2e readonly interceptando respuestas PostgREST antes de tocar código | Separa staleness de bug real con evidencia; el caso 03-10 era truncamiento, no caché.
