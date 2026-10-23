# Memoria de patrones (español)

> Cita estos patrones por nombre en vez de reescribirlos. Cada entrada: fecha | tema | decisión | motivo.

- 2026-09-06 | stack-frontend | React 19 + Vite + Tailwind 4 + radix + zustand (UI) + react-query (servidor) + hook-form + zod | Es el stack instalado y verificado del repo.
- 2026-09-06 | multitenant | Todo dato filtrado por tenant y membresía en app_memberships | Requisito de aislamiento entre colegios.
- 2026-09-06 | secretos | Service-role key solo en servidor; frontend solo publishable key | Seguridad: nunca exponer privilegios en el cliente.
- 2026-09-06 | idioma | Todo lo informado en español (es-CL); identificadores técnicos en inglés | Decisión del equipo: comunicación en español.
- 2026-10-03 | postgrest-truncamiento | Todo `.in()` por lotes se pide en tramos `chunkIds` ≤20 con `.limit(POSTGREST_MAX_ROWS)` y se fusiona (`causas.service.ts`); si un tramo falla se lanza (política estricta: error visible con reintento, nunca fases parciales) | PostgREST trunca a 1000 filas: el resumen del listado llegaba mutilado (4/30 filas) y las fases salían arbitrarias.
- 2026-10-03 | hito-colectivo-alias | Todo label compartido de bitácora debe existir en el checklist base o tener alias en `LEGACY_LABEL_ALIASES` (`checklistReconciliation.ts`) | La conciliación ignora en silencio labels desconocidos: el hito se heredaba pero nunca completaba el checklist de los hermanos.
- 2026-10-03 | debug-e2e-readonly | Ante desfase tabla/detalle con base correcta, reproducir en e2e readonly interceptando respuestas PostgREST antes de tocar código | Separa staleness de bug real con evidencia; el caso 03-10 era truncamiento, no caché.
- 2026-10-22 | borradores-v2 | Claves por usuario/tenant/registro + schema de borrador incompleto; limpiar solo tras confirmar el snapshot remoto correspondiente, nunca al actualizar Zustand | Evita cruces de identidad y pérdida de una edición nueva durante guardados lentos. Pruebas offline en `npm run test:e2e:offline`.
- 2026-10-23 | permisos-convivencia | Expedientes por membresía activa de Convivencia y perfil activo del mismo colegio; el perfil no sobrepasa una membresía docente/revocada | ADR-0009 aprobado por el usuario; migración solo local.
- 2026-10-23 | incidente-atomico | RPC invoker y clave tenant/actor/solicitud conservada; sin fallback secuencial si falta la RPC | SQL local verifica rollback y concurrencia; aplicación remota pendiente.
- 2026-10-23 | recuperacion-pdf | Revalidar análisis, tenant, disponibilidad y hash; restaurar no confirma, descartar texto no autoriza borrar el PDF remoto | Una respuesta perdida pudo confirmar el proceso; texto en edición bloquea confirmar.
