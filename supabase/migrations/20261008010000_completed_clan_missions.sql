create table public.completed_clan_missions (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.completed_clan_missions enable row level security;

revoke all on public.completed_clan_missions from anon, public;
grant select, insert, delete on public.completed_clan_missions to authenticated;

create policy "Users can read their completed clan missions"
  on public.completed_clan_missions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their completed clan missions"
  on public.completed_clan_missions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their completed clan missions"
  on public.completed_clan_missions for delete
  to authenticated
  using ((select auth.uid()) = user_id);