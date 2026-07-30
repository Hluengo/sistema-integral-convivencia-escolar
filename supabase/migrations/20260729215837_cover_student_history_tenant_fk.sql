-- Cover tenant cascades separately from student lookups.

create index student_history_entries_tenant_student_created_idx
  on public.student_history_entries (tenant_id, student_id, created_at desc);
