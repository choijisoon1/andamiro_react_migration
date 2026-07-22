create table if not exists public.exchange_invitations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.exchange_posts(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id),
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending',
  accepted_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.exchange_invitations enable row level security;
