alter table public.exchange_posts
  add column if not exists client_request_id uuid;

create unique index if not exists exchange_posts_user_request_uidx
  on public.exchange_posts (user_id, client_request_id)
  where client_request_id is not null;

create table if not exists public.exchange_room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.exchange_posts(id) on delete cascade,
  event_type text not null,
  status text not null default 'pending',
  workflow_status integer,
  workflow_error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (room_id, event_type)
);

alter table public.exchange_room_events enable row level security;
