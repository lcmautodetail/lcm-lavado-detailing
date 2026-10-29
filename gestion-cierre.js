(()=>{'use strict';const db=()=>LCM_DB.client;async function q(p){const r=await p;if(r.error)throw r.error;return r.data}
window.LCM_finishBooking=async function(b,paid,method){
const norm=s=>String(s||'').replace(/\D/g,'');
const cs=await q(db().from('lcm_clients').select('*'));let c=cs.find(x=>norm(x.phone)===norm(b.phone));
if(!c)c=await q(db().from('lcm_clients').insert({name:b.client_name,phone:b.phone}).select().single());
const vs=await q(db().from('lcm_vehicles').select('*').eq('client_id',c.id));let v=vs.find(x=>b.plate&&x.plate.toUpperCase()===b.plate.toUpperCase())||vs.find(x=>x.vehicle.toLowerCase()===b.vehicle.toLowerCase());
if(!v)v=await q(db().from('lcm_vehicles').insert({client_id:c.id,vehicle:b.vehicle,plate:b.plate||''}).select().single());
const js=await q(db().from('lcm_work_orders').select('id').eq('booking_id',b.id));
const job={booking_id:b.id,client_id:c.id,vehicle_id:v.id,work_date:b.booking_date,service:b.service_name,work_status:'finalizado',payment_status:paid>0?'pagado':'pendiente',agreed_price:b.quoted_price,amount_paid:paid,notes:(b.notes||'').slice(0,2000)};
await q(js.length?db().from('lcm_work_orders').update(job).eq('id',js[0].id):db().from('lcm_work_orders').insert(job));
if(paid>0){const old=await q(db().from('economic_movements').select('id').eq('source_booking_id',b.id));const movement={source_booking_id:b.id,kind:'ingreso',movement_date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),concept:(b.service_name+' · '+b.vehicle).slice(0,180),client_name:b.client_name.slice(0,120),amount:paid,payment_method:method,document_status:'pendiente'};
await q(old.length?db().from('economic_movements').update(movement).eq('id',old[0].id):db().from('economic_movements').insert(movement))}
};
})();