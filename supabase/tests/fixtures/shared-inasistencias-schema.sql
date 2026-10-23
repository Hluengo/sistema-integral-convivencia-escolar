-- Solo para una copia local vacía: el baseline de Convivencia no contiene esta
-- tabla de Inasistencias. Columnas contrastadas con metadatos remotos, sin filas.
-- No es una migración ni certifica el flujo de importación de Gmail.
do $$ begin
  if current_database() not like 'runbook_audit_%' then
    raise exception 'Este fixture solo puede ejecutarse en la base aislada del runbook';
  end if;
end $$;

create table public.gmail_imports (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null,
  gmail_thread_id text,
  attachment_key text not null default '',
  sender_email text not null,
  subject text not null default '',
  received_at timestamptz not null,
  student_name_extracted text,
  course_name_extracted text,
  start_date_extracted date,
  end_date_extracted date,
  classification text not null,
  confidence numeric not null,
  extracted_data jsonb not null default '{}'::jsonb,
  document_path text,
  status text not null default 'PENDING',
  absence_id uuid,
  error_message text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tenant_id uuid references public.tenants(id)
);
alter table public.gmail_imports enable row level security;
