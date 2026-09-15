-- Email del apoderado para notificaciones por correo (módulo Composio).
alter table public.causas
  add column if not exists apoderado_email text null;

alter table public.causas
  drop constraint if exists causas_apoderado_email_format;

alter table public.causas
  add constraint causas_apoderado_email_format
  check (
    apoderado_email is null
    or apoderado_email ~* '^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{2,}$'
  );
