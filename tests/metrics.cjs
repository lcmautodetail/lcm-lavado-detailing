const assert=require('node:assert/strict'),m=require('../gestion-metrics.js');
for(const value of ['Completada','FINALIZADO','finalizada','realizado']){assert.equal(m.status(value).key,'completed');assert.equal(m.active(value),false)}
assert.equal(m.status('Confirmado').label,'Confirmada');assert.equal(m.status('anulada').key,'cancelled');assert.equal(m.status('pendiente de confirmar').key,'pending');
assert.deepEqual(m.monthsEnding('2026-01'),['2025-08','2025-09','2025-10','2025-11','2025-12','2026-01']);
assert.equal(m.cash([]).average,null);
const c=m.cash([{kind:'ingreso',amount:'0.10'},{kind:'ingreso',amount:'0.20',hours_worked:2},{kind:'gasto',amount:0.15}]);assert.equal(c.income,0.3);assert.equal(c.net,0.15);assert.equal(c.receipts,2);assert.equal(c.hours,2);
const rows=[{id:'done',status:'completada',booking_date:'2026-10-21',booking_time:'09:30'},{id:'cancelled',status:'cancelada',booking_date:'2026-10-21',booking_time:'10:00'},{id:'next',status:'confirmada',booking_date:'2026-10-22',booking_time:'10:00'}];assert.equal(m.nextBooking(rows,'2026-10-21').id,'next');assert.equal(m.nextBooking(rows,'2026-10-23'),null);
const s=m.series([{kind:'ingreso',amount:50,movement_date:'2026-01-01'},{kind:'ingreso',amount:999,movement_date:'2025-07-01'}],'2026-01');assert.equal(s.length,6);assert.equal(s[0].income,0);assert.equal(s[5].income,50);
console.log('PASS: appointment states, upcoming exclusions, year boundaries, cents, empty months and collection averages.');
