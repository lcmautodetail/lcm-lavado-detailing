const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../fidelidad.js'),'utf8'),ctx);
const {model,render}=ctx.window.LCM_LOYALTY;
const clients=[{id:'c1',phone:'600123456'},{id:'c2',phone:'600000002'}];
const order=(i,extra={})=>({id:'o'+i,client_id:'c1',service:'Mantenimiento',work_status:'finalizado',payment_status:'pagado',work_date:'2026-10-21',...extra});
const booking=(i,extra={})=>({id:'b'+i,phone:'+34 600 123 456',service_name:'Mantenimiento',status:'completada',booking_date:'2026-10-21',...extra});
const card=n=>model('c1',{clients,orders:Array.from({length:n},(_,i)=>order(i))});
for(const [n,cycle,filled,r10,r25] of [[0,1,0,0,0],[4,1,4,0,0],[5,1,5,1,0],[9,1,9,1,0],[10,1,10,1,1],[11,2,1,1,1],[15,2,5,2,1],[20,2,10,2,2],[21,3,1,2,2]]){
 const m=card(n);assert.deepEqual([m.total,m.cycle,m.filled,m.rewards10,m.rewards25],[n,cycle,filled,r10,r25]);assert.equal((render(m).match(/class="loyalty-stamp[ "]/g)||[]).length,10);assert.equal((render(m).match(/is-stamped/g)||[]).length,filled);
}
let m=model('c1',{clients,orders:[order(1),order(1),order(2,{work_status:'pendiente'}),order(3,{work_status:'cancelado'}),order(4,{payment_status:'interno'}),order(5,{service:'Interior Completo'}),order(6,{client_id:'c2'})]});assert.equal(m.total,1,'No duplicate, pending, cancelled, internal, other service/client stamps');
m=model('c1',{clients,orders:[order(1,{booking_id:'b1'})],bookings:[booking(1),booking(2),booking(3,{status:'cancelada'}),booking(4,{phone:'600000002'})]});assert.equal(m.total,2,'A linked booking and order count once; completed unlinked booking counts');
m=model('c1',{clients,orders:[order(1,{booking_id:'b1',work_status:'cancelado'}),order(2,{booking_id:'b2',payment_status:'interno'})],bookings:[booking(1),booking(2)]});assert.equal(m.total,0,'Cancelled/internal orders override their completed booking');
m=model('c1',{clients:[...clients,{id:'c3',phone:'0034600123456'}],bookings:[booking(1)]});assert.equal(m.total,0,'A shared phone must not award stamps to the wrong client');
const h={import_key:'old1',client_id:'c1',service:'MANTENIMIENTO básico',original_status:'Completado',is_internal:false,appointment_at:'2026-01-20T12:00:00'};
m=model('c1',{clients,history:[h,h,{...h,import_key:'old2',is_internal:true},{...h,import_key:'old3',original_status:'Confirmado'}]});assert.equal(m.total,1,'Eligible historical maintenance is counted once');
assert.equal(card(1501).total,1501,'No arbitrary cap on the loyalty model');
assert(!render({...card(1),stamps:[{date:'<img src=x>',service:'<script>alert(1)</script>'}]}).includes('<script>'),'Escape historical content');
console.log('PASS: 5/10 milestones, repeated cards, booking/order deduplication, corrections, internal exclusions, client identity, historical maintenance, large histories, safe rendering.');
