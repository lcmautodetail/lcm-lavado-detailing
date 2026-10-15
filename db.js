const cfg=window.LCM_CONFIG||{};
const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);
const client=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
const api={
 configured,client,
 async request(data){const {data:result,error}=await client.rpc('request_booking',{p_booking:data});if(error)throw error;return result},
 async slots(date,service){const {data,error}=await client.rpc('available_slots',{p_date:date,p_service:service});if(error)throw error;return data||[]},
 async services(){const {data,error}=await client.from('services').select('name,price,duration_minutes,description').eq('active',true).order('sort_order');if(error)throw error;return data},
 async adminAppointments(){const {data,error}=await client.from('bookings').select('*').order('booking_date',{ascending:false}).order('booking_time',{ascending:true}).limit(1000);if(error)throw error;return data},
 async updateBooking(id,fields){const {error}=await client.rpc('lcm_manage_booking',{p_id:id,p_data:fields});if(error)throw error},
 async adminCreate(fields){const {error}=await client.rpc('lcm_manage_booking',{p_id:null,p_data:fields});if(error)throw error},
 async deleteBooking(id){const {error}=await client.from('bookings').delete().eq('id',id);if(error)throw error},
 async blocked(){const {data,error}=await client.from('blocked_dates').select('*').order('day');if(error)throw error;return data},
 async addBlocked(day){const {error}=await client.from('blocked_dates').insert({day});if(error)throw error},
 async deleteBlocked(id){const {error}=await client.from('blocked_dates').delete().eq('id',id);if(error)throw error}
};
window.LCM_DB=api;
