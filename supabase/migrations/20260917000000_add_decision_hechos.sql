-- Matriz de Decisión Fundada: medida seleccionada + análisis + decisión por hecho
-- Solo columnas nulables/vacías; no toca RLS (las políticas existentes cubren UPDATE)
alter table public.hechos add column if not exists medida_seleccionada text;
alter table public.hechos add column if not exists analisis_proporcionalidad text not null default '';
alter table public.hechos add column if not exists decision_fundada text not null default '';
