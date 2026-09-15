-- Motor de proporcionalidad: agravantes/atenuantes por hecho
alter table public.hechos add column if not exists agravantes text[] not null default '{}';
alter table public.hechos add column if not exists atenuantes text[] not null default '{}';
