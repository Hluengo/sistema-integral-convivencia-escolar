-- The pre-swap copy is preserved in backups/ before this cleanup.
-- It is not part of the application's operational schema.
DROP TABLE IF EXISTS public.carta_events_pre_swap_backup;
