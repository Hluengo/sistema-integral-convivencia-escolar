/** @license SPDX-License-Identifier: Apache-2.0 */

-- Habilita eventos de notificaciones persistentes para clientes autenticados.
-- La suscripción del frontend permanece opt-in mediante VITE_NOTIFICATIONS_REALTIME.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
