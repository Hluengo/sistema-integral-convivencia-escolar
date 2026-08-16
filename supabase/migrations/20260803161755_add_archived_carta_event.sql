alter table public.carta_events
  drop constraint if exists carta_events_event_type_check;

alter table public.carta_events
  add constraint carta_events_event_type_check
  check (
    event_type = any (
      array[
        'suggested'::text,
        'created'::text,
        'registered'::text,
        'printed'::text,
        'downloaded_pdf'::text,
        'downloaded_word'::text,
        'processed_manually'::text,
        'archived'::text,
        'annulled'::text
      ]
    )
  );
