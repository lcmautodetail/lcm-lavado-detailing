create table public.lcm_loyalty_manual_stamps (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.lcm_clients(id) on delete cascade,
 stamped_on date not null,
 note text not null default '' check (char_length(note)<=300),
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
create index lcm_loyalty_manual_client_idx on public.lcm_loyalty_manual_stamps(client_id);
alter table public.lcm_loyalty_manual_stamps enable row level security;
revoke all on public.lcm_loyalty_manual_stamps from anon, authenticated;
grant select,insert,delete on public.lcm_loyalty_manual_stamps to authenticated;
create policy loyalty_manual_read on public.lcm_loyalty_manual_stamps for select to authenticated using ((select public.is_lcm_admin()));
create policy loyalty_manual_add on public.lcm_loyalty_manual_stamps for insert to authenticated with check ((select public.is_lcm_admin()) and created_by=(select auth.uid()));
create policy loyalty_manual_remove on public.lcm_loyalty_manual_stamps for delete to authenticated using ((select public.is_lcm_admin()));

