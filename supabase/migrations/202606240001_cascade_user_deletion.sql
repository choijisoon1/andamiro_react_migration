-- Auth user deletion must not be blocked by invitation audit rows.
alter table public.exchange_invitations
  drop constraint if exists exchange_invitations_inviter_user_id_fkey,
  add constraint exchange_invitations_inviter_user_id_fkey
    foreign key (inviter_user_id) references auth.users(id) on delete cascade;

alter table public.exchange_invitations
  drop constraint if exists exchange_invitations_accepted_by_user_id_fkey,
  add constraint exchange_invitations_accepted_by_user_id_fkey
    foreign key (accepted_by_user_id) references auth.users(id) on delete set null;
