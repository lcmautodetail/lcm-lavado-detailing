-- Transactional fixtures: no test customers, bookings or notices persist.
begin;
do $$
declare c uuid;v uuid;today date:=(now() at time zone 'Europe/Madrid')::date;n int;
begin
 insert into public.lcm_clients(name,phone) values('Prueba temporal mantenimiento','+34 699 000 991') returning id into c;
 insert into public.lcm_vehicles(client_id,vehicle,plate) values(c,'Vehículo de prueba','TEST') returning id into v;
 insert into public.lcm_work_orders(client_id,vehicle_id,work_date,service,work_status,payment_status,agreed_price,amount_paid,notes)
 values(c,v,today-59,'Interior completo','finalizado','pagado',95,95,'') ;
 if exists(select 1 from lcm_private.maintenance_candidates where client_id=c and first_due_on<=today) then raise exception '59 days: early reminder';end if;
 update public.lcm_work_orders set work_date=today-60 where client_id=c;
 if not exists(select 1 from lcm_private.maintenance_candidates where client_id=c and first_due_on=today and cycle_due_on=today) then raise exception '60 days: missing reminder';end if;
 perform * from public.lcm_claim_maintenance_notices();
 select count(*) into n from public.lcm_maintenance_notices where recipient_key='client:'||c;
 if n<>1 then raise exception 'Missing queued reminder';end if;
 perform * from public.lcm_claim_maintenance_notices();
 if exists(select 1 from public.lcm_maintenance_notices where recipient_key='client:'||c and attempts<>1) then raise exception 'Double claim despite active lease';end if;
 update public.lcm_maintenance_notices set sent_at=now(),lease_until=null where recipient_key='client:'||c;
 perform * from public.lcm_claim_maintenance_notices();
 if exists(select 1 from public.lcm_maintenance_notices where recipient_key='client:'||c and attempts<>1) then raise exception 'Already delivered reminder repeated';end if;
 update public.lcm_work_orders set work_date=today-120 where client_id=c;
 if not exists(select 1 from lcm_private.maintenance_candidates where client_id=c and cycle_due_on=today) then raise exception '120 days: recurrence wrong';end if;
 insert into public.lcm_work_orders(client_id,vehicle_id,work_date,service,work_status,payment_status,agreed_price,amount_paid,notes)
 values(c,v,today-5,'Mantenimiento','finalizado','interno',0,0,'');
 if not exists(select 1 from lcm_private.maintenance_candidates where client_id=c and service_date=today-120) then raise exception 'Internal work incorrectly resets clock';end if;
 insert into public.bookings(client_name,phone,vehicle,service_name,booking_date,booking_time,duration_minutes,status,source,notes)
 values('Prueba temporal mantenimiento','699000991','Vehículo de prueba',(select name from public.services order by name limit 1),today+7,'09:30',180,'confirmada','admin','');
 if exists(select 1 from lcm_private.maintenance_candidates where client_id=c) then raise exception 'Future booking did not suppress reminder';end if;
 update public.bookings set status='cancelada' where phone='699000991';
 if not exists(select 1 from lcm_private.maintenance_candidates where client_id=c) then raise exception 'Cancelled booking suppressed reminder';end if;
 update public.lcm_work_orders set payment_status='pagado',agreed_price=60,amount_paid=60 where client_id=c and work_date=today-5;
 if not exists(select 1 from lcm_private.maintenance_candidates where client_id=c and first_due_on=today+55) then raise exception 'New visit did not reset 60 days';end if;
 if has_function_privilege('anon','public.lcm_maintenance_due()','EXECUTE') then raise exception 'Public access to customer details';end if;
 if has_function_privilege('authenticated','public.lcm_claim_maintenance_notices()','EXECUTE') then raise exception 'Client can claim server work';end if;
 raise notice 'PASS: day 59/60/120, lease/deduplication, internal exclusions, upcoming/cancelled bookings, clock reset and permissions.';
end;$$;
rollback;
