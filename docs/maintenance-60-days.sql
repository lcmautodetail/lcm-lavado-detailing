-- Reminder data stays private. Public RPCs explicitly verify the owner.
create extension if not exists pg_cron;
create or replace function lcm_private.maintenance_phone(value text) returns text
language sql immutable set search_path='' as $$
 select case when length(d)=9 then '34'||d when length(d)=13 and left(d,4)='0034' then substring(d from 3) else d end
 from (select regexp_replace(coalesce(value,''),'[^0-9]','','g') d) x;
$$;
revoke all on function lcm_private.maintenance_phone(text) from public,anon,authenticated;

create or replace view lcm_private.maintenance_candidates as
with phones as (
 select lcm_private.maintenance_phone(phone) phone,min(id::text)::uuid client_id,count(*) n
 from public.lcm_clients group by 1
), services as (
 select 'client:'||o.client_id as recipient_key,o.client_id,c.name client_name,c.phone,v.vehicle,o.work_date service_date
 from public.lcm_work_orders o join public.lcm_clients c on c.id=o.client_id
 join public.lcm_vehicles v on v.id=o.vehicle_id and v.client_id=o.client_id
 where o.work_status='finalizado' and o.payment_status<>'interno'
 union all
 select 'client:'||h.client_id,h.client_id,c.name,c.phone,v.vehicle,h.appointment_at::date
 from public.lcm_job_history h join public.lcm_clients c on c.id=h.client_id
 left join public.lcm_vehicles v on v.id=h.vehicle_id
 where lower(h.original_status) in ('completado','completada','finalizado','finalizada') and not coalesce(h.is_internal,false)
 union all
 select case when p.n=1 then 'client:'||p.client_id else 'phone:'||lcm_private.maintenance_phone(b.phone) end,
 case when p.n=1 then p.client_id end,coalesce(c.name,b.client_name),coalesce(c.phone,b.phone),b.vehicle,b.booking_date
 from public.bookings b left join phones p on p.phone=lcm_private.maintenance_phone(b.phone)
 left join public.lcm_clients c on c.id=p.client_id and p.n=1
 where lower(b.status) in ('completada','completado','finalizado','finalizada')
 and coalesce(p.n,0)<=1 and length(lcm_private.maintenance_phone(b.phone))>=9
 and not exists(select 1 from public.lcm_work_orders o where o.booking_id=b.id)
), latest as (
 select distinct on (recipient_key) * from services
 where service_date<=(now() at time zone 'Europe/Madrid')::date
 order by recipient_key,service_date desc,vehicle nulls last
)
select l.*,l.service_date+60 as first_due_on,
 l.service_date+(greatest(1,((now() at time zone 'Europe/Madrid')::date-l.service_date)/60)*60) as cycle_due_on
from latest l
where not exists (
 select 1 from public.bookings b where lcm_private.maintenance_phone(b.phone)=lcm_private.maintenance_phone(l.phone)
 and b.booking_date>=(now() at time zone 'Europe/Madrid')::date
 and lower(b.status) in ('pendiente','confirmada','confirmado','en_proceso')
);
revoke all on lcm_private.maintenance_candidates from public,anon,authenticated;

create table public.lcm_maintenance_notices (
 id uuid primary key default gen_random_uuid(),recipient_key text not null,last_service date not null,due_on date not null,
 sent_at timestamptz,attempts integer not null default 0,lease_until timestamptz,last_error text,
 unique(recipient_key,last_service,due_on)
);
alter table public.lcm_maintenance_notices enable row level security;
revoke all on public.lcm_maintenance_notices from public,anon,authenticated;
grant select,insert,update on public.lcm_maintenance_notices to service_role;

create or replace function public.lcm_maintenance_due()
returns table(recipient_key text,client_id uuid,client_name text,phone text,vehicle text,last_service date,due_on date)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_lcm_admin() then raise exception 'Sin permiso' using errcode='42501';end if;
 return query select c.recipient_key,c.client_id,c.client_name,c.phone,c.vehicle,c.service_date,c.first_due_on
 from lcm_private.maintenance_candidates c where c.first_due_on<=(now() at time zone 'Europe/Madrid')::date
 order by c.first_due_on,c.client_name;
end;$$;
revoke all on function public.lcm_maintenance_due() from public,anon;
grant execute on function public.lcm_maintenance_due() to authenticated;

create or replace function public.lcm_claim_maintenance_notices()
returns table(id uuid,client_name text,vehicle text,due_on date)
language plpgsql security definer set search_path='' as $$
begin
 -- Only the service role can call this RPC; rows are leased before network calls.
 insert into public.lcm_maintenance_notices(recipient_key,last_service,due_on)
 select c.recipient_key,c.service_date,c.cycle_due_on from lcm_private.maintenance_candidates c
 where c.first_due_on<=(now() at time zone 'Europe/Madrid')::date
 on conflict do nothing;
 return query
 with claimed as (
 select n.id from public.lcm_maintenance_notices n join lcm_private.maintenance_candidates c
 on c.recipient_key=n.recipient_key and c.service_date=n.last_service and c.cycle_due_on=n.due_on
 where n.sent_at is null and n.attempts<5 and (n.lease_until is null or n.lease_until<now())
 order by n.due_on,n.id limit 20 for update of n skip locked
 ), leased as (
 update public.lcm_maintenance_notices n set lease_until=now()+interval '10 minutes',attempts=n.attempts+1
 from claimed where n.id=claimed.id returning n.*
 ) select n.id,c.client_name,c.vehicle,n.due_on from leased n join lcm_private.maintenance_candidates c
 on c.recipient_key=n.recipient_key and c.service_date=n.last_service;
end;$$;
revoke all on function public.lcm_claim_maintenance_notices() from public,anon,authenticated;
grant execute on function public.lcm_claim_maintenance_notices() to service_role;

create or replace function lcm_private.send_maintenance_reminders() returns bigint
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if extract(hour from now() at time zone 'Europe/Madrid') not between 10 and 19 then return null;end if;
 select hook_token into token from public.lcm_push_config where id;
 if token is null then raise exception 'Avisos sin configurar';end if;
 return net.http_post(url:='https://fotivfknsqrlgssmuifl.supabase.co/functions/v1/lcm-push',
 headers:=jsonb_build_object('Content-Type','application/json','x-lcm-hook',token),
 body:='{"action":"maintenance"}'::jsonb,timeout_milliseconds:=60000);
end;$$;
revoke all on function lcm_private.send_maintenance_reminders() from public,anon,authenticated;
select cron.schedule('lcm-maintenance-60-days','0 * * * *','select lcm_private.send_maintenance_reminders();');
