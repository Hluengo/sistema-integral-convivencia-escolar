/** @license SPDX-License-Identifier: Apache-2.0 */

# Realtime y rendimiento

## Estado

- Las notificaciones persistentes siguen siendo la fuente de verdad.
- El hook `usePersistentNotifications` admite Realtime de forma opt-in mediante
  `VITE_NOTIFICATIONS_REALTIME=true`.
- La migración `20260801120000_enable_notifications_realtime.sql` agrega
  `public.notifications` a `supabase_realtime` de forma idempotente.
- La migración fue verificada en el proyecto Supabase vinculado: la tabla
  `notifications` está publicada en `supabase_realtime`. La variable de
  producción permanece opt-in para permitir una activación gradual.
- Lighthouse CI está configurado en `lighthouserc.cjs` y se ejecuta con
  `npm run lighthouse:ci` después de construir `dist/`.

## Línea base observada

La ejecución local del 1 de agosto de 2026 midió aproximadamente:

- FCP: 3,4 s.
- LCP: 5,0 s.

El proceso de Lighthouse completó la recolección, pero su limpieza de la
carpeta temporal falló con `EPERM` en Windows. La validación definitiva debe
ejecutarse en CI Linux.

## Bloqueo operativo

El CLI de Supabase no puede consultar el ledger remoto del proyecto
`mjhbcqwtjzgvqssfiore`: la cuenta actual recibe HTTP 403 al inicializar el
login role. No ejecutar `db push` ni `migration repair` hasta que una cuenta
con permisos suficientes complete la reconciliación.
