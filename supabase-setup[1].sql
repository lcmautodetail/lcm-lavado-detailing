-- LCM Lavado & Detailing - ejecutar UNA VEZ en Supabase SQL Editor
create extension if not exists pgcrypto;
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.services (
  name text primary key, price numeric(9,2) not null check(price>=0),
  duration_minutes integer not null check(duration_minutes between 30 and 720),
  description text not null default '', active boolean not null default true,
  sort_order integer not null default 0
);
create table if not exists public.blocked_dates (id uuid primary key default gen_random_uuid(),day date not null unique);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check(length(client_name) between 2 and 100),
  phone text not null check(length(phone) between 9 and 30),
  vehicle text not null check(length(vehicle) between 2 and 140),
  plate text not null default '', vehicle_size text not null default '',
  dirt_level text not null default 'Normal',
  service_name text not null references public.services(name),
  booking_date date not null, booking_time time not null,
  duration_minutes integer not null check(duration_minutes between 30 and 720),
  quoted_price numeric(9,2) not null default 0,
  status text not null default 'pendiente' check(status in ('pendiente','confirmada','completada','cancelada')),
  notes text not null default '', source text not null default 'web',
  created_at timestamptz not null default now()
);
create index if not exists bookings_date_time_idx on public.bookings(booking_date,booking_time);
create index if not exists bookings_created_idx on public.bookings(created_at);

alter table public.admins enable row level security;
alter table public.services enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.bookings enable row level security;

create or replace function public.is_lcm_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admins where user_id=auth.uid());
$$;
revoke all on function public.is_lcm_admin() from public;
grant execute on function public.is_lcm_admin() to authenticated;

create policy "services_public_read" on public.services for select to anon,authenticated using (active or public.is_lcm_admin());
create policy "services_admin_write" on public.services for all to authenticated using (public.is_lcm_admin()) with check (public.is_lcm_admin());
create policy "bookings_admin_all" on public.bookings for all to authenticated using (public.is_lcm_admin()) with check (public.is_lcm_admin());
create policy "blocked_admin_all" on public.blocked_dates for all to authenticated using (public.is_lcm_admin()) with check (public.is_lcm_admin());
-- No hay políticas públicas SELECT/INSERT/UPDATE/DELETE para reservas: se usan funciones seguras.

insert into public.services(name,price,duration_minutes,description,sort_order) values
('Interior básico',60,180,'Limpieza interior de mantenimiento',1),
('Interior completo',95,300,'Limpieza profunda del interior',2),
('Detallado exterior',65,180,'Limpieza y cuidado exterior',3),
('Integral básico',100,300,'Interior y exterior',4),
('Integral premium',150,420,'Detallado integral profundo',5),
('Mantenimiento periódico',60,180,'Limpieza de mantenimiento',6),
('Limpieza de tapicería',50,240,'Tratamiento de tapicerías',7),
('Eliminación de olores',120,360,'Limpieza profunda y tratamiento de olores',8),
('Pulido de faros',50,120,'Restauración de faros',9)
on conflict (name) do nothing;
-- IMPORTANTE: los precios anteriores son PROVISIONALES. Revisarlos en el panel antes de publicar.

create or replace function public.available_slots(p_date date,p_service text)
returns table(slot_time text, available boolean)
language plpgsql security definer set search_path = '' as $$
declare d integer; dur integer; start_min integer:=540; end_min integer:=1200; step_min integer:=30; t integer;
begin
  if p_date < (now() at time zone 'Europe/Madrid')::date or p_date > (now() at time zone 'Europe/Madrid')::date+90 then return; end if;
  if extract(isodow from p_date)=7 or exists(select 1 from public.blocked_dates where day=p_date) then return; end if;
  select duration_minutes into dur from public.services where name=p_service and active;
  if dur is null then return; end if;
  for t in select generate_series(start_min,end_min-dur,step_min) loop
    slot_time:=lpad((t/60)::text,2,'0')||':'||lpad((t%60)::text,2,'0');
    available:=not exists(
      select 1 from public.bookings b where b.booking_date=p_date and b.status <> 'cancelada'
      and (t < extract(hour from b.booking_time)::integer*60+extract(minute from b.booking_time)::integer+b.duration_minutes)
      and (t+dur > extract(hour from b.booking_time)::integer*60+extract(minute from b.booking_time)::integer)
    );
    if p_date=(now() at time zone 'Europe/Madrid')::date and t <= extract(hour from now() at time zone 'Europe/Madrid')::integer*60+extract(minute from now() at time zone 'Europe/Madrid')::integer then available:=false; end if;
    return next;
  end loop;
end $$;

create or replace function public.request_booking(p_booking jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_date date;v_time time;v_service text;v_dur integer;v_price numeric;v_id uuid;v_count integer;
begin
  if length(p_booking::text)>5000 then raise exception 'Solicitud demasiado larga';end if;
  if length(trim(coalesce(p_booking->>'client_name',''))) not between 2 and 100 or
     length(trim(coalesce(p_booking->>'phone',''))) not between 9 and 30 or
     length(trim(coalesce(p_booking->>'vehicle',''))) not between 2 and 140 then
    raise exception 'Revisa los datos de contacto y vehículo';end if;
  if coalesce(p_booking->>'phone','') !~ '^[+0-9 ()-]+$' then raise exception 'Teléfono no válido';end if;
  v_date:=(p_booking->>'booking_date')::date;
  v_time:=(p_booking->>'booking_time')::time;
  v_service:=p_booking->>'service_name';
  select duration_minutes,price into v_dur,v_price from public.services where name=v_service and active;
  if v_dur is null then raise exception 'Servicio no válido';end if;
  -- Un candado por fecha evita dos reservas simultáneas para el mismo hueco.
  perform pg_advisory_xact_lock(hashtext('lcm_booking_'||v_date::text));
  if not exists(select 1 from public.available_slots(v_date,v_service) s where s.slot_time=to_char(v_time,'HH24:MI') and s.available) then
    raise exception 'Este horario ya no está disponible';end if;
  -- Límite básico por teléfono/día; se recomienda CAPTCHA y rate limiting adicional en producción.
  select count(*) into v_count from public.bookings where phone=trim(p_booking->>'phone') and created_at>now()-interval '1 day';
  if v_count>=3 then raise exception 'Límite de solicitudes alcanzado';end if;
  insert into public.bookings(client_name,phone,vehicle,plate,vehicle_size,dirt_level,service_name,booking_date,booking_time,duration_minutes,quoted_price,notes)
  values(trim(p_booking->>'client_name'),trim(p_booking->>'phone'),trim(p_booking->>'vehicle'),
    left(coalesce(p_booking->>'plate',''),20),left(coalesce(p_booking->>'vehicle_size',''),60),
    left(coalesce(p_booking->>'dirt_level','Normal'),60),v_service,v_date,v_time,v_dur,v_price,
    left(coalesce(p_booking->>'notes',''),1000)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.available_slots(date,text) from public;
revoke all on function public.request_booking(jsonb) from public;
grant execute on function public.available_slots(date,text) to anon,authenticated;
grant execute on function public.request_booking(jsonb) to anon,authenticated;

-- PASO MANUAL FINAL: crear usuario en Supabase Authentication > Users
-- y asignarlo como administrador con su UUID:
-- insert into public.admins(user_id) values ('UUID_DEL_USUARIO');
