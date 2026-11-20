alter table public.causas
  add column if not exists fecha_limite_apelacion timestamptz;

comment on column public.causas.fecha_limite_apelacion is
  'Plazo máximo de 48 horas para presentar reconsideración o apelación desde la resolución concluyente.';
